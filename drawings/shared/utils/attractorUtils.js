export function projectChaoticPoints(points, renderContext, smoothing = 0) {
    if (!Array.isArray(points) || !points.length) {
        return [];
    }

    let minX = Infinity;
    let maxX = -Infinity;
    let minY = Infinity;
    let maxY = -Infinity;

    points.forEach(point => {
        if (point.x < minX) minX = point.x;
        if (point.x > maxX) maxX = point.x;
        if (point.y < minY) minY = point.y;
        if (point.y > maxY) maxY = point.y;
    });

    const rangeX = Math.max(maxX - minX, 1e-5);
    const rangeY = Math.max(maxY - minY, 1e-5);

    const projected = points.map(point => ({
        x: ((point.x - minX) / rangeX) * renderContext.drawingWidth,
        y: ((point.y - minY) / rangeY) * renderContext.drawingHeight
    }));

    if (smoothing > 0) {
        for (let i = 1; i < projected.length; i++) {
            projected[i].x = projected[i - 1].x * smoothing + projected[i].x * (1 - smoothing);
            projected[i].y = projected[i - 1].y * smoothing + projected[i].y * (1 - smoothing);
        }
    }

    return projected;
}
