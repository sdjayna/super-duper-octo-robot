import { drawBouwkampCode } from './drawings/bouwkamp.js';
import { drawDelaunayTriangulation } from './drawings/delaunay.js';
import { drawHilbertCurve } from './drawings/hilbert.js';
import { validateBouwkampCode } from './bouwkampUtils.js';

export function generateSVG(drawingConfig) {
    try {
        if (!drawingConfig) {
            throw new Error('Drawing configuration is required');
        }

        console.log(`Generating SVG for ${drawingConfig.name}`);
        let svg;
        switch (drawingConfig.type) {
            case 'bouwkamp':
                validateBouwkampCode(drawingConfig.drawingData.toArray());
                svg = drawBouwkampCode(drawingConfig);
                break;
            case 'delaunay':
                svg = drawDelaunayTriangulation(drawingConfig);
                break;
            case 'hilbert':
                svg = drawHilbertCurve(drawingConfig);
                break;
            default:
                throw new Error(`Unsupported drawing type: ${drawingConfig.type}`);
        }

        if (!svg) {
            throw new Error('Failed to generate SVG');
        }
        return svg;
    } catch (error) {
        console.error('Error generating visualization:', error);
        throw error;
    }
}
