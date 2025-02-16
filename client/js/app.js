import { drawingTypes } from './drawings.js';

export function generateSVG(drawingConfig) {
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

        const svg = typeConfig.drawFunction(drawingConfig);
        
        if (!svg) {
            throw new Error('Failed to generate SVG');
        }
        return svg;
    } catch (error) {
        console.error('Error generating visualization:', error);
        throw error;
    }
}
