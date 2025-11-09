import { createColorGroups } from './svgUtils.js';
import { ColorManager } from './colorUtils.js';
import { appendColoredPath } from './drawingUtils.js';

export function createDrawingContext(svg, colorPalette) {
    const colorManager = new ColorManager(colorPalette);
    const colorGroups = createColorGroups(svg, colorPalette);

    return {
        svg,
        colorGroups,
        colorManager,
        appendPath(options) {
            return appendColoredPath({
                ...options,
                colorGroups,
                colorManager
            });
        }
    };
}
