import { drawingTypes, drawings, registerDrawing, addDrawingPreset, DrawingConfig } from './drawingRegistry.js';

// Auto-register built-in drawings by importing their modules
import './drawings/bouwkamp.js';
import './drawings/delaunay.js';
import './drawings/hilbert.js';

export {
    drawingTypes,
    drawings,
    registerDrawing,
    addDrawingPreset,
    DrawingConfig
};
