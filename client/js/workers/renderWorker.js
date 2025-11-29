/* eslint-env worker */
/* global self */

const MM_PER_METER = 1000;
const EPSILON = 1e-6;
const MAX_PATHS_PER_LAYER = 12000;
const MAX_POINTS_PER_PATH = 8000;
const MAX_SEGMENTS_TOTAL = 60000;

self.addEventListener('message', event => {
    const { type, requestId, payload } = event.data || {};
    if (type !== 'optimize') {
        return;
    }
    try {
        const result = optimizeLayers(payload || {});
        self.postMessage({
            type: 'optimizeResult',
            requestId,
            ...result
        });
    } catch (error) {
        self.postMessage({
            type: 'optimizeResult',
            requestId,
            error: error?.message || String(error)
        });
    }
});

function optimizeLayers(payload) {
    const limitMeters = Number(payload.maxTravelPerLayerMeters);
    const limitMillimeters = Number.isFinite(limitMeters) && limitMeters > 0
        ? limitMeters * MM_PER_METER
        : null;

    const layers = Array.isArray(payload.layers) ? payload.layers : [];
    const passes = [];
    let splitLayers = 0;
    const warnings = [];

    layers.forEach((layer, layerIndex) => {
        if (!layer || !Array.isArray(layer.paths) || layer.paths.length === 0) {
            return;
        }
        const truncatedPaths = layer.paths.slice(0, MAX_PATHS_PER_LAYER);
        if (truncatedPaths.length < layer.paths.length) {
            warnings.push(`Layer "${layer.label || layer.baseLabel || layerIndex}" trimmed to ${MAX_PATHS_PER_LAYER} paths.`);
        }
        const segments = [];
        let totalSegments = 0;
        truncatedPaths.forEach(path => {
            const points = parsePathPoints(path?.d);
            if (points.length < 2) {
                return;
            }
            const clipped = clipPoints(points, MAX_POINTS_PER_PATH);
            const splitPieces = limitMillimeters ? splitPath(clipped, limitMillimeters) : [{ points: clipped, length: polylineLength(clipped) }];
            splitPieces.forEach(piece => {
                totalSegments += 1;
                if (totalSegments > MAX_SEGMENTS_TOTAL) {
                    return;
                }
                segments.push({
                    points: piece.points,
                    length: piece.length,
                    strokeWidth: path.strokeWidth,
                    strokeLinecap: path.strokeLinecap,
                    strokeLinejoin: path.strokeLinejoin,
                    stroke: path.stroke
                });
            });
        });

        if (totalSegments > MAX_SEGMENTS_TOTAL) {
            warnings.push(`Layer "${layer.label || layer.baseLabel || layerIndex}" exceeded segment budget (${MAX_SEGMENTS_TOTAL}); remaining segments skipped.`);
        }

        if (!segments.length) {
            return;
        }

        const buckets = buildBuckets(segments, limitMillimeters);
        if (buckets.length > 1) {
            splitLayers += 1;
        }
        buckets.forEach((bucket, bucketIndex) => {
            const baseLabel = layer.baseLabel || layer.label || 'Layer';
            const label = buckets.length > 1
                ? `${baseLabel} (pass ${bucketIndex + 1}/${buckets.length})`
                : baseLabel;
            passes.push({
                baseOrder: Number.isFinite(layer.baseOrder) ? Number(layer.baseOrder) : layerIndex,
                baseLabel,
                label,
                stroke: layer.stroke || null,
                travelMm: bucket.totalLength,
                paths: bucket.paths
            });
        });
    });

    passes.sort((a, b) => {
        if (a.baseOrder !== b.baseOrder) {
            return a.baseOrder - b.baseOrder;
        }
        return 0;
    });

    return {
        passes,
        summary: {
            limitMeters: limitMeters && limitMeters > 0 ? limitMeters : null,
            splitLayers,
            totalLayers: passes.length,
            warnings
        }
    };
}

function buildBuckets(segments, limitMm) {
    if (!limitMm) {
        return [{
            paths: segments,
            totalLength: segments.reduce((acc, seg) => acc + (seg.length || 0), 0)
        }];
    }
    const buckets = [];
    let current = [];
    let travel = 0;
    segments.forEach(seg => {
        const length = seg.length || 0;
        if (current.length && travel + length > limitMm + EPSILON) {
            buckets.push({ paths: current, totalLength: travel });
            current = [];
            travel = 0;
        }
        current.push(seg);
        travel += length;
    });
    if (current.length) {
        buckets.push({ paths: current, totalLength: travel });
    }
    return buckets;
}

function splitPath(points, limitMm) {
    const limit = Math.max(limitMm, EPSILON);
    const segments = [];
    let current = [points[0]];
    let travel = 0;
    let previous = points[0];

    for (let i = 1; i < points.length; i += 1) {
        let next = points[i];
        let segmentLength = distance(previous, next);
        if (segmentLength <= EPSILON) {
            current.push(next);
            previous = next;
            continue;
        }
        let remaining = segmentLength;
        while (travel + remaining > limit + EPSILON) {
            let travelRemaining = limit - travel;
            if (travelRemaining <= EPSILON) {
                segments.push({ points: current, length: polylineLength(current) });
                current = [current[current.length - 1]];
                travel = 0;
                travelRemaining = limit;
            }
            const allowed = Math.min(travelRemaining, remaining);
            const ratio = clamp01(allowed / remaining);
            const splitPoint = {
                x: previous.x + (next.x - previous.x) * ratio,
                y: previous.y + (next.y - previous.y) * ratio
            };
            current.push(splitPoint);
            segments.push({ points: current, length: polylineLength(current) });
            current = [splitPoint];
            travel = 0;
            remaining -= allowed;
            previous = splitPoint;
        }
        if (remaining > EPSILON) {
            current.push(next);
            travel += remaining;
        } else if (!pointsCoincide(current[current.length - 1], next)) {
            current.push(next);
        }
        previous = next;
    }
    if (current.length > 1) {
        segments.push({ points: current, length: polylineLength(current) });
    }
    return segments;
}

function parsePathPoints(d) {
    if (typeof d !== 'string' || !d.trim()) {
        return [];
    }
    const matches = d.match(/-?\d*\.?\d+(?:e[-+]?\d+)?/gi);
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

function clipPoints(points, limit) {
    if (!Array.isArray(points) || points.length <= limit) {
        return points;
    }
    return points.slice(0, limit);
}

function distance(a, b) {
    if (!a || !b) {
        return 0;
    }
    return Math.hypot((b.x ?? 0) - (a.x ?? 0), (b.y ?? 0) - (a.y ?? 0));
}

function polylineLength(points) {
    let length = 0;
    for (let i = 1; i < points.length; i += 1) {
        length += distance(points[i - 1], points[i]);
    }
    return length;
}

function clamp01(value) {
    if (!Number.isFinite(value)) {
        return 0;
    }
    if (value <= 0) return 0;
    if (value >= 1) return 1;
    return value;
}

function pointsCoincide(a, b) {
    return distance(a, b) <= EPSILON;
}
