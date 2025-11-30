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

export function createLayerTravelOptimizer(colorGroups) {
    const layerState = new Map();

    function reorderGroupChildren(group, order) {
        if (!group || !order?.length) {
            return;
        }
        const fragment = document.createDocumentFragment();
        order.forEach(entry => {
            if (entry?.pathElement?.parentNode === group) {
                fragment.appendChild(entry.pathElement);
            }
        });
        group.appendChild(fragment);
    }

function resequenceEntries(state, group) {
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
    reorderGroupChildren(group, finalSequence);
}

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
        const orientedPoints = orientation.points;
        entry.start = orientation.start;
        entry.end = orientation.end;
        state.entries.splice(placement.index, 0, entry);
        layerState.set(color, state);
        updatePathData(entry.pathElement, orientedPoints);

        const group = colorGroups[color];
        const referenceNode = group.children[placement.index] || null;
        group.insertBefore(entry.pathElement, referenceNode);
        resequenceEntries(state, group);
    }

    return {
        registerPath
    };
}
