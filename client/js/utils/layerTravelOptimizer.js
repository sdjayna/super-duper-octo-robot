import { updatePathData } from './drawingUtils.js';

function clonePoints(points = []) {
    return points.map(point => ({
        x: Number(point.x) || 0,
        y: Number(point.y) || 0
    }));
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
        start: entry.originalPoints[0],
        end: entry.originalPoints[entry.originalPoints.length - 1]
    };
    return {
        orientation: forward,
        placement: evaluateInsertion(entries, forward)
    };
}

export function createLayerTravelOptimizer(colorGroups) {
    const layerState = new Map();

    function registerPath({ color, points, pathElement }) {
        if (!colorGroups[color] || !pathElement || !Array.isArray(points)) {
            return;
        }
        const validPoints = clonePoints(points);
        if (validPoints.length < 2) {
            return;
        }
        const entry = {
            originalPoints: validPoints,
            pathElement
        };
        const state = layerState.get(color) || { entries: [] };
        const { orientation, placement } = selectOrientation(entry, state.entries);
        const orientedPoints = entry.originalPoints;
        entry.start = orientedPoints[0];
        entry.end = orientedPoints[orientedPoints.length - 1];
        state.entries.splice(placement.index, 0, entry);
        layerState.set(color, state);
        updatePathData(entry.pathElement, orientedPoints);

        const group = colorGroups[color];
        const referenceNode = group.children[placement.index] || null;
        group.insertBefore(entry.pathElement, referenceNode);
    }

    return {
        registerPath
    };
}
