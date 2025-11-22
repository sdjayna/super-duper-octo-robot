const EPSILON = 1e-6;

function normalizePolygon(polygon = []) {
    if (!Array.isArray(polygon) || polygon.length < 3) {
        return [];
    }
    const cleaned = polygon
        .filter(point => Number.isFinite(point?.x) && Number.isFinite(point?.y))
        .map(point => ({ x: point.x, y: point.y }));
    if (cleaned.length < 3) {
        return [];
    }
    const [first] = cleaned;
    const last = cleaned[cleaned.length - 1];
    if (first.x !== last.x || first.y !== last.y) {
        cleaned.push({ ...first });
    }
    return cleaned;
}

function computeScanlineIntersections(polygon, y) {
    const intersections = [];
    for (let i = 0; i < polygon.length - 1; i++) {
        const p1 = polygon[i];
        const p2 = polygon[i + 1];
        const minY = Math.min(p1.y, p2.y);
        const maxY = Math.max(p1.y, p2.y);
        if (maxY === minY) {
            continue;
        }
        const include = (y >= minY && y < maxY) || (y === maxY && y > minY && y < maxY + 1e-6);
        if (!include) {
            continue;
        }
        const ratio = (y - p1.y) / (p2.y - p1.y);
        const x = p1.x + ratio * (p2.x - p1.x);
        intersections.push(x);
    }
    intersections.sort((a, b) => a - b);
    return intersections;
}

function nearestPointOnPolygon(point, polygon) {
    let closest = { point: polygon[0], segmentIndex: 0, distance: Infinity };
    for (let i = 0; i < polygon.length - 1; i++) {
        const a = polygon[i];
        const b = polygon[i + 1];
        const abx = b.x - a.x;
        const aby = b.y - a.y;
        const denom = abx * abx + aby * aby || 1;
        const t = Math.min(1, Math.max(0, ((point.x - a.x) * abx + (point.y - a.y) * aby) / denom));
        const proj = { x: a.x + abx * t, y: a.y + aby * t };
        const distance = Math.hypot(proj.x - point.x, proj.y - point.y);
        if (distance < closest.distance) {
            closest = { point: proj, segmentIndex: i, distance };
        }
    }
    return closest;
}

function pushUniquePoint(path, point) {
    if (!point || !Number.isFinite(point.x) || !Number.isFinite(point.y)) {
        return;
    }
    const last = path[path.length - 1];
    if (last && Math.abs(last.x - point.x) < EPSILON && Math.abs(last.y - point.y) < EPSILON) {
        return;
    }
    path.push({ x: point.x, y: point.y });
}

function isPointInsidePolygon(point, polygon) {
    if (!polygon?.length) {
        return false;
    }
    let inside = false;
    for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
        const pi = polygon[i];
        const pj = polygon[j];
        const intersects = ((pi.y > point.y) !== (pj.y > point.y))
            && (point.x < (pj.x - pi.x) * (point.y - pi.y) / ((pj.y - pi.y) || 1) + pi.x);
        if (intersects) {
            inside = !inside;
        }
    }
    return inside;
}

function normalizeVector(vector) {
    if (!vector) {
        return null;
    }
    const length = Math.hypot(vector.x, vector.y);
    if (length < EPSILON) {
        return null;
    }
    return { x: vector.x / length, y: vector.y / length };
}

function computeBisectorDirection(prev, current, next, centroid, polygon) {
    if (!prev || !current || !next) {
        return null;
    }
    const toPrev = normalizeVector({ x: prev.x - current.x, y: prev.y - current.y });
    const toNext = normalizeVector({ x: next.x - current.x, y: next.y - current.y });
    let direction = null;
    if (toPrev && toNext) {
        direction = normalizeVector({ x: toPrev.x + toNext.x, y: toPrev.y + toNext.y });
    }
    if (!direction) {
        direction = normalizeVector({ x: centroid.x - current.x, y: centroid.y - current.y });
    }
    if (!direction) {
        return null;
    }
    let testPoint = {
        x: current.x + direction.x * 0.5,
        y: current.y + direction.y * 0.5
    };
    if (!isPointInsidePolygon(testPoint, polygon)) {
        direction = { x: -direction.x, y: -direction.y };
    }
    testPoint = {
        x: current.x + direction.x * 0.5,
        y: current.y + direction.y * 0.5
    };
    if (!isPointInsidePolygon(testPoint, polygon)) {
        return null;
    }
    return direction;
}

function intersectRayWithSegment(origin, direction, a, b) {
    const segment = { x: b.x - a.x, y: b.y - a.y };
    const denom = direction.x * segment.y - direction.y * segment.x;
    if (Math.abs(denom) < EPSILON) {
        return null;
    }
    const diff = { x: a.x - origin.x, y: a.y - origin.y };
    const t = (diff.x * segment.y - diff.y * segment.x) / denom;
    const u = (diff.x * direction.y - diff.y * direction.x) / denom;
    if (t <= EPSILON || u < -EPSILON || u > 1 + EPSILON) {
        return null;
    }
    return {
        distance: t,
        point: {
            x: origin.x + direction.x * t,
            y: origin.y + direction.y * t
        }
    };
}

function findRayIntersection(origin, direction, polygon, vertexIndex, vertexCount) {
    let closest = null;
    const prevIndex = (vertexIndex - 1 + vertexCount) % vertexCount;
    for (let i = 0; i < polygon.length - 1; i++) {
        if (i === vertexIndex || i === prevIndex) {
            continue;
        }
        const hit = intersectRayWithSegment(origin, direction, polygon[i], polygon[i + 1]);
        if (!hit) {
            continue;
        }
        if (!closest || hit.distance < closest.distance) {
            closest = hit;
        }
    }
    return closest;
}

function projectInteriorBisector({ prev, vertex, next, centroid, polygon, vertexIndex, minInterior, apexInset, entryRatio }) {
    const direction = computeBisectorDirection(prev, vertex, next, centroid, polygon);
    if (!direction) {
        return null;
    }
    const intersection = findRayIntersection(vertex, direction, polygon, vertexIndex, polygon.length - 1);
    const minDistance = Math.max(minInterior, 0.1);
    if (!intersection) {
        return {
            x: vertex.x + direction.x * minDistance,
            y: vertex.y + direction.y * minDistance
        };
    }
    const safeDistance = Math.max(
        minDistance,
        Math.min(intersection.distance * (1 - entryRatio), intersection.distance - apexInset)
    );
    if (!Number.isFinite(safeDistance) || safeDistance <= EPSILON) {
        return null;
    }
    return {
        x: vertex.x + direction.x * safeDistance,
        y: vertex.y + direction.y * safeDistance
    };
}

function rotateArray(items, startIndex) {
    if (!items?.length) {
        return [];
    }
    const index = Math.max(0, Math.min(startIndex, items.length - 1));
    return [...items.slice(index), ...items.slice(0, index)];
}

function findClosestVertexToCentroid(entries, centroid) {
    if (!entries?.length) {
        return 0;
    }
    let idx = 0;
    let distance = Infinity;
    entries.forEach((entry, entryIndex) => {
        const d = Math.hypot(entry.vertex.x - centroid.x, entry.vertex.y - centroid.y);
        if (d < distance) {
            distance = d;
            idx = entryIndex;
        }
    });
    return idx;
}

function appendBoundaryLoop(path, boundary, connection) {
    if (!boundary?.length) {
        return path;
    }
    const openBoundary = boundary.slice(0, -1);
    if (!openBoundary.length) {
        return path;
    }
    const insertIndex = ((connection?.segmentIndex ?? 0) + 1) % openBoundary.length;
    if (connection?.point) {
        openBoundary.splice(insertIndex, 0, { x: connection.point.x, y: connection.point.y });
    }
    const startIndex = insertIndex % openBoundary.length;
    for (let i = 0; i <= openBoundary.length; i++) {
        const idx = (startIndex + i) % openBoundary.length;
        const point = openBoundary[idx];
        path.push({ x: point.x, y: point.y });
    }
    path.push({ x: openBoundary[startIndex].x, y: openBoundary[startIndex].y });
    return path;
}

export function generatePolygonScanlineHatch(polygonPoints, spacing = 2.5, options = {}) {
    const polygon = normalizePolygon(polygonPoints);
    if (polygon.length < 4) {
        return [];
    }
    const rawStep = Math.max(spacing, 0.1);
    let minY = Infinity;
    let maxY = -Infinity;
    polygon.forEach(point => {
        minY = Math.min(minY, point.y);
        maxY = Math.max(maxY, point.y);
    });
    if (!Number.isFinite(minY) || !Number.isFinite(maxY) || maxY - minY <= 0) {
        return [];
    }
    let minX = Infinity;
    let maxX = -Infinity;
    polygon.forEach(point => {
        minX = Math.min(minX, point.x);
        maxX = Math.max(maxX, point.x);
    });
    const horizontalInset = Math.max(0, Math.min(options.inset ?? spacing / 2, (maxX - minX) / 2));
    const path = [];
    const addPoint = (point) => {
        const last = path[path.length - 1];
        if (!last || last.x !== point.x || last.y !== point.y) {
            path.push(point);
        }
    };
    let direction = 1;
    const insetAmount = Math.max(0, Math.min(options.inset ?? spacing / 2, (maxY - minY) / 2));
    const startY = minY + insetAmount;
    const endY = maxY - insetAmount;
    if (endY < startY) {
        return appendBoundaryLoop([], polygon, { point: polygon[0], segmentIndex: 0 });
    }
    const innerHeight = endY - startY;
    const rows = Math.max(1, Math.round(innerHeight / rawStep));
    const actualStep = rows === 0 ? innerHeight : innerHeight / rows;
    let y = startY;
    for (let row = 0; row <= rows; row++) {
        const intersections = computeScanlineIntersections(polygon, y);
        if (intersections.length >= 2) {
            if (path.length > 0 && path[path.length - 1].y !== y) {
                addPoint({ x: path[path.length - 1].x, y });
            }
            for (let i = 0; i < intersections.length; i += 2) {
                let startX = intersections[i];
                let endX = intersections[i + 1];
                if (!Number.isFinite(startX) || !Number.isFinite(endX)) {
                    continue;
                }
                startX = Math.min(Math.max(startX + horizontalInset, minX + horizontalInset), endX);
                endX = Math.max(Math.min(endX - horizontalInset, maxX - horizontalInset), startX);
                if (endX - startX <= 1e-3) {
                    continue;
                }
                if (direction === 1) {
                    addPoint({ x: startX, y });
                    addPoint({ x: endX, y });
                } else {
                    addPoint({ x: endX, y });
                    addPoint({ x: startX, y });
                }
            }
            direction *= -1;
        }
        y = Math.min(y + actualStep, endY);
    }
    if (options.includeBoundary === false) {
        return path;
    }
    const boundary = polygon.map(point => ({ x: point.x, y: point.y }));
    const result = [...path];
    if (!result.length) {
        appendBoundaryLoop(result, boundary, { segmentIndex: 0, point: boundary[0] });
        return result;
    }
    const lastPoint = result[result.length - 1];
    const nearest = nearestPointOnPolygon(lastPoint, boundary);
    if (nearest.distance > 0) {
        result.push({ x: nearest.point.x, y: nearest.point.y });
    }
    appendBoundaryLoop(result, boundary, nearest);
    return result;
}

export function generatePolygonSerpentineHatch(polygonPoints, spacing = 2.5, options = {}) {
    const polygon = normalizePolygon(polygonPoints);
    if (polygon.length < 4) {
        return [];
    }
    const rotatedPolygon = polygon.map(point => ({ x: point.y, y: point.x }));
    const rotatedPath = generatePolygonScanlineHatch(rotatedPolygon, spacing, options);
    if (!rotatedPath.length) {
        return [];
    }
    return rotatedPath.map(point => ({ x: point.y, y: point.x }));
}

export function generatePolygonSkeletonHatch(polygonPoints, options = {}) {
    const polygon = normalizePolygon(polygonPoints);
    if (polygon.length < 4) {
        return [];
    }
    const open = polygon.slice(0, -1);
    if (open.length < 3) {
        return [];
    }
    const centroid = polygonCentroid(open);
    if (!Number.isFinite(centroid.x) || !Number.isFinite(centroid.y)) {
        return [];
    }
    const spacing = Number.isFinite(options.spacing) ? Math.max(options.spacing, 0.1) : 2.5;
    const minInteriorDistance = Number.isFinite(options.minInteriorDistance)
        ? Math.max(options.minInteriorDistance, 0.1)
        : Math.max(spacing * 0.5, 0.75);
    const apexInset = Number.isFinite(options.apexInset) ? Math.max(options.apexInset, 0) : 0.35;
    const entryRatio = Number.isFinite(options.entryRatio)
        ? Math.min(Math.max(options.entryRatio, 0.05), 0.45)
        : 0.2;

    const bisectorEntries = open.map((vertex, index) => {
        const prev = open[(index - 1 + open.length) % open.length];
        const next = open[(index + 1) % open.length];
        const target = projectInteriorBisector({
            prev,
            vertex,
            next,
            centroid,
            polygon,
            vertexIndex: index,
            minInterior: minInteriorDistance,
            apexInset,
            entryRatio
        });
        return {
            vertex,
            target: target || centroid,
            index
        };
    });

    if (!bisectorEntries.length) {
        return [];
    }

    const startIndex = findClosestVertexToCentroid(bisectorEntries, centroid);
    const ordered = rotateArray(bisectorEntries, startIndex);
    const path = [];

    pushUniquePoint(path, ordered[0].vertex);
    for (let i = 0; i < ordered.length; i++) {
        const entry = ordered[i];
        if (entry.target) {
            pushUniquePoint(path, entry.target);
        }
        pushUniquePoint(path, centroid);
        const nextEntry = ordered[(i + 1) % ordered.length];
        pushUniquePoint(path, nextEntry.vertex);
    }
    if (path.length && (Math.abs(path[0].x - path[path.length - 1].x) > EPSILON
        || Math.abs(path[0].y - path[path.length - 1].y) > EPSILON)) {
        pushUniquePoint(path, path[0]);
    }

    if (options.includeBoundary) {
        const anchor = path[path.length - 1] || ordered[0].vertex;
        const nearest = nearestPointOnPolygon(anchor, polygon);
        appendBoundaryLoop(path, polygon, nearest);
    }
    return path;
}

function offsetPolygonInward(points, inset) {
    const loop = normalizePolygon(points);
    if (loop.length < 4 || inset <= 0) {
        return loop.slice(0, -1);
    }
    let signedArea = 0;
    for (let i = 0; i < loop.length - 1; i++) {
        const current = loop[i];
        const next = loop[i + 1];
        signedArea += current.x * next.y - next.x * current.y;
    }
    const inwardFactor = signedArea < 0 ? -1 : 1;
    const offsetVertices = [];

    const openLength = loop.length - 1;
    for (let i = 0; i < openLength; i++) {
        const prev = loop[(i - 1 + openLength) % openLength];
        const current = loop[i];
        const next = loop[(i + 1) % openLength];

        const v1 = normalizeVector({ x: current.x - prev.x, y: current.y - prev.y });
        const v2 = normalizeVector({ x: next.x - current.x, y: next.y - current.y });
        if (!v1 || !v2) {
            return null;
        }
        const n1 = { x: -v1.y * inwardFactor, y: v1.x * inwardFactor };
        const n2 = { x: -v2.y * inwardFactor, y: v2.x * inwardFactor };

        const p1 = { x: current.x + n1.x * inset, y: current.y + n1.y * inset };
        const p2 = { x: current.x + n2.x * inset, y: current.y + n2.y * inset };

        const denom = (v2.y * v1.x - v2.x * v1.y) || 0;
        let candidate = null;
        if (Math.abs(denom) >= EPSILON) {
            const t = ((p2.x - p1.x) * v2.y - (p2.y - p1.y) * v2.x) / denom;
            candidate = {
                x: p1.x + v1.x * t,
                y: p1.y + v1.y * t
            };
        }
        if (!candidate || !Number.isFinite(candidate.x) || !Number.isFinite(candidate.y)) {
            candidate = {
                x: (p1.x + p2.x) / 2,
                y: (p1.y + p2.y) / 2
            };
        } else {
            const dist = Math.hypot(candidate.x - current.x, candidate.y - current.y);
            if (!Number.isFinite(dist) || dist > inset * 2) {
                candidate = {
                    x: (p1.x + p2.x) / 2,
                    y: (p1.y + p2.y) / 2
                };
            }
        }
        const dot = v1.x * v2.x + v1.y * v2.y;
        const clampedDot = Math.min(Math.max(dot, -1), 1);
        const angle = Math.acos(clampedDot);
        if (angle < Math.PI / 9) {
            const blend = 0.5;
            candidate = {
                x: current.x + (candidate.x - current.x) * blend,
                y: current.y + (candidate.y - current.y) * blend
            };
        }
        offsetVertices.push(candidate);
    }

    return offsetVertices;
}

function doesSegmentIntersect(a1, a2, b1, b2) {
    const det = (a2.x - a1.x) * (b2.y - b1.y) - (a2.y - a1.y) * (b2.x - b1.x);
    if (Math.abs(det) < EPSILON) {
        return false;
    }
    const ua = ((b2.x - b1.x) * (a1.y - b1.y) - (b2.y - b1.y) * (a1.x - b1.x)) / det;
    const ub = ((a2.x - a1.x) * (a1.y - b1.y) - (a2.y - a1.y) * (a1.x - b1.x)) / det;
    return ua > 0 && ua < 1 && ub > 0 && ub < 1;
}

function doesPolygonCross(boundary, candidate) {
    if (!boundary?.length || !candidate?.length) {
        return false;
    }
    const boundaryOpen = boundary.slice(0, -1);
    const candidateOpen = candidate.slice(0, -1);
    for (let i = 0; i < boundaryOpen.length; i++) {
        const a1 = boundaryOpen[i];
        const a2 = boundaryOpen[(i + 1) % boundaryOpen.length];
        for (let j = 0; j < candidateOpen.length; j++) {
            const b1 = candidateOpen[j];
            const b2 = candidateOpen[(j + 1) % candidateOpen.length];
            if (doesSegmentIntersect(a1, a2, b1, b2)) {
                return true;
            }
        }
    }
    return false;
}

function findNearestIndex(points, target) {
    if (!points?.length || !target) {
        return 0;
    }
    let nearest = 0;
    let distance = Infinity;
    points.forEach((point, index) => {
        const d = Math.hypot(point.x - target.x, point.y - target.y);
        if (d < distance) {
            distance = d;
            nearest = index;
        }
    });
    return nearest;
}

function polygonArea(points) {
    if (!points?.length) {
        return 0;
    }
    let area = 0;
    for (let i = 0; i < points.length; i++) {
        const current = points[i];
        const next = points[(i + 1) % points.length];
        area += current.x * next.y - next.x * current.y;
    }
    return Math.abs(area * 0.5);
}

export function generatePolygonContourHatch(polygonPoints, spacing = 2.5, options = {}) {
    const polygon = normalizePolygon(polygonPoints);
    if (polygon.length < 4) {
        return [];
    }
    const open = polygon.slice(0, -1);
    const centroid = polygonCentroid(open);
    if (!Number.isFinite(centroid.x) || !Number.isFinite(centroid.y)) {
        return [];
    }
    const includeBoundary = options.includeBoundary !== false;
    const baseStep = Number.isFinite(spacing) ? Math.max(spacing, 0.1) : 2.5;
    const insetStart = Number.isFinite(options.inset) ? Math.max(options.inset, 0) : baseStep / 2;
    const minEdge = open.reduce((acc, point, index) => {
        const next = open[(index + 1) % open.length];
        return Math.min(acc, Math.hypot(point.x - next.x, point.y - next.y));
    }, Infinity);
    const perimeter = open.reduce((acc, point, index) => {
        const next = open[(index + 1) % open.length];
        return acc + Math.hypot(point.x - next.x, point.y - next.y);
    }, 0);
    const inradius = perimeter > EPSILON ? Math.abs(polygonArea(polygon)) * 0.5 / perimeter : Infinity;
    if (!Number.isFinite(minEdge) || minEdge < EPSILON) {
        return includeBoundary ? polygon : [];
    }
    const minInset = Math.max(baseStep * 0.5, (options.strokeWidth || 0.4) * 0.75);
    const maxInset = Math.max(Math.min(minEdge * 0.3, inradius * 0.8, baseStep * 2), baseStep * 0.4);
    const path = [];
    if (includeBoundary) {
        const boundary = polygon.slice(0, -1);
        boundary.forEach(point => pushUniquePoint(path, point));
        if (boundary.length) {
            pushUniquePoint(path, boundary[0]);
        }
    }
    let current = open;
    let currentInset = Math.max(insetStart + (options.strokeWidth || 0.4), minInset);
    let loops = 0;
    const maxLoops = 400;

    while (loops < maxLoops) {
        const step = Math.min(currentInset, maxInset);
        const insetLoop = offsetPolygonInward(current, step);
        if (!insetLoop || insetLoop.length < 3) {
            break;
        }
        const loopArea = polygonArea([...insetLoop, insetLoop[0]]);
        if (loopArea < EPSILON) {
            break;
        }
        // Reject rings that escape the original polygon
        const outside = insetLoop.some(point => !isPointInsidePolygon(point, polygon));
        const crossesBoundary = doesPolygonCross(polygon, insetLoop);
        if (outside || crossesBoundary) {
            break;
        }
        const startIndex = findNearestIndex(insetLoop, path[path.length - 1] || insetLoop[0]);
        const rotated = rotateArray(insetLoop, startIndex);
        rotated.forEach(point => pushUniquePoint(path, point));
        pushUniquePoint(path, rotated[0]);

        current = insetLoop;
        currentInset = Math.max(minInset, Math.min(step, maxInset));
        loops += 1;
    }

    return path;
}

export function rectToPolygon(rect) {
    return [
        { x: rect.x, y: rect.y },
        { x: rect.x + rect.width, y: rect.y },
        { x: rect.x + rect.width, y: rect.y + rect.height },
        { x: rect.x, y: rect.y + rect.height },
        { x: rect.x, y: rect.y }
    ];
}

function polygonCentroid(points) {
    let area = 0;
    let cx = 0;
    let cy = 0;
    for (let i = 0; i < points.length; i++) {
        const current = points[i];
        const next = points[(i + 1) % points.length];
        const cross = current.x * next.y - next.x * current.y;
        area += cross;
        cx += (current.x + next.x) * cross;
        cy += (current.y + next.y) * cross;
    }
    area *= 0.5;
    if (Math.abs(area) < 1e-6) {
        const average = points.reduce(
            (acc, point) => {
                acc.x += point.x;
                acc.y += point.y;
                return acc;
            },
            { x: 0, y: 0 }
        );
        return {
            x: average.x / points.length,
            y: average.y / points.length
        };
    }
    const factor = 1 / (6 * area);
    return {
        x: cx * factor,
        y: cy * factor
    };
}
