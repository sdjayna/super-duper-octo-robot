import { createRenderContext } from '../../renderContext.js';

export function createTestPalette(overrides = {}) {
    return {
        primary: { hex: '#000000', name: 'Primary', ...(overrides.primary || {}) },
        secondary: { hex: '#ff0000', name: 'Accent', ...(overrides.secondary || {}) }
    };
}

export function createTestRenderContext(options = {}) {
    const paper = options.paper || { width: 120, height: 90, margin: 5 };
    const drawingWidth = options.drawingWidth ?? paper.width;
    const drawingHeight = options.drawingHeight ?? paper.height;
    return createRenderContext({
        paper,
        drawingWidth,
        drawingHeight,
        bounds: options.bounds,
        orientation: options.orientation
    });
}

export function createTestDrawingConfig(overrides = {}) {
    return {
        drawingData: overrides.drawingData || {},
        paper: overrides.paper || { width: 120, height: 90, margin: 5 },
        line: overrides.line || { strokeWidth: 0.3 },
        colorPalette: overrides.colorPalette || createTestPalette()
    };
}
