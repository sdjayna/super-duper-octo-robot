const MM_PER_METER = 1000;
const EPSILON = 1e-6;

function passDebug(message, payload = {}) {
    if (typeof console?.debug === 'function') {
        console.debug('[passTravelLimiter]', message, payload);
    }
}

function clamp01(value) {
    if (value <= 0) return 0;
    if (value >= 1) return 1;
    return value;
}

function distance(a = {}, b = {}) {
    return Math.hypot((b.x ?? 0) - (a.x ?? 0), (b.y ?? 0) - (a.y ?? 0));
}

export function polylineLength(points = []) {
    if (!Array.isArray(points)) {
        return 0;
    }
    let length = 0;
    for (let i = 1; i < points.length; i += 1) {
        length += distance(points[i - 1], points[i]);
    }
    return length;
}

function explodePathsByLimit(paths = [], limitMm) {
    if (!Number.isFinite(limitMm) || limitMm <= 0) {
        return paths.slice();
    }
    const exploded = [];
    paths.forEach(path => {
        const length = polylineLength(path.points);
        if (length <= limitMm + EPSILON) {
            exploded.push(path);
            return;
        }
        const segments = splitPathPoints(path.points, limitMm);
        segments.forEach(segmentPoints => {
            exploded.push({
                ...path,
                points: segmentPoints
            });
        });
    });
    return exploded;
}

function buildBuckets(paths = [], limitMm) {
    if (!Number.isFinite(limitMm) || limitMm <= 0) {
        const total = paths.reduce((sum, path) => sum + polylineLength(path.points), 0);
        return [{ paths: paths.slice(), totalLength: total }];
    }
    const buckets = [];
    let current = [];
    let travel = 0;
    paths.forEach(path => {
        const length = polylineLength(path.points);
        if (current.length && travel + length > limitMm + EPSILON) {
            buckets.push({ paths: current, totalLength: travel });
            current = [];
            travel = 0;
        }
        current.push(path);
        travel += length;
    });
    if (current.length) {
        buckets.push({ paths: current, totalLength: travel });
    }
    return buckets;
}

export function splitPassesByTravel(passes = [], maxTravelMeters) {
    const limitMeters = Number(maxTravelMeters);
    if (!Number.isFinite(limitMeters) || limitMeters <= 0) {
        passDebug('skip (no limit)', { limitMeters });
        return {
            passes: passes.slice(),
            limitMeters: null,
            splitLayers: 0,
            totalLayers: passes.length
        };
    }
    const limitMm = limitMeters * MM_PER_METER;
    const rebuilt = [];
    let splitLayers = 0;
    passDebug('begin split', { limitMeters, passCount: passes.length });

    passes.forEach(pass => {
        const explodedPaths = explodePathsByLimit(pass.paths || [], limitMm);
        const buckets = buildBuckets(explodedPaths, limitMm);
        passDebug('pass buckets', {
            baseLabel: pass.baseLabel,
            totalBuckets: buckets.length,
            bucketTravel: buckets.map(bucket => bucket.totalLength)
        });
        if (!buckets.length) {
            return;
        }
        if (buckets.length > 1) {
            splitLayers += 1;
        }
        buckets.forEach((bucket, idx) => {
            rebuilt.push({
                baseOrder: pass.baseOrder,
                baseLabel: pass.baseLabel,
                label: buckets.length > 1 ? `${pass.baseLabel} (pass ${idx + 1}/${buckets.length})` : pass.baseLabel,
                stroke: pass.stroke,
                paths: bucket.paths,
                travelMm: bucket.totalLength
            });
        });
    });

    rebuilt.sort((a, b) => {
        if (a.baseOrder !== b.baseOrder) {
            return a.baseOrder - b.baseOrder;
        }
        return 0;
    });
    passDebug('split complete', { rebuiltCount: rebuilt.length, splitLayers });
    return {
        passes: rebuilt,
        limitMeters,
        splitLayers,
        totalLayers: rebuilt.length
    };
}

export function splitPathPoints(points, limitMm) {
    if (!Array.isArray(points) || points.length < 2 || !Number.isFinite(limitMm) || limitMm <= 0) {
        return [points];
    }
    const segments = [];
    let current = [points[0]];
    let currentTravel = 0;
    let previousPoint = points[0];

    for (let i = 1; i < points.length; i += 1) {
        let nextPoint = points[i];
        let segmentLength = distance(previousPoint, nextPoint);
        if (segmentLength <= EPSILON) {
            current.push(nextPoint);
            previousPoint = nextPoint;
            continue;
        }
        let remainingSegment = segmentLength;

        while (currentTravel + remainingSegment > limitMm + EPSILON) {
            let travelRemaining = limitMm - currentTravel;
            if (travelRemaining <= EPSILON) {
                segments.push(current.slice());
                current = [current[current.length - 1]];
                currentTravel = 0;
                travelRemaining = limitMm;
            }
            const allowed = Math.min(travelRemaining, remainingSegment);
            const ratio = clamp01(allowed / remainingSegment);
            const splitPoint = {
                x: previousPoint.x + (nextPoint.x - previousPoint.x) * ratio,
                y: previousPoint.y + (nextPoint.y - previousPoint.y) * ratio
            };
            current.push(splitPoint);
            segments.push(current.slice());
            current = [splitPoint];
            currentTravel = 0;
            remainingSegment -= allowed;
            previousPoint = splitPoint;
        }

        if (remainingSegment > EPSILON) {
            current.push(nextPoint);
            currentTravel += remainingSegment;
        } else if (
            current.length === 0 ||
            current[current.length - 1].x !== nextPoint.x ||
            current[current.length - 1].y !== nextPoint.y
        ) {
            current.push(nextPoint);
        }
        previousPoint = nextPoint;
    }

    if (current.length > 1) {
        segments.push(current);
    }
    return segments;
}
