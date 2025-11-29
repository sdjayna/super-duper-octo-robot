/* global Worker */
/* global AbortController */
import { applyPreviewEffects } from '../utils/previewEffects.js';
import { applyLayerTravelLimit } from '../utils/layerTravelLimiter.js';
import { createSVG } from '../utils/svgUtils.js';
import { isWorkerSafeDrawing } from '../../../drawings/shared/isWorkerSafe.js';
const SVG_NS = 'http://www.w3.org/2000/svg';
const WORKER_TIMEOUT_MS = 10000;
const MAX_PREVIEW_LAYERS = 400;
const TARGET_PREVIEW_LAYERS = 150;
const USE_WORKER_RENDER = true;
let generatorWorker = null;
let workerReadyPromise = null;
let resolveWorkerReady = null;
let workerRequestId = 0;
let activeAbortController = null;
let debugLogger = null;
let isDrawing = false;
let restartRequested = false;

export function createPreviewController({
    container,
    select,
    logDebug,
    marginUtils,
    state,
    setPreviewControlsDisabled = () => {}
}) {
    debugLogger = logDebug;
    const { getMaxMargin, clampMargin, resolveMargin } = marginUtils;
    let refreshInterval = null;
    let drawRequestId = 0;

    async function executeDraw(options = {}) {
        const forceRestart = options.forceRestart !== false;
        if (isDrawing && !forceRestart) {
            restartRequested = true;
            if (debugLogger) {
                debugLogger('Render already running; queued another pass', 'warn');
            }
            return;
        }
        cancelActiveDraw('restart');
        isDrawing = true;
        const abortController = new AbortController();
        activeAbortController = abortController;
        const abortSignal = abortController.signal;
        const requestId = ++drawRequestId;
        setPreviewControlsDisabled(true);
        try {
            logDebug('Loading drawing modules and presets…');
            const { drawings, drawingsReady } = await import('../drawings.js?v=' + Date.now());
            await drawingsReady;
            syncDrawingStyles(drawings, state);

            if (!select.options.length) {
                populateDrawingSelect(drawings, select);
            }

            const selectedDrawing = drawings[select.value];
            if (!selectedDrawing && debugLogger) {
                debugLogger(`Selected drawing key "${select.value}" missing. Keys loaded: ${Object.keys(drawings).slice(0, 5).join(', ')}`, 'error');
                return;
            }
            logDebug(`Generating drawing: ${selectedDrawing.name}`);
            const currentLayer = document.getElementById('layerSelect').value;
            updateOrientationButton(state.currentOrientation);

            const basePaper = state.currentPaper || selectedDrawing.paper;
            if (!basePaper) {
                throw new Error('Paper configuration is missing for the selected drawing');
            }

            const marginValue = resolveMargin(basePaper, state.currentMargin);
            state.currentMargin = marginValue;
            const previewColor = state.currentPaperColor || basePaper.color || '#ffffff';
            const paperForRender = { ...basePaper, margin: marginValue, color: previewColor };
            state.lastRenderedPaper = paperForRender;
            container.innerHTML = '';

            if (abortSignal.aborted) {
                return;
            }

            const attemptWorker = USE_WORKER_RENDER && isWorkerSafeDrawing(selectedDrawing);
            if (debugLogger) {
                debugLogger(`Render path: ${attemptWorker ? 'worker' : 'main'} for ${select.value}`);
            }
            const renderResult = attemptWorker
                ? await runRenderGeneratorWorker({
                    drawingKey: select.value,
                    controlValues: state.drawingControlValues[select.value] || {},
                    paper: paperForRender,
                    orientation: state.currentOrientation,
                    plotterArea: state.plotterSpecs?.paper,
                    maxTravelPerLayerMeters: state.maxTravelPerLayerMeters,
                    paletteOverride: state.currentPalette,
                    lineOverrides: {
                        strokeWidth: state.currentStrokeWidth,
                        lineCap: state.currentLineCap,
                        lineJoin: state.currentLineJoin
                    },
                    abortSignal
                })
                : { error: 'worker_disabled', drawingKey: select.value };

            if (abortSignal.aborted) {
                return;
            }

            let hydratedSvg;
            let travelSummary;
            let hydratedRenderContext;
            if (!renderResult || renderResult.error) {
                const workerError = renderResult?.error || 'unknown error';
                const workerStack = renderResult?.stack ? ` Stack: ${renderResult.stack.slice(0, 200)}...` : '';
                const workerKey = renderResult?.drawingKey || select.value;
                const elapsed = renderResult?.elapsedMs ? ` after ${Math.round(renderResult.elapsedMs)}ms` : '';
                logDebug(`Worker render failed for ${workerKey}: ${workerError}${elapsed}. Falling back to main thread.${workerStack}`, 'warn');
                // Mirror to console for easier DevTools inspection
                console.warn('[preview] worker render failed', { workerKey, workerError, elapsedMs: renderResult?.elapsedMs, stack: renderResult?.stack });
                const fallbackStart = performance.now();
                const fallback = await renderOnMainThread(selectedDrawing, {
                    paper: paperForRender,
                    orientation: state.currentOrientation,
                    plotterArea: state.plotterSpecs?.paper,
                    abortSignal
                });
                console.warn('[preview] main-thread fallback render complete', { workerKey, elapsedMs: Math.round(performance.now() - fallbackStart) });
                hydratedSvg = fallback.svg;
                travelSummary = fallback.travelSummary;
                hydratedRenderContext = fallback.renderContext;
            } else {
                const hydrated = hydrateRenderResult({
                    renderResult,
                    previewColor
                });
                hydratedSvg = hydrated.svg;
                travelSummary = hydrated.travelSummary;
                hydratedRenderContext = hydrated.renderContext;
            }

            if (requestId !== drawRequestId || abortSignal.aborted) {
                return;
            }
            if (maybeRaiseTravelLimitForPreview(travelSummary, state, logDebug)) {
                await draw({ delayMs: 0, forceRestart: true });
                return;
            }

            hydratedSvg.setAttribute('preserveAspectRatio', 'none');
            hydratedSvg.style.backgroundColor = previewColor;
            applyPreviewEffects(hydratedSvg, state.previewProfile);
            updatePlotterLimitOverlay(hydratedSvg, state, hydratedRenderContext);
            container.appendChild(hydratedSvg);
            const passesFromWorker = Array.isArray(renderResult?.passes) ? renderResult.passes : null;
            const layerCount = resolveLayerCount({
                passes: passesFromWorker,
                travelSummary,
                svg: hydratedSvg
            });
            const mode = renderResult?.error ? 'main' : 'worker';
            if (debugLogger) {
                const elapsed = renderResult?.elapsedMs ? ` in ${Math.round(renderResult.elapsedMs)}ms` : '';
                debugLogger(`Preview render complete via ${mode}: ${layerCount} layer(s)${elapsed}.`);
                const summaryMessage = buildPreviewSummary({
                    mode,
                    layerCount,
                    travelSummary,
                    passes: mode === 'worker' ? passesFromWorker : null,
                    svg: hydratedSvg
                });
                if (summaryMessage) {
                    debugLogger(summaryMessage);
                }
            }
            populateLayerSelect(container, logDebug, { preserveDomOrder: Boolean(travelSummary) });
            document.getElementById('layerSelect').value = currentLayer;
            updateLayerVisibility(container, state.rulersVisible);
            state.warnIfPaperExceedsPlotter?.();
        } catch (error) {
            if (abortSignal?.aborted || error?.message === 'Render aborted') {
                logDebug('Render aborted', 'warn');
            } else {
                console.error('Error:', error);
                logDebug('Error generating SVG: ' + error.message, 'error');
            }
        } finally {
            setPreviewControlsDisabled(false);
            if (activeAbortController === abortController) {
                activeAbortController = null;
            }
            isDrawing = false;
            if (restartRequested) {
                restartRequested = false;
                draw({ delayMs: 0, forceRestart });
            }
        }
    }

    let pendingDrawTimeout = null;
    let pendingDraw = null;

    function draw(options = {}) {
        const forceRestart = options.forceRestart === true;
        const delayMs = typeof options.delayMs === 'number' ? Math.max(0, options.delayMs) : 40;
        if (pendingDrawTimeout) {
            if (forceRestart) {
                cancelActiveDraw('superseded');
            }
            clearTimeout(pendingDrawTimeout);
        }
        if (!pendingDraw || pendingDraw.settled) {
            let resolver = null;
            const promise = new Promise(resolve => {
                resolver = resolve;
            });
            pendingDraw = { promise, resolve: resolver, settled: false };
        }
        pendingDrawTimeout = setTimeout(async () => {
            pendingDrawTimeout = null;
            try {
                await executeDraw({ forceRestart });
            } finally {
                if (pendingDraw && !pendingDraw.settled) {
                    pendingDraw.settled = true;
                    if (typeof pendingDraw.resolve === 'function') {
                        pendingDraw.resolve();
                    }
                }
            }
        }, delayMs);
        return pendingDraw.promise;
    }

    function startRefresh() {
        logDebug('Starting automatic refresh');
        draw({ delayMs: 0 });
        refreshInterval = setInterval(draw, 1000);
        setRefreshButtonState(true);
    }

    function stopRefresh() {
        if (refreshInterval) {
            logDebug('Pausing automatic refresh');
            clearInterval(refreshInterval);
            refreshInterval = null;
            setRefreshButtonState(false);
        }
    }

    function toggleRefresh() {
        if (refreshInterval) {
            stopRefresh();
        } else {
            startRefresh();
        }
    }

    async function toggleOrientation() {
        state.currentOrientation = state.currentOrientation === 'landscape' ? 'portrait' : 'landscape';
        updateOrientationButton(state.currentOrientation);
        logDebug(`Switched to ${state.currentOrientation} orientation`);
        const previousLayer = document.getElementById('layerSelect').value;
        await draw();
        populateLayerSelect(container, logDebug);
        restoreLayerSelection(previousLayer);
        updateLayerVisibility(container, state.rulersVisible);
    }

    function updateMarginControls(paper) {
        const slider = document.getElementById('marginSlider');
        const input = document.getElementById('marginInput');
        const label = document.getElementById('marginValueLabel');
        if (!paper || !slider || !input || !label) {
            return;
        }
        const maxMargin = getMaxMargin(paper);
        const normalized = resolveMargin(paper, state.currentMargin);
        state.currentMargin = normalized;
        slider.max = maxMargin;
        slider.value = normalized;
        label.textContent = `${normalized} mm`;
    }

function applyMarginValue(value) {
    if (!state.currentPaper) {
        return false;
    }
    const normalized = clampMargin(state.currentPaper, value);
        state.currentMargin = normalized;
        const slider = document.getElementById('marginSlider');
        const label = document.getElementById('marginValueLabel');
        if (slider) slider.value = normalized;
        if (label) label.textContent = `${normalized} mm`;
        return true;
    }

    return {
        draw,
        startRefresh,
        stopRefresh,
        toggleRefresh,
        toggleOrientation,
        updateLayerVisibility: () => updateLayerVisibility(container, state.rulersVisible),
        populateLayerSelect: () => populateLayerSelect(container, logDebug),
        updateMarginControls,
        applyMarginValue
    };
}

function cancelActiveDraw(reason = '') {
    if (activeAbortController) {
        if (debugLogger) {
            const suffix = reason ? ` (${reason})` : '';
            debugLogger(`Render cancelled${suffix}`, 'warn');
        }
        activeAbortController.abort();
        activeAbortController = null;
    }
    disposeGeneratorWorker(reason || 'cancel_active_draw');
}

function getGeneratorWorker() {
    if (generatorWorker) {
        console.debug('[preview] worker reuse existing instance');
        return generatorWorker;
    }
    const cacheBust = `?ts=${Date.now()}`;
    generatorWorker = new Worker(new URL(`../workers/renderGenerator.js${cacheBust}`, import.meta.url), { type: 'module' });
    console.debug('[preview] worker spawned renderGenerator', { cacheBust });
    generatorWorker.addEventListener('message', handleWorkerReadySignal);
    workerReadyPromise = new Promise(resolve => {
        resolveWorkerReady = (value) => {
            resolve(value);
            resolveWorkerReady = null;
        };
    });
    return generatorWorker;
}

function handleWorkerReadySignal(event) {
    if (event?.data?.type === 'workerReady' && resolveWorkerReady) {
        console.debug('[preview] worker ready signal received', event.data);
        event?.currentTarget?.removeEventListener('message', handleWorkerReadySignal);
        resolveWorkerReady(Date.now());
    }
}

function disposeGeneratorWorker(reason = 'unspecified') {
    if (generatorWorker) {
        console.debug('[preview] worker disposing instance', { reason });
        generatorWorker.terminate();
        generatorWorker = null;
        workerReadyPromise = null;
        resolveWorkerReady = null;
    } else {
        console.debug('[preview] worker dispose skipped (no active worker)', { reason });
    }
}

function waitForWorkerReady() {
    if (!generatorWorker) {
        return Promise.resolve();
    }
    if (!workerReadyPromise) {
        workerReadyPromise = Promise.resolve();
    }
    return workerReadyPromise;
}

function resetPreviewWorkerState(reason = 'test_reset') {
    workerRequestId = 0;
    disposeGeneratorWorker(reason);
}

function rebuildDrawingLayer(svg, workerPasses) {
    const drawingLayer = svg.querySelector('[data-role="drawing-content"]');
    if (!drawingLayer || !Array.isArray(workerPasses)) {
        return;
    }
    const passes = workerPasses.length > MAX_PREVIEW_LAYERS
        ? workerPasses.slice(0, MAX_PREVIEW_LAYERS)
        : workerPasses;
    drawingLayer.innerHTML = '';
    passes.forEach((entry, idx) => {
        if (!entry?.paths?.length) {
            return;
        }
        const layer = document.createElementNS(SVG_NS, 'g');
        layer.setAttribute('inkscape:groupmode', 'layer');
        const label = entry.label || entry.baseLabel || 'Layer';
        layer.setAttribute('inkscape:label', `${idx}-${label}`);
        layer.setAttribute('data-layer-order', String(entry.baseOrder ?? idx));
        layer.setAttribute('data-layer-base', entry.baseLabel || label);
        if (entry.travelMm > 0) {
            layer.setAttribute('data-travel-mm', entry.travelMm.toFixed(2));
        }
        if (entry.stroke) {
            layer.setAttribute('stroke', entry.stroke);
        }
        entry.paths.forEach(pathData => {
            const path = document.createElementNS(SVG_NS, 'path');
            path.setAttribute('d', buildPathData(pathData.points));
            path.setAttribute('fill', 'none');
            if (pathData.strokeWidth) {
                path.setAttribute('stroke-width', String(pathData.strokeWidth));
            }
            if (pathData.strokeLinecap) {
                path.setAttribute('stroke-linecap', pathData.strokeLinecap);
            }
            if (pathData.strokeLinejoin) {
                path.setAttribute('stroke-linejoin', pathData.strokeLinejoin);
            }
            if (pathData.stroke) {
                path.setAttribute('stroke', pathData.stroke);
            }
            layer.appendChild(path);
        });
        drawingLayer.appendChild(layer);
    });
}

function buildPathData(points = []) {
    if (!points.length) {
        return '';
    }
    return points.reduce((acc, point, index) => {
        const command = index === 0 ? 'M' : 'L';
        return `${acc}${command} ${point.x} ${point.y} `;
    }, '').trim();
}

function hydrateRenderResult({ renderResult, previewColor }) {
    const renderContext = {
        paperWidth: renderResult?.svgInfo?.paperWidth,
        paperHeight: renderResult?.svgInfo?.paperHeight,
        margin: renderResult?.svgInfo?.margin ?? 0,
        orientation: renderResult?.svgInfo?.orientation
    };
    const svg = createSVG(renderContext);
    svg.setAttribute('preserveAspectRatio', 'none');
    svg.style.backgroundColor = previewColor;
    rebuildDrawingLayer(svg, renderResult?.passes || []);
    return { svg, travelSummary: renderResult?.travelSummary, renderContext };
}

async function runRenderGeneratorWorker(payload) {
    if (typeof Worker === 'undefined') {
        console.warn('[preview] worker unavailable: global Worker missing');
        return { error: 'worker_unavailable' };
    }
    const { abortSignal, ...workerPayload } = payload;
    if (abortSignal?.aborted) {
        console.warn('[preview] worker render skipped; abort signal already set', { drawingKey: workerPayload?.drawingKey });
        return { error: 'render_aborted' };
    }
    const workerPreviouslyActive = Boolean(generatorWorker);
    const worker = getGeneratorWorker();
    await waitForWorkerReady();
    const requestId = ++workerRequestId;
    const startedAt = Date.now();
    const logWorkerEvent = (level, message, extra = {}) => {
        const method = console[level] || console.log;
        method.call(console, `[preview] worker ${message}`, {
            requestId,
            drawingKey: workerPayload.drawingKey,
            elapsedMs: Date.now() - startedAt,
            ...extra
        });
    };
    logWorkerEvent('debug', 'runRenderGeneratorWorker invoked', {
        payloadKeys: Object.keys(workerPayload || {}),
        abortRegistered: Boolean(abortSignal),
        workerPreviouslyActive
    });
    const message = {
        type: 'render',
        requestId,
        payload: workerPayload
    };
    console.info('[preview] worker request start', { requestId, drawingKey: workerPayload.drawingKey, timeoutMs: WORKER_TIMEOUT_MS, payloadSummary: { hasControls: Boolean(workerPayload.controlValues && Object.keys(workerPayload.controlValues).length) } });
    return new Promise(resolve => {
        let timeoutHandle = null;
        let ackReceived = false;
        let workerMessageCount = 0;
        const progressHistory = [];
        const ackWatch = setTimeout(() => {
            logWorkerEvent('warn', 'worker ack not yet received', { waitMs: Date.now() - startedAt });
        }, 1000);
        const cleanupTimers = (reason = 'unspecified') => {
            if (timeoutHandle) {
                clearTimeout(timeoutHandle);
                timeoutHandle = null;
            }
            clearTimeout(ackWatch);
            logWorkerEvent('debug', 'worker timer cleanup', {
                reason,
                ackReceived,
                workerMessages: workerMessageCount,
                progressHistorySnapshot: [...progressHistory]
            });
        };
        timeoutHandle = setTimeout(() => {
            cleanupTimers('timeout');
            disposeGeneratorWorker('timeout');
            logWorkerEvent('warn', 'timeout triggered', { timeoutMs: WORKER_TIMEOUT_MS });
            resolve({ error: 'worker_timeout', elapsedMs: Date.now() - startedAt, timeoutMs: WORKER_TIMEOUT_MS });
        }, WORKER_TIMEOUT_MS);
        const abortHandler = () => {
            cleanupTimers('abort');
            disposeGeneratorWorker('abort');
            logWorkerEvent('warn', 'abort signaled');
            resolve({ error: 'render_aborted', elapsedMs: Date.now() - startedAt });
        };
        if (abortSignal) {
            abortSignal.addEventListener('abort', abortHandler, { once: true });
        }
        const handleMessage = event => {
            const data = event.data || {};
            workerMessageCount += 1;
            logWorkerEvent('debug', 'worker message received', {
                rawType: data.type,
                incomingRequestId: data.requestId,
                matchesRequest: data.requestId === requestId
            });
            if (data.requestId !== requestId) {
                logWorkerEvent('debug', 'message for different request received', {
                    incomingRequestId: data.requestId,
                    messageType: data.type
                });
                if (data.type === 'workerReady') {
                    console.info('[preview] worker ready handshake', data);
                } else if (data.type === 'workerAck') {
                    console.info('[preview] worker ack (non-active request)', data);
                }
                return;
            }
            if (data.type === 'workerAck') {
                ackReceived = true;
                clearTimeout(ackWatch);
                logWorkerEvent('info', 'worker ack received', { ackType: data.ackType });
                return;
            }
            if (data.type === 'renderProgress') {
                progressHistory.push(data.stage);
                if (debugLogger) {
                    debugLogger(`Worker stage: ${data.stage} for ${data.drawingKey || 'unknown'}`);
                }
                logWorkerEvent('info', `progress: ${data.stage}`, { passCount: data.passCount });
                return;
            }
            if (data.type === 'renderResult') {
                cleanupTimers('result');
                if (abortSignal) {
                    abortSignal.removeEventListener('abort', abortHandler);
                }
                worker.removeEventListener('message', handleMessage);
                worker.removeEventListener('messageerror', handleMessageError);
                if (data.error) {
                    disposeGeneratorWorker('result_error');
                    logWorkerEvent('warn', 'worker result error', { error: data.error, receivedElapsedMs: data.elapsedMs });
                    resolve({ error: data.error, stack: data.stack, drawingKey: data.drawingKey, elapsedMs: data.elapsedMs });
                    return;
                }
                logWorkerEvent('info', 'result ok', { resultElapsedMs: data.elapsedMs, passCount: data?.passes?.length || data?.travelSummary?.totalLayers });
                resolve({
                    svgInfo: data.svgInfo,
                    passes: data.passes || (data.travelSummary?.passes) || [],
                    travelSummary: data.travelSummary,
                    elapsedMs: data.elapsedMs,
                    drawingKey: data.drawingKey
                });
                return;
            }
            logWorkerEvent('warn', 'unknown worker message type', { data });
        };
        worker.addEventListener('message', handleMessage);
        const handleMessageError = event => {
            logWorkerEvent('error', 'messageerror from worker', { event });
            cleanupTimers('messageerror');
            if (abortSignal) {
                abortSignal.removeEventListener('abort', abortHandler);
            }
            worker.removeEventListener('message', handleMessage);
            worker.removeEventListener('messageerror', handleMessageError);
            disposeGeneratorWorker('messageerror');
            resolve({ error: 'worker_messageerror', elapsedMs: Date.now() - startedAt });
        };
        worker.addEventListener('messageerror', handleMessageError);
        worker.addEventListener('error', (event) => {
            cleanupTimers('worker_error_event');
            if (abortSignal) {
                abortSignal.removeEventListener('abort', abortHandler);
            }
            worker.removeEventListener('message', handleMessage);
            worker.removeEventListener('messageerror', handleMessageError);
            disposeGeneratorWorker('worker_error_event');
            const messageText = event?.message || 'worker_error';
            logWorkerEvent('error', 'worker event error', { message: messageText, errorEvent: event });
            resolve({ error: messageText });
        }, { once: true });
        if (abortSignal?.aborted) {
            abortHandler();
            return;
        }
        try {
            logWorkerEvent('debug', 'posting render request to worker', {
                payloadPreview: {
                    drawingKey: workerPayload?.drawingKey,
                    hasPaper: Boolean(workerPayload?.paper),
                    hasPlotterArea: Boolean(workerPayload?.plotterArea),
                    hasOverrides: Boolean(workerPayload?.paletteOverride || workerPayload?.lineOverrides),
                    maxTravelPerLayerMeters: workerPayload?.maxTravelPerLayerMeters ?? null
                }
            });
            worker.postMessage(message);
            logWorkerEvent('debug', 'postMessage dispatched successfully');
        } catch (postError) {
            cleanupTimers('post_message_failed');
            logWorkerEvent('error', 'postMessage failed', { postError });
            if (abortSignal) {
                abortSignal.removeEventListener('abort', abortHandler);
            }
            resolve({ error: 'post_message_failed', stack: postError?.stack, drawingKey: workerPayload.drawingKey });
        }
    });
}

function updatePlotterLimitOverlay(svg, state, renderContext) {
    const plotterSpecs = state.plotterSpecs;
    let limitRect = svg.querySelector('#plotterLimitOverlay');

    if (!plotterSpecs?.paper || !renderContext) {
        if (limitRect) {
            limitRect.remove();
        }
        return;
    }

    const paperWidth = renderContext.paperWidth;
    const paperHeight = renderContext.paperHeight;
    if (!Number.isFinite(paperWidth) || !Number.isFinite(paperHeight)) {
        if (limitRect) {
            limitRect.remove();
        }
        return;
    }

    const orientedPlotter = orientDimensions(plotterSpecs.paper, state.currentOrientation);
    const limitWidth = Math.min(paperWidth, orientedPlotter.width);
    const limitHeight = Math.min(paperHeight, orientedPlotter.height);

    if (limitWidth <= 0 || limitHeight <= 0) {
        if (limitRect) {
            limitRect.remove();
        }
        return;
    }

    const x = (paperWidth - limitWidth) / 2;
    const y = (paperHeight - limitHeight) / 2;

    if (!limitRect) {
        limitRect = document.createElementNS(SVG_NS, 'rect');
        limitRect.setAttribute('id', 'plotterLimitOverlay');
        limitRect.setAttribute('class', 'preview-only plotter-limit');
        svg.appendChild(limitRect);
    }

    limitRect.setAttribute('x', x);
    limitRect.setAttribute('y', y);
    limitRect.setAttribute('width', limitWidth);
    limitRect.setAttribute('height', limitHeight);
}

function orientDimensions(dimensions, orientation) {
    const width = Number(dimensions.width);
    const height = Number(dimensions.height);
    if (!Number.isFinite(width) || !Number.isFinite(height)) {
        return { width: 0, height: 0 };
    }
    const longer = Math.max(width, height);
    const shorter = Math.min(width, height);
    return orientation === 'portrait'
        ? { width: shorter, height: longer }
        : { width: longer, height: shorter };
}

function syncDrawingStyles(drawings, state) {
    if (state.currentPalette) {
        Object.values(drawings).forEach(drawing => {
            drawing.colorPalette = state.currentPalette;
        });
    }
    if (typeof state.currentStrokeWidth === 'number') {
        Object.values(drawings).forEach(drawing => {
            drawing.line = {
                ...drawing.line,
                strokeWidth: state.currentStrokeWidth,
                lineCap: state.currentLineCap,
                lineJoin: state.currentLineJoin
            };
        });
    }
}

function populateDrawingSelect(drawings, select) {
    if (!select) {
        return;
    }
    const entries = Object.entries(drawings)
        .sort(([, a], [, b]) => a.name.localeCompare(b.name));
    const previousValue = select.value;
    select.innerHTML = entries
        .map(([key, drawing]) => `<option value="${key}">${drawing.name}</option>`)
        .join('');
    if (previousValue && entries.some(([key]) => key === previousValue)) {
        select.value = previousValue;
    } else if (previousValue && debugLogger) {
        const available = entries.slice(0, 5).map(([key]) => key).join(', ');
        debugLogger(`Previous drawing "${previousValue}" not in loaded presets. Sample presets: ${available}`, 'warn');
    }
}

function populateLayerSelect(container, logDebug, options = {}) {
    const svg = container.querySelector('svg');
    if (!svg) return;

    const layerSelect = document.getElementById('layerSelect');
    const layers = svg.querySelectorAll('g[inkscape\\:groupmode="layer"]');
    const layerInfo = [];

    layers.forEach(layer => {
        if (layer.children.length === 0) {
            return;
        }
        const metadata = computeLayerMetadata(layer);
        if (metadata) {
            layerInfo.push(metadata);
        }
    });

    let orderedLayers;
    const preserveDomOrder = Boolean(options.preserveDomOrder);
    const hasLayerOrderHints = layerInfo.length > 0 && layerInfo.every(entry =>
        entry.element?.hasAttribute('data-layer-order')
    );
    if (preserveDomOrder || hasLayerOrderHints) {
        orderedLayers = layerInfo
            .slice()
            .sort((a, b) => {
                const orderA = Number(a.element?.getAttribute('data-layer-order'));
                const orderB = Number(b.element?.getAttribute('data-layer-order'));
                if (Number.isFinite(orderA) && Number.isFinite(orderB) && orderA !== orderB) {
                    return orderA - orderB;
                }
                return Number(a.index) - Number(b.index);
            });
    } else {
        orderedLayers = orderLayersByDistance(layerInfo);
    }

    const previousValue = layerSelect.value;
    layerSelect.innerHTML = '<option value="all">Show All Layers</option>';
    orderedLayers.forEach(({ index, label }) => {
        const option = document.createElement('option');
        option.value = index;
        option.textContent = label;
        layerSelect.appendChild(option);
    });

    if (![...layerSelect.options].some(option => option.value === previousValue)) {
        layerSelect.value = 'all';
    } else {
        layerSelect.value = previousValue;
    }
}

function updateLayerVisibility(container, rulersVisible) {
    const svg = container.querySelector('svg');
    if (!svg) return;
    const selectedLayer = document.getElementById('layerSelect').value;
    const layers = svg.querySelectorAll('g[inkscape\\:groupmode="layer"]');
    layers.forEach(layer => {
        const label = layer.getAttribute('inkscape:label');
        const layerIndex = label.split('-')[0];
        layer.style.display = (selectedLayer === 'all' || layerIndex === selectedLayer) ? '' : 'none';
    });

    const previewElements = svg.querySelectorAll('.preview-only');
    previewElements.forEach(element => {
        element.style.display = rulersVisible ? '' : 'none';
    });
}

function updateOrientationButton(orientation) {
    const button = document.getElementById('toggleOrientation');
    if (button) {
        button.textContent = orientation === 'portrait' ? 'Portrait' : 'Landscape';
    }
}

function restoreLayerSelection(previousLayer) {
    const layerSelect = document.getElementById('layerSelect');
    if (!layerSelect) return;
    if (Array.from(layerSelect.options).some(option => option.value === previousLayer)) {
        layerSelect.value = previousLayer;
    } else {
        layerSelect.value = 'all';
    }
}

const MAX_REPRESENTATIVE_POINTS = 60;
const MAX_TRACKED_ORDER_POINTS = 320;

function limitSamplePoints(points, limit = MAX_REPRESENTATIVE_POINTS) {
    if (!Array.isArray(points) || points.length === 0) {
        return [];
    }
    if (!Number.isFinite(limit) || limit <= 0 || points.length <= limit) {
        return points.slice();
    }
    if (limit === 1) {
        return [points[0]];
    }
    const step = (points.length - 1) / (limit - 1);
    const sampled = [];
    for (let i = 0; i < limit; i += 1) {
        const index = Math.min(points.length - 1, Math.round(i * step));
        sampled.push(points[index]);
    }
    return sampled;
}

function appendPointsWithLimit(target, addition, limit = MAX_TRACKED_ORDER_POINTS) {
    if (!Array.isArray(target) || !Array.isArray(addition) || addition.length === 0) {
        return;
    }
    target.push(...addition);
    if (!Number.isFinite(limit) || limit <= 0 || target.length <= limit) {
        return;
    }
    const trimmed = limitSamplePoints(target, limit);
    target.length = 0;
    target.push(...trimmed);
}

function setRefreshButtonState(isRefreshing) {
    const toggleButton = document.getElementById('toggleRefresh');
    if (!toggleButton) return;
    toggleButton.textContent = isRefreshing ? 'Pause Refresh' : 'Resume Refresh';
    toggleButton.classList.toggle('paused', !isRefreshing);
}

function computeLayerMetadata(layer) {
    const label = layer.getAttribute('inkscape:label');
    if (!label) {
        return null;
    }
    const index = label.split('-')[0];
    const points = extractSamplePoints(layer);
    const rects = points.length ? [] : extractBoundingRects(layer);
    let centroid = null;
    if (points.length) {
        const aggregate = points.reduce(
            (acc, rect) => {
                acc.x += rect.x;
                acc.y += rect.y;
                return acc;
            },
            { x: 0, y: 0 }
        );
        centroid = {
            x: aggregate.x / points.length,
            y: aggregate.y / points.length
        };
    } else if (rects.length) {
        centroid = rects.reduce(
            (acc, rect) => {
                acc.x += rect.x + rect.width / 2;
                acc.y += rect.y + rect.height / 2;
                return acc;
            },
            { x: 0, y: 0 }
        );
        centroid.x /= rects.length;
        centroid.y /= rects.length;
    }
    return {
        index,
        label,
        centroid,
        points,
        rects,
        element: layer
    };
}

function extractSamplePoints(root) {
    const points = [];
    const queue = [root];
    while (queue.length) {
        const node = queue.pop();
        if (!node) continue;
        if (node.children && node.children.length) {
            queue.push(...node.children);
        }
        if (typeof node.getTotalLength === 'function' && typeof node.getPointAtLength === 'function') {
            try {
                const length = node.getTotalLength();
                if (!Number.isFinite(length) || length <= 0) {
                    continue;
                }
                const sampleCount = Math.min(12, Math.max(3, Math.ceil(length / 80)));
                for (let i = 0; i < sampleCount; i += 1) {
                    const t = sampleCount === 1 ? 0 : (length * i) / (sampleCount - 1);
                    const point = node.getPointAtLength(t);
                    if (Number.isFinite(point.x) && Number.isFinite(point.y)) {
                        points.push({ x: point.x, y: point.y });
                    }
                }
            } catch {
                // Ignore nodes that cannot provide path samples
            }
        }
    }
    return points;
}

function extractBoundingRects(root) {
    const rects = [];
    const queue = [root];
    while (queue.length) {
        const node = queue.pop();
        if (!node) continue;
        if (node.children && node.children.length) {
            queue.push(...node.children);
        }
        if (typeof node.getBBox !== 'function') {
            continue;
        }
        try {
            const bbox = node.getBBox();
            if (
                bbox &&
                Number.isFinite(bbox.x) &&
                Number.isFinite(bbox.y) &&
                Number.isFinite(bbox.width) &&
                Number.isFinite(bbox.height) &&
                bbox.width >= 0 &&
                bbox.height >= 0
            ) {
                rects.push({
                    x: bbox.x,
                    y: bbox.y,
                    width: bbox.width,
                    height: bbox.height
                });
            }
        } catch {
            // Ignore nodes that cannot provide a bounding box
        }
    }
    return rects;
}

function rectDistance(a, b) {
    const ax2 = a.x + a.width;
    const ay2 = a.y + a.height;
    const bx2 = b.x + b.width;
    const by2 = b.y + b.height;
    const dx = Math.max(0, Math.max(a.x - bx2, b.x - ax2));
    const dy = Math.max(0, Math.max(a.y - by2, b.y - ay2));
    return Math.hypot(dx, dy);
}

function pointDistance(a, b) {
    const dx = a.x - b.x;
    const dy = a.y - b.y;
    return Math.hypot(dx, dy);
}

function layerDistance(a, b) {
    const aPoints = getRepresentativePoints(a);
    const bPoints = getRepresentativePoints(b);
    if (!aPoints.length || !bPoints.length) {
        if (a?.rects?.length && b?.rects?.length) {
            let minRectDistance = Infinity;
            for (const rectA of a.rects) {
                for (const rectB of b.rects) {
                    const distance = rectDistance(rectA, rectB);
                    if (distance < minRectDistance) {
                        minRectDistance = distance;
                        if (minRectDistance === 0) {
                            return 0;
                        }
                    }
                }
            }
            return Number.isFinite(minRectDistance) ? minRectDistance : 0;
        }
        return 0;
    }
    let minDistance = Infinity;
    for (const pointA of aPoints) {
        for (const pointB of bPoints) {
            const distance = pointDistance(pointA, pointB);
            if (distance < minDistance) {
                minDistance = distance;
                if (minDistance === 0) {
                    return 0;
                }
            }
        }
    }
    return Number.isFinite(minDistance) ? minDistance : 0;
}

function orderLayersByDistance(layers) {
    const entries = layers.slice();
    entries.forEach((entry, idx) => {
        entry.__orderId = idx;
    });
    const canOptimize = entries.length > 2 && entries.every(entry => (entry.points?.length || entry.rects?.length));
    if (!canOptimize) {
        return entries.sort((a, b) => Number(a.index) - Number(b.index));
    }

    const distanceMatrix = buildDistanceMatrix(entries);
    const average = entries.reduce(
        (acc, entry) => {
            acc.x += entry.centroid.x;
            acc.y += entry.centroid.y;
            return acc;
        },
        { x: 0, y: 0 }
    );
    average.x /= entries.length;
    average.y /= entries.length;

    const start = entries.reduce((farthest, entry) => {
        if (!farthest) return entry;
        const entryDist = Math.hypot(entry.centroid.x - average.x, entry.centroid.y - average.y);
        const farDist = Math.hypot(farthest.centroid.x - average.x, farthest.centroid.y - average.y);
        return entryDist > farDist ? entry : farthest;
    }, null);

    const remaining = entries.filter(entry => entry !== start);
    const ordered = start ? [start] : [];
    const plottedPoints = [];
    if (start) {
        appendPointsWithLimit(plottedPoints, getRepresentativePoints(start), MAX_TRACKED_ORDER_POINTS);
    }

    while (remaining.length) {
        let bestScore = -Infinity;
        let bestIndex = 0;
        remaining.forEach((entry, idx) => {
            const candidatePoints = getRepresentativePoints(entry);
            if (!candidatePoints.length) {
                return;
            }
            let total = 0;
            candidatePoints.forEach(point => {
                let nearest = Infinity;
                plottedPoints.forEach(existing => {
                    const dist = pointDistance(point, existing);
                    if (dist < nearest) {
                        nearest = dist;
                    }
                });
                total += nearest;
            });
            const averageDistance = total / candidatePoints.length;
            if (averageDistance > bestScore) {
                bestScore = averageDistance;
                bestIndex = idx;
            }
        });
        const [selected] = remaining.splice(bestIndex, 1);
        ordered.push(selected);
        appendPointsWithLimit(plottedPoints, getRepresentativePoints(selected), MAX_TRACKED_ORDER_POINTS);
    }

    optimizeLayerOrder(ordered, distanceMatrix);
    ordered.optimized = true;
    return ordered;
}

function getRepresentativePoints(entry) {
    if (!entry) {
        return [];
    }
    if (Array.isArray(entry.__representativePoints)) {
        return entry.__representativePoints;
    }
    let rawPoints = [];
    if (Array.isArray(entry.points) && entry.points.length) {
        rawPoints = entry.points.map(point => ({
            x: Number(point?.x) || 0,
            y: Number(point?.y) || 0
        }));
    } else if (Array.isArray(entry.rects) && entry.rects.length) {
        const samples = [];
        entry.rects.forEach(rect => {
            if (!rect) return;
            const x = Number(rect.x) || 0;
            const y = Number(rect.y) || 0;
            const width = Number(rect.width) || 0;
            const height = Number(rect.height) || 0;
            samples.push(
                { x, y },
                { x: x + width, y },
                { x, y: y + height },
                { x: x + width, y: y + height },
                { x: x + width / 2, y: y + height / 2 }
            );
        });
        rawPoints = samples;
    }
    const representative = limitSamplePoints(rawPoints, MAX_REPRESENTATIVE_POINTS);
    entry.__representativePoints = representative;
    return representative;
}

function buildDistanceMatrix(entries) {
    const matrix = Array.from({ length: entries.length }, () => Array(entries.length).fill(0));
    for (let i = 0; i < entries.length; i += 1) {
        for (let j = i + 1; j < entries.length; j += 1) {
            const dist = layerDistance(entries[i], entries[j]);
            matrix[entries[i].__orderId][entries[j].__orderId] = dist;
            matrix[entries[j].__orderId][entries[i].__orderId] = dist;
        }
    }
    return matrix;
}

function computeAdjacencyScore(order, matrix) {
    if (order.length < 2) return Infinity;
    let minDistance = Infinity;
    for (let i = 0; i < order.length - 1; i += 1) {
        const idA = order[i].__orderId;
        const idB = order[i + 1].__orderId;
        const dist = matrix[idA]?.[idB] ?? 0;
        if (dist < minDistance) {
            minDistance = dist;
        }
    }
    return minDistance;
}

function optimizeLayerOrder(order, matrix) {
    if (order.length < 3) return;
    let improved = true;
    let iterations = 0;
    const maxIterations = order.length * order.length;
    while (improved && iterations < maxIterations) {
        improved = false;
        iterations += 1;
        let bestSwap = null;
        const baseline = computeAdjacencyScore(order, matrix);
        for (let i = 0; i < order.length - 1; i += 1) {
            for (let j = i + 1; j < order.length; j += 1) {
                [order[i], order[j]] = [order[j], order[i]];
                const score = computeAdjacencyScore(order, matrix);
                if (score > baseline && (!bestSwap || score > bestSwap.score)) {
                    bestSwap = { i, j, score };
                }
                [order[i], order[j]] = [order[j], order[i]];
            }
        }
        if (bestSwap) {
            [order[bestSwap.i], order[bestSwap.j]] = [order[bestSwap.j], order[bestSwap.i]];
            improved = true;
        }
    }
}
function maybeRaiseTravelLimitForPreview(summary, state, logDebug) {
    if (!summary || !Number.isFinite(summary.limitMeters)) {
        return false;
    }
    const totalLayers = Number(summary.totalLayers || 0);
    if (totalLayers <= MAX_PREVIEW_LAYERS) {
        return false;
    }
    const target = TARGET_PREVIEW_LAYERS;
    const currentLimit = summary.limitMeters;
    const factor = Math.max(1.05, (totalLayers / target));
    let proposed = currentLimit * factor;
    const slider = document.getElementById('maxTravelPerLayer');
    const label = document.getElementById('maxTravelPerLayerValue');
    const sliderMax = Number(slider?.max) || 100;
    const infiniteValue = Number(slider?.dataset?.infiniteValue || sliderMax + 1);
    if (!Number.isFinite(proposed)) {
        return false;
    }
    if (proposed > sliderMax) {
        proposed = null; // Infinity
    }
    if (proposed !== null && proposed <= currentLimit) {
        return false;
    }
    state.maxTravelPerLayerMeters = proposed;
    if (slider) {
        if (proposed === null) {
            slider.value = String(infiniteValue);
            if (label) {
                label.textContent = '∞';
            }
        } else {
            const rounded = Math.round(proposed);
            slider.value = String(rounded);
            if (label) {
                label.textContent = `${rounded} m`;
            }
        }
    }
    if (logDebug) {
        const nextText = proposed === null ? '∞' : `${Math.round(proposed)} m`;
        logDebug(`Auto-raised preview travel cap to ${nextText} to keep layers under ${MAX_PREVIEW_LAYERS} (would be ${totalLayers}).`, 'warn');
    }
    return true;
}

async function renderOnMainThread(selectedDrawing, options) {
    const { generateSVG } = await import('../app.js?v=' + Date.now());
    const { svg, renderContext } = await generateSVG(selectedDrawing, options);
    const travelSummary = applyLayerTravelLimit(svg, {
        maxTravelPerLayerMeters: options.maxTravelPerLayerMeters,
        orderedLayers: null
    });
    if (travelSummary?.splitLayers) {
        const suffix = travelSummary.splitLayers === 1 ? '' : 's';
        const limitDisplay = Number(travelSummary.limitMeters ?? 0).toFixed(1);
        debugLogger?.(`Preview split ${travelSummary.splitLayers} layer${suffix} to stay under ${limitDisplay} m (now ${travelSummary.totalLayers}).`);
    }
    return { svg, renderContext, travelSummary };
}

export const __previewWorkerInternals = {
    runRenderGeneratorWorker,
    waitForWorkerReady,
    resetPreviewWorkerState,
    WORKER_TIMEOUT_MS
};

export const __layerOrderingInternals = {
    MAX_REPRESENTATIVE_POINTS,
    MAX_TRACKED_ORDER_POINTS,
    limitSamplePoints,
    getRepresentativePoints,
    layerDistance,
    orderLayersByDistance
};

function buildPreviewSummary({ mode, layerCount, travelSummary, passes, svg }) {
    const travelMm = computeTravelMillimeters({ travelSummary, passes, svg });
    const layerSuffix = layerCount === 1 ? '' : 's';
    let message = `Plot summary via ${mode}: ${layerCount} layer${layerSuffix}`;
    if (travelMm != null) {
        message += `, approx ${(travelMm / 1000).toFixed(2)} m travel`;
    }
    if (travelSummary?.splitLayers) {
        const splitSuffix = travelSummary.splitLayers === 1 ? '' : 's';
        message += `, ${travelSummary.splitLayers} split layer${splitSuffix}`;
    }
    if (travelSummary?.limitMeters) {
        message += ` (cap ${travelSummary.limitMeters} m)`;
    }
    return message;
}

function computeTravelMillimeters({ travelSummary, passes, svg }) {
    const candidatePasses = Array.isArray(travelSummary?.passes) && travelSummary.passes.length
        ? travelSummary.passes
        : passes;
    const summed = sumTravelFromPasses(candidatePasses);
    if (summed != null) {
        return summed;
    }
    return sumTravelFromSvg(svg);
}

function sumTravelFromPasses(passList) {
    if (!Array.isArray(passList) || !passList.length) {
        return null;
    }
    let total = 0;
    let samples = 0;
    passList.forEach(entry => {
        const length = Number(entry?.travelMm);
        if (Number.isFinite(length)) {
            total += length;
            samples += 1;
        }
    });
    return samples ? total : null;
}

function sumTravelFromSvg(svg) {
    if (!svg?.querySelectorAll) {
        return null;
    }
    const nodes = svg.querySelectorAll('[data-travel-mm]');
    if (!nodes.length) {
        return null;
    }
    let total = 0;
    let samples = 0;
    nodes.forEach(node => {
        const value = Number(node.getAttribute('data-travel-mm'));
        if (Number.isFinite(value)) {
            total += value;
            samples += 1;
        }
    });
    return samples ? total : null;
}

function resolveLayerCount({ passes, travelSummary, svg }) {
    if (Array.isArray(passes) && passes.length) {
        return passes.length;
    }
    if (Number.isFinite(travelSummary?.totalLayers)) {
        return travelSummary.totalLayers;
    }
    if (svg?.querySelectorAll) {
        return svg.querySelectorAll('g[inkscape\\:groupmode="layer"]').length;
    }
    return 0;
}
