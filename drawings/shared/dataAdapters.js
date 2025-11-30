import { ColorManager, colorPalettes, maxMediumColorCount } from '../../client/js/utils/colorUtils.js';

function clonePoints(points = []) {
    return points.map(point => ({
        x: Number(point?.x) || 0,
        y: Number(point?.y) || 0
    }));
}

function clonePoint(point) {
    if (!point) {
        return { x: 0, y: 0 };
    }
    return { x: Number(point.x) || 0, y: Number(point.y) || 0 };
}

function distanceBetween(a, b) {
    if (!a || !b) {
        return 0;
    }
    return Math.hypot(a.x - b.x, a.y - b.y);
}

function evaluateInsertion(entries, orientation) {
    if (!entries.length) {
        return { index: 0, cost: 0 };
    }
    let best = { index: entries.length, cost: Number.POSITIVE_INFINITY };
    for (let insertIndex = 0; insertIndex <= entries.length; insertIndex++) {
        const previous = entries[insertIndex - 1];
        const next = entries[insertIndex];
        const prevEnd = previous?.end || null;
        const nextStart = next?.start || null;
        const added =
            (prevEnd ? distanceBetween(prevEnd, orientation.start) : 0) +
            (nextStart ? distanceBetween(orientation.end, nextStart) : 0);
        const removed = prevEnd && nextStart ? distanceBetween(prevEnd, nextStart) : 0;
        const cost = added - removed;
        if (cost < best.cost) {
            best = { index: insertIndex, cost };
        }
    }
    return best;
}

function selectOrientation(entry, entries) {
    const forward = {
        reversed: false,
        points: entry.originalPoints,
        start: entry.originalPoints[0],
        end: entry.originalPoints[entry.originalPoints.length - 1]
    };
    const reversedPoints = entry.originalPoints.slice().reverse();
    const backward = {
        reversed: true,
        points: reversedPoints,
        start: reversedPoints[0],
        end: reversedPoints[reversedPoints.length - 1]
    };
    const forwardPlacement = evaluateInsertion(entries, forward);
    const backwardPlacement = evaluateInsertion(entries, backward);
    if (backwardPlacement.cost < forwardPlacement.cost) {
        return {
            orientation: backward,
            placement: backwardPlacement
        };
    }
    return {
        orientation: forward,
        placement: forwardPlacement
    };
}

function reorderLayerPaths(layer, order) {
    if (!layer || !order?.length) {
        return;
    }
    const paths = order.map(entry => entry.path);
    layer.paths.length = 0;
    paths.forEach(path => layer.paths.push(path));
}

function resequenceEntries(state, layer) {
    const entries = state?.entries;
    if (!Array.isArray(entries) || entries.length < 3) {
        return;
    }
    const remaining = entries.slice();
    const ordered = [];
    const first = remaining.shift();
    if (first) {
        ordered.push(first);
    }
    let current = first;
    while (remaining.length && current) {
        let bestIndex = 0;
        let bestDistance = Number.POSITIVE_INFINITY;
        for (let i = 0; i < remaining.length; i += 1) {
            const candidate = remaining[i];
            const distance = distanceBetween(current.end, candidate.start);
            if (distance < bestDistance) {
                bestDistance = distance;
                bestIndex = i;
            }
        }
        current = remaining.splice(bestIndex, 1)[0];
        if (current) {
            ordered.push(current);
        }
    }
    if (!ordered.length) {
        return;
    }
    const finalSequence = ordered.concat(remaining);
    state.entries = finalSequence;
    reorderLayerPaths(layer, finalSequence);
}

function deriveGeometryFromPoints(points) {
    const xs = points.map(point => point.x);
    const ys = points.map(point => point.y);
    const minX = Math.min(...xs);
    const maxX = Math.max(...xs);
    const minY = Math.min(...ys);
    const maxY = Math.max(...ys);
    return {
        x: minX,
        y: minY,
        width: Math.max(maxX - minX, 1),
        height: Math.max(maxY - minY, 1)
    };
}

export function createSVG(renderContext) {
    return {
        isData: true,
        paperWidth: renderContext.paperWidth,
        paperHeight: renderContext.paperHeight,
        margin: renderContext.margin ?? 0,
        orientation: renderContext.orientation,
        layers: []
    };
}

export function createDrawingBuilder({ svg, drawingConfig, renderContext, abortSignal }) {
    const palette = drawingConfig.colorPalette || colorPalettes.defaultPalette || {};
    const colorManager = new ColorManager(palette);
    const layersByColor = new Map();
    const layerState = new Map();
    const colorLookup = new Map();
    Object.values(palette || {}).forEach(entry => {
        if (entry?.hex) {
            colorLookup.set(String(entry.hex).toLowerCase(), entry);
        }
    });

    function ensureLayer(colorHex) {
        if (!layersByColor.has(colorHex)) {
            const colorEntry = colorLookup.get(String(colorHex).toLowerCase()) || {};
            const index = layersByColor.size;
            layersByColor.set(colorHex, {
                color: colorHex,
                name: colorEntry.name || colorHex,
                order: index,
                paths: []
            });
            svg.layers = Array.from(layersByColor.values());
        }
        return layersByColor.get(colorHex);
    }

    function ensureLayerState(colorHex) {
        const layer = ensureLayer(colorHex);
        if (!layerState.has(colorHex)) {
            layerState.set(colorHex, { entries: [] });
        }
        return { layer, state: layerState.get(colorHex) };
    }

    function selectColor(options, fallbackGeometry) {
        if (options.strokeColor && palette[options.strokeColor]) {
            return options.strokeColor;
        }
        return colorManager.getValidColor(fallbackGeometry);
    }

    return {
        appendPath(points, options = {}) {
            if (abortSignal?.aborted) {
                throw new Error('Render aborted');
            }
            if (!Array.isArray(points) || points.length === 0) {
                return null;
            }
            const geometry = deriveGeometryFromPoints(points);
            const colorHex = selectColor(options, geometry);
            const { layer, state } = ensureLayerState(colorHex);
            const path = {
                strokeWidth: options.strokeWidth ?? drawingConfig.line?.strokeWidth,
                strokeLinecap: options.strokeLinecap ?? drawingConfig.line?.lineCap ?? 'round',
                strokeLinejoin: options.strokeLinejoin ?? drawingConfig.line?.lineJoin ?? 'round',
                stroke: options.strokeColor || colorHex
            };
            const entry = {
                originalPoints: clonePoints(points),
                path
            };
            const { orientation, placement } = selectOrientation(entry, state.entries);
            const orientedPoints = clonePoints(orientation.points);
            entry.start = clonePoint(orientation.start);
            entry.end = clonePoint(orientation.end);
            entry.path = path;
            path.points = orientedPoints;
            state.entries.splice(placement.index, 0, entry);
            layer.paths.splice(placement.index, 0, path);
            resequenceEntries(state, layer);
            colorManager.updateTracking(colorHex, geometry);
            return path;
        },
        projectPoints(points) {
            if (renderContext?.projectPoints) {
                return renderContext.projectPoints(points);
            }
            return points.map(point => ({ x: Number(point.x) || 0, y: Number(point.y) || 0 }));
        },
        projectRect(rect) {
            if (renderContext?.projectRect) {
                return renderContext.projectRect(rect);
            }
            return {
                x: Number(rect?.x ?? 0),
                y: Number(rect?.y ?? 0),
                width: Number(rect?.width ?? 0),
                height: Number(rect?.height ?? 0)
            };
        },
        context: {
            layersByColor
        }
    };
}

export { colorPalettes, maxMediumColorCount };
