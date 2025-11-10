import { drawingTypes, drawings, registerDrawing, addDrawingPreset, DrawingConfig } from './drawingRegistry.js';
import { ensureDrawingsLoaded } from './drawingsLoader.js';

const drawingsReady = ensureDrawingsLoaded();

export {
    drawingTypes,
    drawings,
    registerDrawing,
    addDrawingPreset,
    DrawingConfig,
    drawingsReady
};
