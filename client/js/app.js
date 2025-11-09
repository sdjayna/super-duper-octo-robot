import { drawingTypes } from './drawings.js';
import { createRenderContext } from './renderContext.js';

export function generateSVG(drawingConfig, options = {}) {
    try {
        if (!drawingConfig) {
            throw new Error('Drawing configuration is required');
        }

        console.log(`Generating SVG for ${drawingConfig.name}`);
        
        const typeConfig = drawingTypes[drawingConfig.type];
        if (!typeConfig) {
            throw new Error(`Unsupported drawing type: ${drawingConfig.type}`);
        }

        // Run type-specific validation if it exists
        if (typeConfig.validator) {
            typeConfig.validator(drawingConfig);
        }

        const renderContext = options.renderContext || createRenderContext({
            paper: options.paper || drawingConfig.paper,
            drawingWidth: drawingConfig.drawingData.width,
            drawingHeight: drawingConfig.drawingData.height,
            bounds: options.bounds || drawingConfig.drawingData.bounds,
            orientation: options.orientation
        });

        const svg = typeConfig.drawFunction(drawingConfig, renderContext);
        
        if (!svg) {
            throw new Error('Failed to generate SVG');
        }
        return svg;
    } catch (error) {
        console.error('Error generating visualization:', error);
        throw error;
    }
}
