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

function computeCentroid(polygon) {
    const length = polygon.length;
    let sumX = 0;
    let sumY = 0;
    for (let i = 0; i < length - 1; i++) {
        sumX += polygon[i].x;
        sumY += polygon[i].y;
    }
    const count = length - 1;
    return {
        x: sumX / count,
        y: sumY / count
    };
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

export function rectToPolygon(rect) {
    return [
        { x: rect.x, y: rect.y },
        { x: rect.x + rect.width, y: rect.y },
        { x: rect.x + rect.width, y: rect.y + rect.height },
        { x: rect.x, y: rect.y + rect.height },
        { x: rect.x, y: rect.y }
    ];
}
