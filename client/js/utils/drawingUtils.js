import { createPath } from './svgUtils.js';

export function appendColoredPath({ points, strokeWidth, strokeLinecap, strokeLinejoin, geometry, colorGroups, colorManager, strokeColor }) {
    if (!points || points.length === 0) {
        return null;
    }

    const path = createPath(points);
    if (typeof strokeWidth === 'number') {
        path.setAttribute('stroke-width', strokeWidth.toString());
    }
    if (strokeLinecap) {
        path.setAttribute('stroke-linecap', strokeLinecap);
    }
    if (strokeLinejoin) {
        path.setAttribute('stroke-linejoin', strokeLinejoin);
    }

    const fallbackGeometry = geometry || deriveGeometryFromPoints(points);
    let resolvedColor = null;
    if (strokeColor && colorGroups[strokeColor]) {
        resolvedColor = strokeColor;
    } else {
        resolvedColor = colorManager.getValidColor(fallbackGeometry);
    }
    const layer = colorGroups[resolvedColor];

    if (layer) {
        if (strokeColor) {
            path.setAttribute('stroke', strokeColor);
        }
        layer.appendChild(path);
    }
    colorManager.updateTracking(resolvedColor, fallbackGeometry);
    return {
        path,
        color: resolvedColor
    };
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

export function updatePathData(pathElement, points) {
    if (!pathElement || !Array.isArray(points) || points.length === 0) {
        return;
    }
    let pathData = `M ${points[0].x} ${points[0].y}`;
    for (let i = 1; i < points.length; i++) {
        pathData += ` L ${points[i].x} ${points[i].y}`;
    }
    pathElement.setAttribute('d', pathData);
}
