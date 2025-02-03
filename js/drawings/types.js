import { drawBouwkampCode, BouwkampConfig } from './bouwkamp.js';
import { drawDelaunayTriangulation, DelaunayConfig } from './delaunay.js';
import { drawHilbertCurve, HilbertConfig } from './hilbert.js';

export const drawingTypes = {
    bouwkamp: {
        name: 'Bouwkamp Code',
        configClass: BouwkampConfig,
        drawFunction: drawBouwkampCode,
        validator: (config) => {
            // Add any validation specific to Bouwkamp
            return true;
        }
    },
    delaunay: {
        name: 'Delaunay Triangulation',
        configClass: DelaunayConfig,
        drawFunction: drawDelaunayTriangulation
    },
    hilbert: {
        name: 'Hilbert Curve',
        configClass: HilbertConfig,
        drawFunction: drawHilbertCurve
    }
};
