import { createDrawingContext } from './drawingContext.js';

export function createDrawingBuilder({ svg, drawingConfig, renderContext, abortSignal }) {
    const palette = drawingConfig.colorPalette || {};
    const drawingContext = createDrawingContext(svg, palette);
    drawingContext.defaultStrokeWidth = drawingConfig.line?.strokeWidth ?? 0.4;
    const paletteEntries = Object.values(palette || {});
    const colorLookup = new Map();
    paletteEntries.forEach(entry => {
        if (entry?.hex) {
            colorLookup.set(String(entry.hex).toLowerCase(), entry);
        }
    });

    const applyLineDefaults = (options = {}) => ({
        strokeWidth: options.strokeWidth ?? drawingConfig.line?.strokeWidth,
        strokeLinecap: options.strokeLinecap ?? drawingConfig.line?.lineCap ?? 'round',
        strokeLinejoin: options.strokeLinejoin ?? drawingConfig.line?.lineJoin ?? 'round',
        geometry: options.geometry,
        strokeColor: options.strokeColor
    });
    const getPaletteEntry = (hex) => {
        if (!hex) return null;
        return colorLookup.get(String(hex).toLowerCase()) || null;
    };

    return {
        appendPath(points, options = {}) {
            if (abortSignal?.aborted) {
                throw new Error('Render aborted');
            }
            const lineOptions = applyLineDefaults(options);
            const pathPayload = {
                points,
                ...lineOptions
            };
            const entry = getPaletteEntry(lineOptions.strokeColor);
            if (entry?.name) {
                pathPayload.colorName = entry.name;
            }
            drawingContext.appendPath(pathPayload);
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
