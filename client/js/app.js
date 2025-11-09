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

        const paperForContext = options.paper || drawingConfig.paper;
        const dynamicBounds = options.bounds
            || (typeof drawingConfig.drawingData?.getBounds === 'function'
                ? drawingConfig.drawingData.getBounds({
                    paper: paperForContext,
                    orientation: options.orientation
                })
                : drawingConfig.drawingData.bounds);
        if (dynamicBounds) {
            drawingConfig.drawingData.currentBounds = dynamicBounds;
        }

        const renderContext = options.renderContext || createRenderContext({
            paper: paperForContext,
            drawingWidth: dynamicBounds?.width || drawingConfig.drawingData.width,
            drawingHeight: dynamicBounds?.height || drawingConfig.drawingData.height,
            bounds: dynamicBounds,
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
