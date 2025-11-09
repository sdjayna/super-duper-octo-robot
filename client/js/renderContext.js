export function createRenderContext({ paper, drawingWidth, drawingHeight, orientation = 'landscape' }) {
    if (!paper) {
        throw new Error('Paper configuration is required to create a render context');
    }

    if (!drawingWidth || !drawingHeight) {
        throw new Error('Drawing dimensions are required to create a render context');
    }

    const normalizedOrientation = orientation === 'portrait' ? 'portrait' : 'landscape';

    const margin = Number(paper.margin) || 0;
    const width = Number(paper.width);
    const height = Number(paper.height);

    if (!Number.isFinite(width) || !Number.isFinite(height)) {
        throw new Error('Paper width and height must be finite numbers');
    }

    const shorterSide = Math.min(width, height);
    const longerSide = Math.max(width, height);
    const isPortrait = normalizedOrientation === 'portrait';

    const paperWidth = isPortrait ? shorterSide : longerSide;
    const paperHeight = isPortrait ? longerSide : shorterSide;

    const safeDrawingWidth = Math.max(Number(drawingWidth), 1);
    const safeDrawingHeight = Math.max(Number(drawingHeight), 1);

    const availableWidth = Math.max(paperWidth - 2 * margin, 0);
    const availableHeight = Math.max(paperHeight - 2 * margin, 0);

    const scale = Math.min(
        availableWidth / safeDrawingWidth,
        availableHeight / safeDrawingHeight
    );

    const offsetX = margin + (availableWidth - safeDrawingWidth * scale) / 2;
    const offsetY = margin + (availableHeight - safeDrawingHeight * scale) / 2;

    const context = {
        paperWidth,
        paperHeight,
        margin,
        orientation: normalizedOrientation,
        isPortrait,
        drawingWidth: safeDrawingWidth,
        drawingHeight: safeDrawingHeight,
        scale: Number.isFinite(scale) ? scale : 1,
        offsetX: Number.isFinite(offsetX) ? offsetX : margin,
        offsetY: Number.isFinite(offsetY) ? offsetY : margin
    };

    context.projectPoint = (point) => {
        const px = Number(point?.x ?? 0);
        const py = Number(point?.y ?? 0);
        return {
            x: context.offsetX + px * context.scale,
            y: context.offsetY + py * context.scale
        };
    };

    context.projectPoints = (points) => points.map(context.projectPoint);

    context.projectRect = (rect) => {
        const rx = Number(rect?.x ?? 0);
        const ry = Number(rect?.y ?? 0);
        const rWidth = Number(rect?.width ?? 0);
        const rHeight = Number(rect?.height ?? 0);
        return {
            x: context.offsetX + rx * context.scale,
            y: context.offsetY + ry * context.scale,
            width: rWidth * context.scale,
            height: rHeight * context.scale
        };
    };

    return context;
}
