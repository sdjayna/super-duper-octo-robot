import { createColorGroups } from './svgUtils.js';
import { ColorManager } from './colorUtils.js';
import { appendColoredPath } from './drawingUtils.js';
import { createLayerTravelOptimizer } from './layerTravelOptimizer.js';

export function createDrawingContext(svg, colorPalette) {
    const colorManager = new ColorManager(colorPalette);
    const colorGroups = createColorGroups(svg, colorPalette);
    const optimizer = createLayerTravelOptimizer(colorGroups);

    return {
        svg,
        colorGroups,
        colorManager,
        appendPath(options) {
            const result = appendColoredPath({
                ...options,
                colorGroups,
                colorManager
            });
            if (result?.path && result?.color) {
                optimizer.registerPath({
                    color: result.color,
                    points: options.points,
                    pathElement: result.path
                });
                return result.path;
            }
            return null;
        }
    };
}
