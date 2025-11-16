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

export function generatePolygonScanlineHatch(polygonPoints, spacing = 2.5) {
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
    let y = minY;
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
