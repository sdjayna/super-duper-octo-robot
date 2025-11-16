export function generateContourPaths({ width, height, cols = 160, rows, fieldFn, thresholds }) {
    const columnCount = Math.max(10, cols);
    const rowCount = Math.max(10, rows || Math.round((height / width) * columnCount));
    const values = new Float32Array((columnCount + 1) * (rowCount + 1));

    for (let row = 0; row <= rowCount; row++) {
        for (let col = 0; col <= columnCount; col++) {
            const idx = row * (columnCount + 1) + col;
            const x = (col / columnCount) * width;
            const y = (row / rowCount) * height;
            values[idx] = fieldFn(x, y);
        }
    }

    const contours = [];

    thresholds.forEach(threshold => {
        const horizontalPath = [];
        for (let row = 0; row <= rowCount; row++) {
            const crossing = findCrossing(values, row, threshold, columnCount);
            if (crossing) {
                horizontalPath.push({
                    x: (crossing.col / columnCount) * width,
                    y: (row / rowCount) * height
                });
            }
        }
        if (horizontalPath.length > 1) {
            contours.push(horizontalPath);
        }

        const verticalPath = [];
        for (let col = 0; col <= columnCount; col++) {
            const crossing = findVerticalCrossing(values, col, threshold, columnCount, rowCount);
            if (crossing) {
                verticalPath.push({
                    x: (col / columnCount) * width,
                    y: (crossing.row / rowCount) * height
                });
            }
        }
        if (verticalPath.length > 1) {
            contours.push(verticalPath);
        }
    });

    return contours;
}

function findCrossing(values, row, threshold, columnCount) {
    for (let col = 0; col < columnCount; col++) {
        const idx = row * (columnCount + 1) + col;
        const v1 = values[idx];
        const v2 = values[idx + 1];
        if ((v1 <= threshold && v2 >= threshold) || (v1 >= threshold && v2 <= threshold)) {
            const t = safeLerp(v1, v2, threshold);
            return { col: col + t };
        }
    }
    return null;
}

function findVerticalCrossing(values, col, threshold, columnCount, rowCount) {
    for (let row = 0; row < rowCount; row++) {
        const idx = row * (columnCount + 1) + col;
        const v1 = values[idx];
        const v2 = values[idx + columnCount + 1];
        if ((v1 <= threshold && v2 >= threshold) || (v1 >= threshold && v2 <= threshold)) {
            const t = safeLerp(v1, v2, threshold);
            return { row: row + t };
        }
    }
    return null;
}

function safeLerp(v1, v2, threshold) {
    const denom = v2 - v1;
    if (Math.abs(denom) < 1e-6) {
        return 0.5;
    }
    return (threshold - v1) / denom;
}
