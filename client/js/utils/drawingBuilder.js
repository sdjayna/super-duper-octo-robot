import { createDrawingContext } from './drawingContext.js';

export function createDrawingBuilder({ svg, drawingConfig, renderContext, abortSignal }) {
    const drawingContext = createDrawingContext(svg, drawingConfig.colorPalette);
    drawingContext.defaultStrokeWidth = drawingConfig.line?.strokeWidth ?? 0.4;

    const applyLineDefaults = (options = {}) => ({
        strokeWidth: options.strokeWidth ?? drawingConfig.line?.strokeWidth,
        strokeLinecap: options.strokeLinecap ?? drawingConfig.line?.lineCap ?? 'round',
        strokeLinejoin: options.strokeLinejoin ?? drawingConfig.line?.lineJoin ?? 'round',
        geometry: options.geometry,
        strokeColor: options.strokeColor
    });

    return {
        appendPath(points, options = {}) {
            if (abortSignal?.aborted) {
                throw new Error('Render aborted');
            }
            const lineOptions = applyLineDefaults(options);
            drawingContext.appendPath({
                points,
                ...lineOptions
            });
        },
        projectPoints(points) {
            return renderContext.projectPoints(points);
        },
        projectRect(rect) {
            return renderContext.projectRect(rect);
        },
        context: drawingContext
    };
}
