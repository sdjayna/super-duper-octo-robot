import { createSVG, createColorGroups, createPath } from './svgUtils.js';
import { validateBouwkampCode, generateSingleSerpentineLine, areRectanglesAdjacent } from './bouwkampUtils.js';

import { DrawingConfig } from './DrawingConfig.js';

/**
 * Manages color selection and adjacency tracking
 */
class ColorManager {
    constructor(palette) {
        this.palette = palette;
        this.placedRectangles = [];
        this.colorUsage = new Map(Object.values(palette).map(color => [color.hex, 0]));
        this.recentColors = [];  // Track recently used colors
        this.maxRecentColors = 3;  // How many recent colors to avoid
    }

    /**
     * Gets a valid color for a new rectangle
     * @param {Object} newRect - The new rectangle to color
     * @returns {string} The selected color
     */
    getValidColor(newRect) {
        const adjacentColors = new Set();
        for (const placed of this.placedRectangles) {
            if (areRectanglesAdjacent(newRect, placed.rect)) {
                adjacentColors.add(placed.color);
            }
        }

        // Get all available colors that aren't adjacent
        let availableColors = Object.values(this.palette)
            .map(color => color.hex)
            .filter(hex => !adjacentColors.has(hex));

        // Further filter out recently used colors if possible
        const nonRecentColors = availableColors.filter(color => !this.recentColors.includes(color));
        if (nonRecentColors.length > 0) {
            availableColors = nonRecentColors;
        }

        // Score each available color based on usage and recency
        const colorScores = availableColors.map(color => ({
            color,
            score: this.colorUsage.get(color) * 2 + 
                   (this.recentColors.includes(color) ? 1 : 0)
        }));

        let selectedColor;
        if (colorScores.length > 0) {
            // Choose the color with the lowest score
            selectedColor = colorScores.sort((a, b) => a.score - b.score)[0].color;
        } else {
            // If no valid colors, choose the least used color overall
            selectedColor = Array.from(this.colorUsage.entries())
                .sort(([, a], [, b]) => a - b)[0][0];
        }

        // Update tracking
        this.colorUsage.set(selectedColor, this.colorUsage.get(selectedColor) + 1);
        this.recentColors.unshift(selectedColor);
        if (this.recentColors.length > this.maxRecentColors) {
            this.recentColors.pop();
        }
        this.placedRectangles.push({ rect: newRect, color: selectedColor });
        
        return selectedColor;
    }
}

/**
 * Draws a Bouwkamp code using serpentine line patterns
 * @param {number[]} code - The Bouwkamp code to draw
 * @returns {SVGElement} The generated SVG element
 */
function drawBouwkampCode(drawingConfig) {
    const order = drawingConfig.code[0];
    const width = drawingConfig.code[1];
    const height = drawingConfig.code[2];
    const squares = drawingConfig.code.slice(3);

    const svg = createSVG(drawingConfig, width, height);

    const colorGroups = createColorGroups(svg, drawingConfig.colorPalette);
    const colorManager = new ColorManager(drawingConfig.colorPalette);

    const helper = new Array(900).fill(0);

    for (let rect = 0; rect < order; rect++) {
        let i = 0;
        for (let j = 1; j < width; j++) {
            if (helper[j] < helper[i]) {
                i = j;
            }
        }

        const position = { x: i, y: helper[i] };
        const size = squares[rect];
        const vertexGap = drawingConfig.line.vertexGap;
        const rectData = { 
            x: position.x + vertexGap, 
            y: position.y + vertexGap, 
            width: size - (2 * vertexGap), 
            height: size - (2 * vertexGap)
        };
        const points = generateSingleSerpentineLine(rectData, drawingConfig.line.width);
        
        const pathElement = createPath(points);
        pathElement.setAttribute('stroke-width', drawingConfig.line.strokeWidth.toString());
        
        const color = colorManager.getValidColor(rectData);
        colorGroups[color].appendChild(pathElement);

        for (let j = 0; j < size; j++) {
            helper[i + j] += size;
        }
    }
    return svg;
}

/**
 * Generates and displays the SVG visualization
 */
export function generateSVG(drawingConfig) {
    try {
        if (!drawingConfig) {
            throw new Error('Drawing configuration is required');
        }
        console.log('Drawing config:', drawingConfig); // Debug
        console.log('Code:', drawingConfig.code); // Debug
        validateBouwkampCode(drawingConfig.code);
        const svg = drawBouwkampCode(drawingConfig);
        if (!svg) {
            throw new Error('Failed to generate SVG');
        }
        return svg;
    } catch (error) {
        console.error('Error generating visualization:', error);
        throw error;
    }
}
