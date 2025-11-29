import { drawingTypes, drawingsReady } from './drawings.js';
import { createRenderContext } from './renderContext.js';

export async function generateSVG(drawingConfig, options = {}) {
    try {
        const abortSignal = options.abortSignal;
        const throwIfAborted = () => {
            if (abortSignal?.aborted) {
                throw new Error('Render aborted');
            }
        };
        await drawingsReady;
        if (!drawingConfig) {
            throw new Error('Drawing configuration is required');
        }

        throwIfAborted();
        console.log(`Generating SVG for ${drawingConfig.name}`);
        
        const typeConfig = drawingTypes[drawingConfig.type];
        if (!typeConfig) {
            throw new Error(`Unsupported drawing type: ${drawingConfig.type}`);
        }

        // Run type-specific validation if it exists
        if (typeConfig.validator) {
            typeConfig.validator(drawingConfig);
        }

        throwIfAborted();
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

        throwIfAborted();
        const renderContext = options.renderContext || createRenderContext({
            paper: paperForContext,
            drawingWidth: dynamicBounds?.width || drawingConfig.drawingData.width,
            drawingHeight: dynamicBounds?.height || drawingConfig.drawingData.height,
            bounds: dynamicBounds,
            orientation: options.orientation,
            plotterArea: options.plotterArea
        });
        renderContext.abortSignal = abortSignal;

        throwIfAborted();
        const svg = await typeConfig.drawFunction(drawingConfig, renderContext, { abortSignal });
        
        if (!svg) {
            throw new Error('Failed to generate SVG');
        }
        return { svg, renderContext };
    } catch (error) {
        console.error('Error generating visualization:', error);
        throw error;
    }
}
