import { createPath } from './svgUtils.js';

export function appendColoredPath({ points, strokeWidth, geometry, colorGroups, colorManager }) {
    if (!points || points.length === 0) {
        return null;
    }

    const path = createPath(points);
    if (typeof strokeWidth === 'number') {
        path.setAttribute('stroke-width', strokeWidth.toString());
    }

    const fallbackGeometry = geometry || deriveGeometryFromPoints(points);
    const color = colorManager.getValidColor(fallbackGeometry);
    const layer = colorGroups[color];

    if (layer) {
        layer.appendChild(path);
    }
    colorManager.updateTracking(color, fallbackGeometry);
    return path;
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
