import { getDrawingLayer } from './svgUtils.js';

const MM_PER_METER = 1000;
const EPSILON = 1e-6;

function travelDebug(message, payload = {}) {
    if (typeof console?.debug === 'function') {
        console.debug('[layerTravelLimiter]', message, payload);
    }
}

export function applyLayerTravelLimit(svg, options = {}) {
    if (!svg) {
        return null;
    }
    const limitMeters = Number(options.maxTravelPerLayerMeters);
    if (!Number.isFinite(limitMeters) || limitMeters <= 0) {
        travelDebug('skip (no limit)', { limitMeters });
        return null;
    }
    const limitMillimeters = limitMeters * MM_PER_METER;
    let drawingLayer;
    try {
        drawingLayer = getDrawingLayer(svg);
    } catch {
        travelDebug('skip (missing drawing layer)');
        return null;
    }
    const originalLayers = Array.from(drawingLayer.children).filter(
        node => node?.getAttribute?.('inkscape:groupmode') === 'layer'
    );
    travelDebug('starting pass', { limitMeters, layerCount: originalLayers.length });
    if (!originalLayers.length) {
        return {
            limitMeters,
            limitMillimeters,
            splitLayers: 0,
            totalLayers: 0
        };
    }

    const orderedEntries = Array.isArray(options.orderedLayers)
        ? options.orderedLayers
            .map(entry => entry?.element || entry)
            .filter(layer => layer && originalLayers.includes(layer))
        : originalLayers.slice();
    const processLayers = orderedEntries.length ? orderedEntries : originalLayers;

    const rebuiltLayers = [];
    let splitLayers = 0;
    let fallbackOrder = processLayers.length;

    processLayers.forEach(layer => {
        const baseOrderValue = Number(layer.getAttribute('data-layer-order'));
        const baseOrder = Number.isFinite(baseOrderValue) ? baseOrderValue : fallbackOrder++;
        const baseName = layer.getAttribute('data-layer-base') || getLayerBaseName(layer);
        const buckets = buildLayerBuckets(layer, limitMillimeters);
        travelDebug('layer processed', {
            label: baseName,
            baseOrder,
            bucketCount: buckets.length,
            bucketTravel: buckets.map(bucket => bucket.totalLength)
        });
        if (!buckets.length) {
            layer.remove();
            return;
        }
        if (buckets.length > 1) {
            splitLayers += 1;
        }
        buckets.forEach((bucket, bucketIndex) => {
            if (!bucket.elements.length) {
                return;
            }
            const newLayer = layer.cloneNode(false);
            const label = buckets.length > 1
                ? `${baseName} (pass ${bucketIndex + 1}/${buckets.length})`
                : baseName;
            if (bucket.totalLength > 0) {
                newLayer.setAttribute('data-travel-mm', bucket.totalLength.toFixed(2));
            } else {
                newLayer.removeAttribute('data-travel-mm');
            }
            bucket.elements.forEach(entry => newLayer.appendChild(entry.node));
            rebuiltLayers.push({
                node: newLayer,
                baseOrder,
                passIndex: bucketIndex,
                label,
                baseLabel: baseName
            });
        });
        layer.remove();
    });

    if (!rebuiltLayers.length) {
        return {
            limitMeters,
            limitMillimeters,
            splitLayers: 0,
            totalLayers: 0
        };
    }

    rebuiltLayers.sort((a, b) => {
        if (a.baseOrder !== b.baseOrder) {
            return a.baseOrder - b.baseOrder;
        }
        return a.passIndex - b.passIndex;
    });

    rebuiltLayers.forEach((entry, idx) => {
        entry.node.setAttribute('data-layer-order', String(entry.baseOrder));
        entry.node.setAttribute('data-layer-base', entry.baseLabel);
        entry.node.setAttribute('inkscape:label', `${idx}-${entry.label}`);
        drawingLayer.appendChild(entry.node);
    });

    travelDebug('completed pass', { rebuiltLayers: rebuiltLayers.length, splitLayers });
    return {
        limitMeters,
        limitMillimeters,
        splitLayers,
        totalLayers: rebuiltLayers.length
    };
}

function buildLayerBuckets(layer, limitMm) {
    const elements = [];
    const childNodes = Array.from(layer.childNodes).filter(node => node.nodeType === 1);
    childNodes.forEach(node => {
        if (node.tagName?.toLowerCase() === 'path') {
            const pieces = splitPathElement(node, limitMm);
            if (pieces.length) {
                elements.push(...pieces);
            }
            node.remove();
        } else {
            elements.push({ node, length: 0 });
        }
    });
    if (!elements.length) {
        return [];
    }
    const buckets = [];
    let current = [];
    let travel = 0;
    elements.forEach(entry => {
        const length = entry.length ?? 0;
        if (current.length && travel + length > limitMm + EPSILON) {
            buckets.push({ elements: current, totalLength: travel });
            current = [];
            travel = 0;
        }
        current.push(entry);
        travel += length;
    });
    if (current.length) {
        buckets.push({ elements: current, totalLength: travel });
    }
    return buckets;
}

function splitPathElement(path, limitMm) {
    const points = parsePathPoints(path);
    if (points.length < 2) {
        return [];
    }
    const limit = Math.max(limitMm, EPSILON);
    const segments = [];
    let currentPoints = [points[0]];
    let currentTravel = 0;
    let previousPoint = points[0];

    for (let i = 1; i < points.length; i += 1) {
        let nextPoint = points[i];
        let segmentLength = distanceBetween(previousPoint, nextPoint);
        if (segmentLength <= EPSILON) {
            currentPoints.push(nextPoint);
            previousPoint = nextPoint;
            continue;
        }
        let remainingSegment = segmentLength;

        while (currentTravel + remainingSegment > limit + EPSILON) {
            let travelRemaining = limit - currentTravel;
            if (travelRemaining <= EPSILON) {
                segments.push(createSegment(path, currentPoints));
                currentPoints = [currentPoints[currentPoints.length - 1]];
                currentTravel = 0;
                travelRemaining = limit;
            }
            const allowed = Math.min(travelRemaining, remainingSegment);
            const ratio = clamp01(allowed / remainingSegment);
            const splitPoint = {
                x: previousPoint.x + (nextPoint.x - previousPoint.x) * ratio,
                y: previousPoint.y + (nextPoint.y - previousPoint.y) * ratio
            };
            currentPoints.push(splitPoint);
            segments.push(createSegment(path, currentPoints));
            currentPoints = [splitPoint];
            currentTravel = 0;
            remainingSegment -= allowed;
            previousPoint = splitPoint;
        }

        if (remainingSegment > EPSILON) {
            currentPoints.push(nextPoint);
            currentTravel += remainingSegment;
        } else if (!pointsCoincide(currentPoints[currentPoints.length - 1], nextPoint)) {
            currentPoints.push(nextPoint);
        }
        previousPoint = nextPoint;
    }

    if (currentPoints.length > 1) {
        segments.push(createSegment(path, currentPoints));
    }
    return segments;
}

function createSegment(sourcePath, points) {
    const node = sourcePath.cloneNode(false);
    node.setAttribute('d', buildPathData(points));
    return {
        node,
        length: polylineLength(points)
    };
}

function buildPathData(points) {
    return points.reduce((acc, point, index) => {
        const command = index === 0 ? 'M' : 'L';
        return `${acc}${command} ${point.x} ${point.y} `;
    }, '').trim();
}

function polylineLength(points) {
    let length = 0;
    for (let i = 1; i < points.length; i += 1) {
        length += distanceBetween(points[i - 1], points[i]);
    }
    return length;
}

function distanceBetween(a, b) {
    const dx = (b.x ?? 0) - (a.x ?? 0);
    const dy = (b.y ?? 0) - (a.y ?? 0);
    return Math.hypot(dx, dy);
}

function parsePathPoints(path) {
    const data = path.getAttribute('d');
    if (!data) {
        return [];
    }
    const matches = data.match(/-?\d*\.?\d+(?:e[-+]?\d+)?/gi);
    if (!matches || matches.length < 4) {
        return [];
    }
    const points = [];
    for (let i = 0; i < matches.length - 1; i += 2) {
        const x = Number(matches[i]);
        const y = Number(matches[i + 1]);
        if (Number.isFinite(x) && Number.isFinite(y)) {
            points.push({ x, y });
        }
    }
    return points;
}

function clamp01(value) {
    if (!Number.isFinite(value)) {
        return 0;
    }
    if (value <= 0) {
        return 0;
    }
    if (value >= 1) {
        return 1;
    }
    return value;
}

function getLayerBaseName(layer) {
    const label = layer.getAttribute('inkscape:label') || '';
    const dashIndex = label.indexOf('-');
    const suffix = dashIndex >= 0 ? label.slice(dashIndex + 1).trim() : label.trim();
    return suffix || 'Layer';
}

function pointsCoincide(a, b) {
    return distanceBetween(a || {}, b || {}) <= EPSILON;
}
