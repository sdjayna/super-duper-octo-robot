import { config } from './config.js';
import { createSVG, createColorGroups, createPath } from './svgUtils.js';
import { validateBouwkampCode, generateSingleSerpentineLine, areRectanglesAdjacent } from './bouwkampUtils.js';

/**
 * Default Bouwkamp code representing a perfect squared rectangle.
 * @type {number[]}
 */
const bouwkampCode = [17, 403, 285, 148, 111, 144, 75, 36, 3, 141, 39, 58, 37, 53, 21, 16, 15, 99, 84, 79];

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
function drawBouwkampCode(code) {
    const order = code[0];
    const width = code[1];
    const height = code[2];
    const squares = code.slice(3);

    const svg = createSVG(config.paper.width, config.paper.height, width, height);

    const colorGroups = createColorGroups(svg, config.colorPalette);
    const colorManager = new ColorManager(config.colorPalette);

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
        const vertexGap = config.line.vertexGap;
        const rectData = { 
            x: position.x + vertexGap, 
            y: position.y + vertexGap, 
            width: size - (2 * vertexGap), 
            height: size - (2 * vertexGap)
        };
        const points = generateSingleSerpentineLine(rectData, config.line.width);
        
        const pathElement = createPath(points);
        pathElement.setAttribute('stroke-width', config.line.strokeWidth.toString());
        
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
export function generateSVG() {
    try {
        validateBouwkampCode(bouwkampCode);
        const svg = drawBouwkampCode(bouwkampCode);
        if (!svg) {
            throw new Error('Failed to generate SVG');
        }
        document.body.appendChild(svg);
    } catch (error) {
        console.error('Error generating visualization:', error);
        // Create an error message element
        const errorDiv = document.createElement('div');
        errorDiv.style.color = 'red';
        errorDiv.style.padding = '20px';
        errorDiv.textContent = `Error: ${error.message}`;
        document.body.appendChild(errorDiv);
    }
}
