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
        
        const availableColors = Object.values(this.palette)
            .map(color => color.hex)
            .filter(hex => !adjacentColors.has(hex))
            .sort((a, b) => this.colorUsage.get(a) - this.colorUsage.get(b));
        
        let selectedColor;
        if (availableColors.length > 0) {
            selectedColor = availableColors[0];
        } else {
            selectedColor = Array.from(this.colorUsage.entries())
                .sort(([, a], [, b]) => a - b)[0][0];
        }

        this.colorUsage.set(selectedColor, this.colorUsage.get(selectedColor) + 1);
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
        const rectData = { x: position.x, y: position.y, width: size, height: size };
        const points = generateSingleSerpentineLine(rectData, config.line.width);
        
        const pathElement = createPath(points);
        pathElement.setAttribute('stroke-width', config.line.strokeWidth.toString());
        
        const color = colorManager.getValidColor(rectData);
        colorGroups[color].appendChild(pathElement);

        for (let j = 0; j < size; j++) {
            helper[i + j] += size;
        }
    }
    console.log('ddddd');
    return svg;
}

/**
 * Generates and displays the SVG visualization
 */
export function generateSVG() {
    try {
	console.log('okay');
        validateBouwkampCode(bouwkampCode);
		console.log('okay2');
        const svg = drawBouwkampCode(bouwkampCode);
		console.log('okay3');
        document.body.appendChild(svg);
    } catch (error) {
        console.error(error.message);
    }
}
