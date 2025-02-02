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
export function generateSingleSerpentineLine(rect, lineWidth) {
    const points = [];
    const spacing = lineWidth;
    let direction = 1;

    const adjustedRect = {
        x: rect.x + lineWidth / 2,
        y: rect.y + lineWidth / 2,
        width: rect.width - lineWidth,
        height: rect.height - lineWidth,
    };

    const topY = adjustedRect.y;
    const bottomY = adjustedRect.y + adjustedRect.height - lineWidth / 2;

    for (let x = adjustedRect.x; x <= adjustedRect.x + adjustedRect.width; x += spacing) {
        if (direction === 1) {
            points.push({ x, y: topY });
            points.push({ x, y: bottomY });
        } else {
            points.push({ x, y: bottomY });
            points.push({ x, y: topY });
        }
        direction *= -1;
    }

    if (points.length > 0) {
        const lastPoint = points[points.length - 1];
        const corners = [
            { x: adjustedRect.x + adjustedRect.width, y: bottomY },
            { x: adjustedRect.x + adjustedRect.width, y: topY },
            { x: adjustedRect.x, y: topY },
            { x: adjustedRect.x, y: bottomY }
        ];
        
        let closestCornerIndex = 0;
        let minDistance = Number.MAX_VALUE;
        corners.forEach((corner, index) => {
            const distance = Math.hypot(corner.x - lastPoint.x, corner.y - lastPoint.y);
            if (distance < minDistance) {
                minDistance = distance;
                closestCornerIndex = index;
            }
        });
        
        for (let i = 0; i < 4; i++) {
            const cornerIndex = (closestCornerIndex + i) % 4;
            points.push(corners[cornerIndex]);
        }
        
        points.push(corners[closestCornerIndex]);
    }

    return points;
}
