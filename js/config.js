import { colorPalette } from './colorPalette.js';

/**
 * Configuration settings for the Bouwkamp code visualization
 */
export const config = {
    // Paper size in millimeters (A3)
    paper: {
        width: 420,
        height: 297
    },
    // Line drawing parameters
    line: {
        width: 0.3,      // Width of serpentine line in mm
        spacing: 2.5,     // Spacing between lines in mm
        strokeWidth: 0.45, // SVG stroke width
        vertexGap: 1.25,
    },
    colorPalette
};

export { colorPaletteArray } from './colorPalette.js';
