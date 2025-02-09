/**
 * Validates a Bouwkamp code array.
 * @param {number[]} code - The Bouwkamp code to validate
 * @throws {Error} If the code is invalid
 */
export function validateBouwkampCode(code) {
    if (!Array.isArray(code)) {
        throw new Error("Invalid Bouwkamp code: Must be an array.");
    }
    if (!code || code.length === 0) {
        throw new Error("Invalid Bouwkamp code: The code is empty.");
    }
    if (code.length - 3 !== code[0]) {
        throw new Error("Invalid Bouwkamp code: The code has the wrong length.");
    }
    if (!code.every(num => Number.isInteger(num) && num > 0)) {
        throw new Error("Invalid Bouwkamp code: All values must be positive integers.");
    }
}

/**
 * Generates points for a serpentine line pattern within a rectangle
 * @param {Object} rect - Rectangle dimensions {x, y, width, height}
 * @param {number} lineWidth - Width of the serpentine line
 * @returns {Array<{x: number, y: number}>} Array of points defining the pattern
 */

export function generateSingleSerpentineLine(rect, lineSpacing, lineWidth) {
    const spacing = lineSpacing || 2.5;
    const adjustedRect = adjustRectForLineWidth(rect, lineWidth);
    const points = generateSerpentinePoints(adjustedRect, spacing);
    return [...points, ...generateClosingPath(points[points.length - 1], adjustedRect)];
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
    const corners = [
        { x: rect.x + rect.width, y: rect.y + rect.height },
        { x: rect.x + rect.width, y: rect.y },
        { x: rect.x, y: rect.y },
        { x: rect.x, y: rect.y + rect.height }
    ];
    
    const closestCornerIndex = corners.reduce((closest, corner, index) => {
        const distance = Math.hypot(corner.x - lastPoint.x, corner.y - lastPoint.y);
        return distance < closest.distance ? { index, distance } : closest;
    }, { index: 0, distance: Infinity }).index;

    return [
        ...corners.slice(closestCornerIndex),
        ...corners.slice(0, closestCornerIndex),
        corners[closestCornerIndex]
    ];
}

/**
 * Checks if two rectangles are adjacent
 * @param {Object} rect1 - First rectangle {x, y, width, height}
 * @param {Object} rect2 - Second rectangle {x, y, width, height}
 * @returns {boolean} True if rectangles are adjacent
 */
export function areRectanglesAdjacent(rect1, rect2) {
    // Expand rect1 by 1 unit to check for adjacency
    const expanded = {
        x: rect1.x - 1,
        y: rect1.y - 1,
        width: rect1.width + 2,
        height: rect1.height + 2
    };
    
    // Check if expanded rect1 intersects with rect2
    return !(expanded.x + expanded.width <= rect2.x ||
             expanded.x >= rect2.x + rect2.width ||
             expanded.y + expanded.height <= rect2.y ||
             expanded.y >= rect2.y + rect2.height);
}
