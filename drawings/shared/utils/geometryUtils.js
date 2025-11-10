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

export function computeBoundsFromPoints(points = []) {
    if (!points.length) {
        return { minX: 0, minY: 0, width: 1, height: 1 };
    }
    const xs = points.map(point => Number(point?.x ?? 0));
    const ys = points.map(point => Number(point?.y ?? 0));
    const minX = Math.min(...xs);
    const maxX = Math.max(...xs);
    const minY = Math.min(...ys);
    const maxY = Math.max(...ys);
    return {
        minX,
        minY,
        width: Math.max(maxX - minX, 1),
        height: Math.max(maxY - minY, 1)
    };
}

export function computeBoundsFromRects(rects = []) {
    if (!rects.length) {
        return { minX: 0, minY: 0, width: 1, height: 1 };
    }
    const points = rects.flatMap(rect => ([
        { x: Number(rect?.x ?? 0), y: Number(rect?.y ?? 0) },
        {
            x: Number(rect?.x ?? 0) + Number(rect?.width ?? 0),
            y: Number(rect?.y ?? 0) + Number(rect?.height ?? 0)
        }
    ]));
    return computeBoundsFromPoints(points);
}
