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
