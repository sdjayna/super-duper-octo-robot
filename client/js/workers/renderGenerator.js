import { setClientAdapters, resetClientAdapters } from '../../../drawings/shared/clientAdapters.js';
import * as dataAdapters from '../../../drawings/shared/dataAdapters.js';
import { splitPassesByTravel } from '../utils/passTravelLimiter.js';

const workerBootStartedAt = Date.now();
function workerDebug(level, message, extra = {}) {
    const logger = console[level] || console.log;
    logger.call(console, `[renderGenerator] ${message}`, { ...extra, uptimeMs: Date.now() - workerBootStartedAt });
}

function previewData(value) {
    try {
        if (value === null || value === undefined) {
            return value;
        }
        if (typeof value === 'string') {
            return value.slice(0, 200);
        }
        const serialized = JSON.stringify(value, (key, val) => {
            if (typeof val === 'function') {
                return '[Function]';
            }
            if (val instanceof ArrayBuffer) {
                return `[ArrayBuffer byteLength=${val.byteLength}]`;
            }
            if (typeof val === 'bigint') {
                return val.toString();
            }
            return val;
        });
        return serialized.slice(0, 400);
    } catch (error) {
        return `[unserializable: ${error?.message || error}]`;
    }
}

let drawingsModulePromise = null;
let appModulePromise = null;
const pendingRenderQueue = [];
let bootstrapComplete = false;

self.addEventListener('message', event => {
    const { type, requestId, payload } = event.data || {};
    try {
        workerDebug('info', 'incoming message', {
            type,
            requestId,
            payloadKeys: Object.keys(payload || {}),
            dataPreview: previewData(event.data)
        });
        self.postMessage({
            type: 'workerAck',
            ackType: type,
            requestId,
            ts: Date.now()
        });
        workerDebug('info', 'worker ack sent', { requestId, ackType: type });
        if (type === 'ping') {
            workerDebug('debug', 'ping received; sending pong', { requestId });
            self.postMessage({ type: 'pong', requestId, ts: Date.now() });
            return;
        }
        if (type === 'render') {
            if (!bootstrapComplete) {
                pendingRenderQueue.push({ requestId, payload });
                workerDebug('warn', 'render received before bootstrap complete; queued', {
                    queueSize: pendingRenderQueue.length,
                    drawingKey: payload?.drawingKey
                });
                return;
            }
            workerDebug('info', 'dispatching render immediately', { requestId, drawingKey: payload?.drawingKey });
            dispatchRender(requestId, payload);
        }
    } catch (messageError) {
        workerDebug('error', 'message handler crashed', { message: messageError?.message, stack: messageError?.stack });
        try {
            self.postMessage({
                type: 'renderResult',
                requestId,
                drawingKey: payload?.drawingKey || null,
                error: messageError?.message || 'message_handler_error',
                stack: messageError?.stack || ''
            });
        } catch (postError) {
            workerDebug('error', 'failed to post message handler error', { postError });
        }
    }
});

self.addEventListener('unhandledrejection', event => {
    const reason = event?.reason;
    console.error('[renderGenerator] unhandled rejection', reason);
    workerDebug('error', 'unhandled rejection caught', { message: reason?.message, stack: reason?.stack });
    try {
        self.postMessage({
            type: 'renderResult',
            requestId: null,
            drawingKey: null,
            error: reason?.message || String(reason) || 'unhandledrejection',
            stack: reason?.stack || ''
        });
    } catch {
        // ignore
    }
});

self.addEventListener('error', event => {
    console.error('[renderGenerator] global error', event?.message, event?.error);
    workerDebug('error', 'global error event', { message: event?.message });
});

self.addEventListener('messageerror', event => {
    workerDebug('error', 'messageerror event received', {
        hasData: 'data' in (event || {}),
        dataType: typeof event?.data,
        dataKeys: event?.data && typeof event.data === 'object' ? Object.keys(event.data) : null,
        dataPreview: previewData(event?.data)
    });
    try {
        const fallbackDrawingKey = event?.data?.payload?.drawingKey || null;
        self.postMessage({
            type: 'renderResult',
            requestId: event?.data?.requestId || null,
            drawingKey: fallbackDrawingKey,
            error: 'worker_message_error',
            stack: ''
        });
    } catch (postError) {
        workerDebug('error', 'failed to post messageerror fallback', { postError });
    }
});

workerDebug('info', 'bootstrap start', { adapterCount: Object.keys(dataAdapters || {}).length });
setClientAdapters(dataAdapters);
workerDebug('info', 'client adapters ready');

const originalFetch = typeof fetch === 'function' ? fetch.bind(self) : null;
if (originalFetch) {
    self.fetch = (...args) => {
        console.info('[renderGenerator] fetch start', args[0]);
        return originalFetch(...args).then(response => {
            console.info('[renderGenerator] fetch done', args[0], response.status);
            return response;
        }).catch(error => {
            console.error('[renderGenerator] fetch error', args[0], error);
            throw error;
        });
    };
}

self.postMessage({ type: 'workerReady', ts: Date.now() });
bootstrapComplete = true;
workerDebug('debug', 'worker ready posted', { pendingQueue: pendingRenderQueue.length });
flushPendingRenderQueue();

function flushPendingRenderQueue() {
    if (!bootstrapComplete || !pendingRenderQueue.length) {
        return;
    }
    workerDebug('debug', 'flushing queued renders', { queueSize: pendingRenderQueue.length });
    while (pendingRenderQueue.length) {
        const queued = pendingRenderQueue.shift();
        dispatchRender(queued.requestId, queued.payload);
    }
}

function dispatchRender(requestId, payload) {
    // Emit a console trace for visibility in DevTools
    console.info('[renderGenerator] incoming render request', { requestId, drawingKey: payload?.drawingKey, payloadKeys: Object.keys(payload || {}) });
    workerDebug('info', 'render dispatch', {
        requestId,
        drawingKey: payload?.drawingKey,
        queueSizeSnapshot: pendingRenderQueue.length
    });
    handleRender(requestId, payload).catch(error => {
        const message = error?.message || String(error) || 'renderGenerator_error';
        const stack = error?.stack || '';
        console.error('[renderGenerator] unhandled error', { message, stack, drawingKey: payload?.drawingKey });
        workerDebug('error', 'render dispatch unhandled error', { requestId, drawingKey: payload?.drawingKey, message });
        self.postMessage({
            type: 'renderResult',
            requestId,
            drawingKey: payload?.drawingKey || null,
            error: message,
            stack,
            elapsedMs: 0
        });
    });
}

async function handleRender(requestId, payload = {}) {
    const drawingKey = payload?.drawingKey || null;
    const start = (typeof performance !== 'undefined' && performance.now) ? performance.now() : Date.now();
    workerDebug('debug', 'handleRender start', { requestId, drawingKey });
    const renderHeartbeat = setInterval(() => {
        const now = (typeof performance !== 'undefined' && performance.now) ? performance.now() : Date.now();
        workerDebug('debug', 'handleRender heartbeat', {
            requestId,
            drawingKey,
            elapsedMs: Math.round(now - start)
        });
    }, 500);
    try {
        postProgress({ requestId, drawingKey, stage: 'dispatch_received' });
        postProgress({ requestId, drawingKey, stage: 'start' });
        setTimeout(() => postProgress({ requestId, drawingKey, stage: 'alive_500ms' }), 500);
        const result = await renderDrawing(payload, requestId);
        const elapsedMs = ((typeof performance !== 'undefined' && performance.now) ? performance.now() : Date.now()) - start;
        self.postMessage({ type: 'renderResult', requestId, drawingKey, elapsedMs, ...result });
        workerDebug('info', 'handleRender success', { requestId, drawingKey, elapsedMs });
    } catch (error) {
        const message = error?.message || String(error) || 'renderGenerator_error';
        const stack = error?.stack || '';
        console.error('[renderGenerator] failed', { message, stack, drawingKey });
        const elapsedMs = ((typeof performance !== 'undefined' && performance.now) ? performance.now() : Date.now()) - start;
        workerDebug('warn', 'handleRender failed', { requestId, drawingKey, message, elapsedMs });
        self.postMessage({
            type: 'renderResult',
            requestId,
            error: message,
            stack,
            drawingKey,
            elapsedMs
        });
    } finally {
        clearInterval(renderHeartbeat);
    }
}

async function renderDrawing(payload, requestId) {
    const { drawingKey, controlValues = {}, paper, orientation, plotterArea, maxTravelPerLayerMeters, paletteOverride, lineOverrides } = payload;
    if (typeof fetch !== 'function') {
        throw new Error('Worker fetch unavailable; cannot load drawings manifest.');
    }

    workerDebug('debug', 'renderDrawing start', {
        drawingKey,
        controlCount: Object.keys(controlValues || {}).length,
        hasPaper: Boolean(paper),
        hasPlotterArea: Boolean(plotterArea),
        maxTravelPerLayerMeters
    });
    console.info('[renderGenerator] resolve drawing entry', { drawingKey, hasControlValues: Boolean(controlValues && Object.keys(controlValues).length) });
    if (!drawingsModulePromise) {
        postProgress({ requestId, drawingKey, stage: 'manifest_fetch_start' });
        drawingsModulePromise = import('../drawings.js')
            .then(async mod => {
                if (mod.drawingsReady) {
                    await mod.drawingsReady;
                }
                workerDebug('debug', 'drawings module hydrated');
                return mod;
            })
            .catch(err => {
                drawingsModulePromise = null;
                workerDebug('warn', 'drawings module load failed', { message: err?.message });
                throw err;
            });
    }
    let drawingsModule;
    try {
        drawingsModule = await drawingsModulePromise;
    } catch (err) {
        workerDebug('error', 'drawings module await failed', { message: err?.message });
        throw new Error(`Failed to load drawings module: ${err?.message || err}`);
    }
    console.info('[renderGenerator] drawings loaded', { drawingKey, hasDrawings: Boolean(drawingsModule?.drawings), hasTypes: Boolean(drawingsModule?.drawingTypes) });
    postProgress({ requestId, drawingKey, stage: 'drawings_loaded' });
    const { drawings, drawingTypes } = drawingsModule;
    const drawingConfig = drawings[drawingKey];
    if (!drawingConfig) {
        const keys = Object.keys(drawings || {});
        console.error('[renderGenerator] drawing key missing', drawingKey, 'available keys', keys.slice(0, 20));
        throw new Error(`Unknown drawing key: ${drawingKey}`);
    }
    console.info('[renderGenerator] drawing config resolved', { drawingKey, type: drawingConfig.type });
    workerDebug('debug', 'drawing config resolved', { drawingKey, type: drawingConfig.type });

    if (paletteOverride) {
        drawingConfig.colorPalette = paletteOverride;
        workerDebug('debug', 'palette override applied', { drawingKey });
    }
    if (lineOverrides) {
        drawingConfig.line = { ...drawingConfig.line, ...lineOverrides };
        workerDebug('debug', 'line overrides applied', { drawingKey, overrideKeys: Object.keys(lineOverrides) });
    }
    applyControlValues(drawingConfig, drawingTypes, controlValues);
    console.debug('[renderGenerator] controls applied', { drawingKey, controlKeys: Object.keys(controlValues || {}) });

    if (!appModulePromise) {
        appModulePromise = import('../app.js');
    }
    const { generateSVG } = await appModulePromise;
    workerDebug('debug', 'app module ready', { drawingKey });
    const renderOptions = {
        paper,
        orientation,
        plotterArea
    };
    console.debug('[renderGenerator] rendering', drawingKey, 'with options', renderOptions);
    postProgress({ requestId, drawingKey, stage: 'generate_start' });
    const { svg, renderContext } = await generateSVG(drawingConfig, renderOptions);
    postProgress({ requestId, drawingKey, stage: 'generate_done' });
    console.info('[renderGenerator] generateSVG complete', { drawingKey, layerCount: Array.isArray(svg?.layers) ? svg.layers.length : 'n/a' });

    const initialPasses = buildPassesFromData(svg);
    console.debug('[renderGenerator] passes built', { drawingKey, passCount: initialPasses.length });
    const travelSummary = splitPassesByTravel(initialPasses, maxTravelPerLayerMeters);
    const passes = travelSummary.passes || initialPasses;
    console.debug('[renderGenerator] travel summary', { drawingKey, travelSummary });
    postProgress({ requestId, drawingKey, stage: 'travel_done', passCount: passes.length });

    return {
        svgInfo: {
            paperWidth: renderContext.paperWidth,
            paperHeight: renderContext.paperHeight,
            margin: renderContext.margin,
            orientation: renderContext.orientation
        },
        passes,
        travelSummary
    };
}

function postProgress({ requestId, drawingKey, stage, passCount }) {
    try {
        workerDebug('info', 'postProgress', { requestId, drawingKey, stage, passCount });
        self.postMessage({
            type: 'renderProgress',
            requestId,
            drawingKey,
            stage,
            passCount
        });
    } catch {
        // ignore
    }
}

function applyControlValues(drawingConfig, drawingTypes, controlValues) {
    if (!controlValues || !drawingConfig) {
        return;
    }
    const controls = drawingTypes[drawingConfig.type]?.controls || drawingConfig.controls || [];
    const applied = [];
    controls.forEach(control => {
        if (Object.prototype.hasOwnProperty.call(controlValues, control.id)) {
            setNestedValue(drawingConfig, control.target, controlValues[control.id]);
            applied.push(control.id);
        }
    });
    if (applied.length) {
        workerDebug('debug', 'controls applied', { configType: drawingConfig.type, appliedCount: applied.length, controlIds: applied });
    } else {
        workerDebug('debug', 'no controls applied', { configType: drawingConfig.type });
    }
}

function setNestedValue(obj, path, value) {
    if (!obj || !path) return;
    const segments = path.split('.');
    let current = obj;
    for (let i = 0; i < segments.length - 1; i += 1) {
        const key = segments[i];
        if (current[key] === undefined || current[key] === null) {
            current[key] = {};
        }
        current = current[key];
    }
    current[segments[segments.length - 1]] = value;
}

function buildPassesFromData(svg) {
    if (!svg?.layers) {
        workerDebug('warn', 'buildPassesFromData missing layers');
        return [];
    }
    const passes = svg.layers.map((layer, index) => ({
        baseOrder: index,
        baseLabel: layer.name || layer.color || 'Layer',
        label: `${index}-${layer.name || 'Layer'}`,
        stroke: layer.color,
        paths: layer.paths || []
    }));
    workerDebug('debug', 'buildPassesFromData complete', { layerCount: passes.length });
    return passes;
}

self.addEventListener('error', () => {
    resetClientAdapters();
    workerDebug('warn', 'resetting client adapters after error');
});
/* eslint-env worker */
/* global self */
