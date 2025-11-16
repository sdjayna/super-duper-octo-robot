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

export function generatePolygonScanlineHatch(polygonPoints, spacing = 2.5, options = {}) {
    const polygon = normalizePolygon(polygonPoints);
    if (polygon.length < 4) {
        return [];
    }
    const step = Math.max(spacing, 0.1);
    let minY = Infinity;
    let maxY = -Infinity;
    polygon.forEach(point => {
        minY = Math.min(minY, point.y);
        maxY = Math.max(maxY, point.y);
    });
    if (!Number.isFinite(minY) || !Number.isFinite(maxY) || maxY - minY <= 0) {
        return [];
    }
    const path = [];
    const addPoint = (point) => {
        const last = path[path.length - 1];
        if (!last || last.x !== point.x || last.y !== point.y) {
            path.push(point);
        }
    };
    let direction = 1;
    const insetAmount = Math.max(0, options.inset ?? spacing * 0.25);
    let y = minY + insetAmount;
    while (y <= maxY + 1e-6) {
        const intersections = computeScanlineIntersections(polygon, y);
        if (intersections.length >= 2) {
            if (path.length > 0 && path[path.length - 1].y !== y) {
                addPoint({ x: path[path.length - 1].x, y });
            }
            for (let i = 0; i < intersections.length; i += 2) {
                const startX = intersections[i];
                const endX = intersections[i + 1];
                if (!Number.isFinite(startX) || !Number.isFinite(endX)) {
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
        y += step;
    }
    const boundary = polygon.map(point => ({ x: point.x, y: point.y }));
    const result = [...path];
    const lastPoint = result[result.length - 1];
    const connection = lastPoint || boundary[0];
    const nearest = nearestPointOnPolygon(connection, boundary);
    if (!lastPoint || nearest.distance > 0) {
        result.push({ x: nearest.point.x, y: nearest.point.y });
    }
    const expanded = boundary.slice(0, -1);
    expanded.splice(nearest.segmentIndex + 1, 0, nearest.point);
    const cycleLength = expanded.length;
    for (let i = 0; i <= cycleLength; i++) {
        const idx = (nearest.segmentIndex + 1 + i) % cycleLength;
        result.push({ x: expanded[idx].x, y: expanded[idx].y });
    }
    result.push({ x: nearest.point.x, y: nearest.point.y });
    return result;
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
