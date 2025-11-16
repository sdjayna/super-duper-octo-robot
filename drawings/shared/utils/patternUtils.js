/**
 * Generates points for a serpentine line pattern within a rectangle
 * @param {Object} rect - Rectangle dimensions {x, y, width, height}
 * @param {number} lineWidth - Width of the serpentine line
 * @returns {Array<{x: number, y: number}>} Array of points defining the pattern
 */
export function generateSingleSerpentineLine(rect, lineSpacing, lineWidth, options = {}) {
    const spacing = Math.max(lineSpacing || 2.5, 0.1);
    const adjustedRect = adjustRectForLineWidth(rect, lineWidth);
    
    if (adjustedRect.width <= 0 || adjustedRect.height <= 0) {
        return generateMinimalRectanglePath(rect);
    }

    const inset = Math.max(0, Math.min(options.inset ?? spacing / 2, Math.min(adjustedRect.width, adjustedRect.height) / 2));
    const innerRect = {
        x: adjustedRect.x + inset,
        y: adjustedRect.y + inset,
        width: adjustedRect.width - inset * 2,
        height: adjustedRect.height - inset * 2
    };
    if (innerRect.width <= 0 || innerRect.height <= 0) {
        return generateMinimalRectanglePath(rect);
    }

    const points = generateSerpentinePoints(innerRect, spacing);
    if (!points.length) {
        return generateMinimalRectanglePath(adjustedRect);
    }
    if (options.includeBoundary === false) {
        return points;
    }
    const closingPath = connectRectPerimeter(points[points.length - 1], rect);
    return [...points, ...closingPath];
}

function adjustRectForLineWidth(rect, lineWidth) {
    return {
        x: rect.x + lineWidth / 2,
        y: rect.y + lineWidth / 2,
        width: rect.width - lineWidth,
        height: rect.height - lineWidth
    };
}

function generateSerpentinePoints(rect, spacing) {
    const points = [];
    const width = rect.width;
    const columns = Math.max(1, Math.round(width / spacing));
    const actualSpacing = width / columns;
    const topY = rect.y;
    const bottomY = rect.y + rect.height;
    let direction = 1;
    for (let i = 0; i <= columns; i++) {
        const x = rect.x + Math.min(i * actualSpacing, width);
        const limitedX = rect.x + Math.min(Math.max(i * actualSpacing, 0), width);
        points.push(
            { x: limitedX, y: direction === 1 ? topY : bottomY },
            { x: limitedX, y: direction === 1 ? bottomY : topY }
        );
        direction *= -1;
    }
    return points;
}

function connectRectPerimeter(lastPoint, rect) {
    if (!lastPoint) {
        return generateMinimalRectanglePath(rect);
    }
    const clamp = (value, min, max) => Math.min(Math.max(value, min), max);
    const boundaryCandidates = [
        { point: { x: rect.x, y: clamp(lastPoint.y, rect.y, rect.y + rect.height) }, distance: Math.abs(lastPoint.x - rect.x), edge: 0 },
        { point: { x: rect.x + rect.width, y: clamp(lastPoint.y, rect.y, rect.y + rect.height) }, distance: Math.abs(lastPoint.x - (rect.x + rect.width)), edge: 1 },
        { point: { x: clamp(lastPoint.x, rect.x, rect.x + rect.width), y: rect.y }, distance: Math.abs(lastPoint.y - rect.y), edge: 2 },
        { point: { x: clamp(lastPoint.x, rect.x, rect.x + rect.width), y: rect.y + rect.height }, distance: Math.abs(lastPoint.y - (rect.y + rect.height)), edge: 3 }
    ];
    const nearest = boundaryCandidates.reduce((a, b) => (b.distance < a.distance ? b : a));
    const corners = [
        { x: rect.x, y: rect.y },
        { x: rect.x + rect.width, y: rect.y },
        { x: rect.x + rect.width, y: rect.y + rect.height },
        { x: rect.x, y: rect.y + rect.height }
    ];
    const insertMap = { 0: 3, 1: 1, 2: 0, 3: 2 };
    const boundaryLoop = [...corners];
    const insertIndex = insertMap[nearest.edge] ?? 0;
    boundaryLoop.splice(insertIndex + 1, 0, { x: nearest.point.x, y: nearest.point.y });
    const path = [{ x: lastPoint.x, y: lastPoint.y }];
    if (nearest.distance > 1e-6) {
        path.push({ x: nearest.point.x, y: nearest.point.y });
    }
    const startIndex = insertIndex + 1;
    for (let i = 1; i <= boundaryLoop.length; i++) {
        const idx = (startIndex + i) % boundaryLoop.length;
        path.push({ x: boundaryLoop[idx].x, y: boundaryLoop[idx].y });
    }
    path.push({ x: nearest.point.x, y: nearest.point.y });
    return path;
}

function generateMinimalRectanglePath(rect) {
    const width = Math.max(rect.width, 0.05);
    const height = Math.max(rect.height, 0.05);
    const x2 = rect.x + width;
    const y2 = rect.y + height;
    
    return [
        { x: rect.x, y: rect.y },
        { x: x2, y: rect.y },
        { x: x2, y: y2 },
        { x: rect.x, y: y2 },
        { x: rect.x, y: rect.y }
    ];
}
