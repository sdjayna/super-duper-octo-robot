export function createRenderContext({ paper, drawingWidth, drawingHeight, bounds = null, orientation = 'landscape', plotterArea = null }) {
    if (!paper) {
        throw new Error('Paper configuration is required to create a render context');
    }

    const hasBounds = bounds && (Number.isFinite(bounds.width) && Number.isFinite(bounds.height));
    if (!hasBounds && (!drawingWidth || !drawingHeight)) {
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

    let plotterWidth = paperWidth;
    let plotterHeight = paperHeight;
    if (plotterArea?.width && plotterArea?.height) {
        const rawWidth = Number(plotterArea.width);
        const rawHeight = Number(plotterArea.height);
        if (Number.isFinite(rawWidth) && Number.isFinite(rawHeight)) {
            const pLonger = Math.max(rawWidth, rawHeight);
            const pShorter = Math.min(rawWidth, rawHeight);
            plotterWidth = isPortrait ? pShorter : pLonger;
            plotterHeight = isPortrait ? pLonger : pShorter;
        }
    }

    const boundsWidth = hasBounds ? Number(bounds.width) : Number(drawingWidth);
    const boundsHeight = hasBounds ? Number(bounds.height) : Number(drawingHeight);
    const minX = hasBounds ? Number(bounds.minX || 0) : 0;
    const minY = hasBounds ? Number(bounds.minY || 0) : 0;

    const safeDrawingWidth = Math.max(boundsWidth, 1);
    const safeDrawingHeight = Math.max(boundsHeight, 1);

    const availableWidth = Math.max(Math.min(paperWidth, plotterWidth) - 2 * margin, 0);
    const availableHeight = Math.max(Math.min(paperHeight, plotterHeight) - 2 * margin, 0);

    const scale = Math.min(
        availableWidth / safeDrawingWidth,
        availableHeight / safeDrawingHeight
    );

    const plottingWidth = Math.min(paperWidth, plotterWidth);
    const plottingHeight = Math.min(paperHeight, plotterHeight);
    const plotterOffsetX = (paperWidth - plottingWidth) / 2;
    const plotterOffsetY = (paperHeight - plottingHeight) / 2;

    const offsetX = plotterOffsetX + margin + (availableWidth - safeDrawingWidth * scale) / 2;
    const offsetY = plotterOffsetY + margin + (availableHeight - safeDrawingHeight * scale) / 2;

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
        offsetY: Number.isFinite(offsetY) ? offsetY : margin,
        bounds: {
            minX,
            minY,
            width: safeDrawingWidth,
            height: safeDrawingHeight
        },
    };

    context.projectPoint = (point) => {
        const px = Number(point?.x ?? 0);
        const py = Number(point?.y ?? 0);
        return {
            x: context.offsetX + (px - context.bounds.minX) * context.scale,
            y: context.offsetY + (py - context.bounds.minY) * context.scale
        };
    };

    context.projectPoints = (points) => points.map(context.projectPoint);

    context.projectRect = (rect) => {
        const rx = Number(rect?.x ?? 0);
        const ry = Number(rect?.y ?? 0);
        const rWidth = Number(rect?.width ?? 0);
        const rHeight = Number(rect?.height ?? 0);
        return {
            x: context.offsetX + (rx - context.bounds.minX) * context.scale,
            y: context.offsetY + (ry - context.bounds.minY) * context.scale,
            width: rWidth * context.scale,
            height: rHeight * context.scale
        };
    };

    return context;
}
