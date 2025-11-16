/**
 * Generates points for a serpentine line pattern within a rectangle
 * @param {Object} rect - Rectangle dimensions {x, y, width, height}
 * @param {number} lineWidth - Width of the serpentine line
 * @returns {Array<{x: number, y: number}>} Array of points defining the pattern
 */
export function generateSingleSerpentineLine(rect, lineSpacing, lineWidth) {
    const spacing = Math.max(lineSpacing || 2.5, 0.1);
    const adjustedRect = adjustRectForLineWidth(rect, lineWidth);
    
    if (adjustedRect.width <= 0 || adjustedRect.height <= 0) {
        return generateMinimalRectanglePath(rect);
    }

    const points = generateSerpentinePoints(adjustedRect, spacing);
    if (!points.length) {
        return generateMinimalRectanglePath(adjustedRect);
    }
    const closingPath = generateClosingPath(points[points.length - 1], adjustedRect);
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
    const topY = rect.y;
    const bottomY = rect.y + rect.height;
    
    for (let x = rect.x, direction = 1; x <= rect.x + rect.width; x += spacing) {
        points.push(
            { x, y: direction === 1 ? topY : bottomY },
            { x, y: direction === 1 ? bottomY : topY }
        );
        direction *= -1;
    }
    return points;
}

function generateClosingPath(lastPoint, rect) {
    const clamp = (value, min, max) => Math.min(Math.max(value, min), max);
    const boundaryCandidates = [
        { x: rect.x, y: clamp(lastPoint.y, rect.y, rect.y + rect.height), distance: Math.abs(lastPoint.x - rect.x) },
        { x: rect.x + rect.width, y: clamp(lastPoint.y, rect.y, rect.y + rect.height), distance: Math.abs(lastPoint.x - (rect.x + rect.width)) },
        { x: clamp(lastPoint.x, rect.x, rect.x + rect.width), y: rect.y, distance: Math.abs(lastPoint.y - rect.y) },
        { x: clamp(lastPoint.x, rect.x, rect.x + rect.width), y: rect.y + rect.height, distance: Math.abs(lastPoint.y - (rect.y + rect.height)) }
    ];
    const nearestBoundary = boundaryCandidates.reduce((a, b) => (b.distance < a.distance ? b : a));
    const corners = [
        { x: rect.x, y: rect.y },
        { x: rect.x + rect.width, y: rect.y },
        { x: rect.x + rect.width, y: rect.y + rect.height },
        { x: rect.x, y: rect.y + rect.height },
        { x: rect.x, y: rect.y }
    ];
    const closestIndex = corners.reduce((closest, corner, index) => {
        const distance = Math.hypot(corner.x - lastPoint.x, corner.y - lastPoint.y);
        return distance < closest.distance ? { index, distance } : closest;
    }, { index: 0, distance: Infinity }).index;

    const orderedCorners = [
        ...corners.slice(closestIndex),
        ...corners.slice(0, closestIndex),
        corners[closestIndex]
    ];
    const path = [];
    if (nearestBoundary.distance > 0) {
        path.push({ x: lastPoint.x, y: lastPoint.y });
        path.push({ x: nearestBoundary.x, y: nearestBoundary.y });
    } else {
        path.push({ x: lastPoint.x, y: lastPoint.y });
    }
    path.push(...orderedCorners);
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
