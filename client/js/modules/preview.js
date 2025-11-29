/* global Worker */
/* global AbortController */
import { applyPreviewEffects } from '../utils/previewEffects.js';
import { applyLayerTravelLimit } from '../utils/layerTravelLimiter.js';
const SVG_NS = 'http://www.w3.org/2000/svg';
const WORKER_TIMEOUT_MS = 12000;
let renderWorker = null;
let workerRequestId = 0;
let activeAbortController = null;

export function createPreviewController({
    container,
    select,
    logDebug,
    marginUtils,
    state,
    setPreviewControlsDisabled = () => {}
}) {
    const { getMaxMargin, clampMargin, resolveMargin } = marginUtils;
    let refreshInterval = null;
    let drawRequestId = 0;

    async function draw() {
        cancelActiveDraw('restart');
        const abortController = new AbortController();
        activeAbortController = abortController;
        const abortSignal = abortController.signal;
        const requestId = ++drawRequestId;
        setPreviewControlsDisabled(true);
        try {
            logDebug('Reloading modules...');
            const { generateSVG } = await import('../app.js?v=' + Date.now());
            const { drawings, drawingsReady } = await import('../drawings.js?v=' + Date.now());
            await drawingsReady;
            syncDrawingStyles(drawings, state);

            if (!select.options.length) {
                populateDrawingSelect(drawings, select);
            }

            const selectedDrawing = drawings[select.value];
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

            const { svg, renderContext } = await generateSVG(selectedDrawing, {
                paper: paperForRender,
                orientation: state.currentOrientation,
                plotterArea: state.plotterSpecs?.paper,
                abortSignal
            });

            if (requestId !== drawRequestId) {
                return;
            }
            if (abortSignal.aborted) {
                return;
            }
            svg.setAttribute('preserveAspectRatio', 'none');
            svg.style.backgroundColor = previewColor;
            applyPreviewEffects(svg, state.previewProfile);
            const workerResult = await runWorkerOptimization(svg, {
                maxTravelPerLayerMeters: state.maxTravelPerLayerMeters,
                abortSignal
            });
            let travelSummary = null;
            if (workerResult?.applied) {
                travelSummary = workerResult.summary;
                if (travelSummary?.splitLayers) {
                    const suffix = travelSummary.splitLayers === 1 ? '' : 's';
                    const limitDisplay = Number(travelSummary.limitMeters ?? 0).toFixed(1);
                    logDebug(`Split ${travelSummary.splitLayers} layer${suffix} to stay under ${limitDisplay} m (now ${travelSummary.totalLayers} layers).`);
                }
                if (Array.isArray(workerResult.warnings)) {
                    workerResult.warnings.forEach(message => logDebug(message, 'warn'));
                }
            } else {
                const layerOrdering = collectLayerOrdering(svg, logDebug);
                travelSummary = applyLayerTravelLimit(svg, {
                    maxTravelPerLayerMeters: state.maxTravelPerLayerMeters,
                    orderedLayers: layerOrdering
                });
                if (travelSummary?.splitLayers) {
                    const suffix = travelSummary.splitLayers === 1 ? '' : 's';
                    const limitDisplay = Number(travelSummary.limitMeters ?? 0).toFixed(1);
                    logDebug(`Split ${travelSummary.splitLayers} layer${suffix} to stay under ${limitDisplay} m (now ${travelSummary.totalLayers} layers).`);
                }
            }
            if (abortSignal.aborted) {
                return;
            }
            updatePlotterLimitOverlay(svg, state, renderContext);
            container.appendChild(svg);
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
        }
    }

    function startRefresh() {
        logDebug('Starting automatic refresh');
        draw();
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

function cancelActiveDraw() {
    if (activeAbortController) {
        activeAbortController.abort();
        activeAbortController = null;
    }
    disposeRenderWorker();
}

function createRenderWorker() {
    if (renderWorker) {
        renderWorker.terminate();
    }
    renderWorker = new Worker(new URL('../workers/renderWorker.js', import.meta.url), { type: 'module' });
    return renderWorker;
}

function disposeRenderWorker() {
    if (renderWorker) {
        renderWorker.terminate();
        renderWorker = null;
    }
}

function serializeLayersForWorker(svg) {
    const drawingLayer = svg.querySelector('[data-role="drawing-content"]');
    if (!drawingLayer) {
        return [];
    }
    const groups = Array.from(drawingLayer.children || []).filter(
        node => node?.getAttribute?.('inkscape:groupmode') === 'layer'
    );
    return groups.map((group, index) => {
        const baseOrderAttr = group.getAttribute('data-layer-order');
        const baseOrder = Number.isFinite(Number(baseOrderAttr)) ? Number(baseOrderAttr) : index;
        const paths = Array.from(group.querySelectorAll('path')).map(path => ({
            d: path.getAttribute('d') || '',
            strokeWidth: path.getAttribute('stroke-width'),
            strokeLinecap: path.getAttribute('stroke-linecap'),
            strokeLinejoin: path.getAttribute('stroke-linejoin'),
            stroke: path.getAttribute('stroke') || group.getAttribute('stroke') || null
        }));
        return {
            baseOrder,
            baseLabel: group.getAttribute('data-layer-base') || extractLayerBaseName(group),
            label: group.getAttribute('inkscape:label') || '',
            stroke: group.getAttribute('stroke') || null,
            paths
        };
    });
}

function rebuildDrawingLayer(svg, workerPasses) {
    const drawingLayer = svg.querySelector('[data-role="drawing-content"]');
    if (!drawingLayer || !Array.isArray(workerPasses)) {
        return;
    }
    drawingLayer.innerHTML = '';
    workerPasses.forEach((entry, idx) => {
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

function runWorkerOptimization(svg, options = {}) {
    if (typeof Worker === 'undefined') {
        return null;
    }
    const abortSignal = options.abortSignal;
    if (abortSignal?.aborted) {
        return null;
    }
    const serializedLayers = serializeLayersForWorker(svg);
    if (!serializedLayers.length) {
        return null;
    }
    const worker = createRenderWorker();
    const requestId = ++workerRequestId;
    const payload = {
        type: 'optimize',
        requestId,
        payload: {
            layers: serializedLayers,
            maxTravelPerLayerMeters: options.maxTravelPerLayerMeters
        }
    };
    return new Promise(resolve => {
        const timeout = setTimeout(() => {
            disposeRenderWorker();
            resolve(null);
        }, WORKER_TIMEOUT_MS);
        const abortHandler = () => {
            clearTimeout(timeout);
            disposeRenderWorker();
            resolve(null);
        };
        if (abortSignal) {
            abortSignal.addEventListener('abort', abortHandler, { once: true });
        }
        worker.addEventListener('message', event => {
            const data = event.data || {};
            if (data.requestId !== requestId || data.type !== 'optimizeResult') {
                return;
            }
            clearTimeout(timeout);
            if (abortSignal) {
                abortSignal.removeEventListener('abort', abortHandler);
            }
            if (data.error || !Array.isArray(data.passes)) {
                disposeRenderWorker();
                resolve(null);
                return;
            }
            rebuildDrawingLayer(svg, data.passes);
            disposeRenderWorker();
            resolve({
                applied: true,
                summary: data.summary,
                warnings: data.summary?.warnings || []
            });
        }, { once: true });
        worker.addEventListener('error', () => {
            clearTimeout(timeout);
            if (abortSignal) {
                abortSignal.removeEventListener('abort', abortHandler);
            }
            disposeRenderWorker();
            resolve(null);
        }, { once: true });
        if (abortSignal?.aborted) {
            abortHandler();
            return;
        }
        worker.postMessage(payload);
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

function collectLayerOrdering(svg, logDebug) {
    if (!svg) {
        return [];
    }
    const layers = Array.from(svg.querySelectorAll('g[inkscape\\:groupmode="layer"]'));
    const layerInfo = [];
    layers.forEach(layer => {
        if (layer.children.length === 0) {
            return;
        }
        const metadata = computeLayerMetadata(layer);
        if (metadata) {
            metadata.element = layer;
            layerInfo.push(metadata);
        }
    });
    if (!layerInfo.length) {
        return [];
    }
    const orderedLayers = orderLayersByDistance(layerInfo);
    if (logDebug && orderedLayers.optimized && orderedLayers.length > 1) {
        const orderSummary = orderedLayers.map(layer => layer.label).join(' → ');
        logDebug(`Optimized layer sequence: ${orderSummary}`);
    }
    orderedLayers.forEach((entry, idx) => {
        if (entry.element) {
            entry.element.setAttribute('data-layer-order', String(idx));
            entry.element.setAttribute('data-layer-base', extractLayerBaseName(entry.element));
        }
    });
    return orderedLayers;
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

function extractLayerBaseName(layer) {
    const label = layer?.getAttribute?.('inkscape:label') || '';
    const dashIndex = label.indexOf('-');
    const suffix = dashIndex >= 0 ? label.slice(dashIndex + 1).trim() : label.trim();
    return suffix || 'Layer';
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
    const aPoints = a?.points || [];
    const bPoints = b?.points || [];
    let minDistance = Infinity;
    if (aPoints.length && bPoints.length) {
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
    } else if (a?.rects?.length && b?.rects?.length) {
        for (const rectA of a.rects) {
            for (const rectB of b.rects) {
                const distance = rectDistance(rectA, rectB);
                if (distance < minDistance) {
                    minDistance = distance;
                    if (minDistance === 0) {
                        return 0;
                    }
                }
            }
        }
    } else {
        return 0;
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
    const plottedPoints = start ? getRepresentativePoints(start) : [];

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
        plottedPoints.push(...getRepresentativePoints(selected));
    }

    optimizeLayerOrder(ordered, distanceMatrix);
    ordered.optimized = true;
    return ordered;
}

function getRepresentativePoints(entry) {
    if (entry.points?.length) {
        return entry.points;
    }
    if (!entry.rects?.length) {
        return [];
    }
    const samples = [];
    entry.rects.forEach(rect => {
        samples.push(
            { x: rect.x, y: rect.y },
            { x: rect.x + rect.width, y: rect.y },
            { x: rect.x, y: rect.y + rect.height },
            { x: rect.x + rect.width, y: rect.y + rect.height },
            { x: rect.x + rect.width / 2, y: rect.y + rect.height / 2 }
        );
    });
    return samples;
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
