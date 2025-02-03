import { drawBouwkampCode } from './bouwkamp.js';
import { drawDelaunayTriangulation } from './delaunay.js';
import { drawHilbertCurve } from './hilbert.js';
import { BouwkampConfig } from '../BouwkampConfig.js';
import { DelaunayConfig } from '../DelaunayConfig.js';
import { HilbertConfig } from '../HilbertConfig.js';

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
