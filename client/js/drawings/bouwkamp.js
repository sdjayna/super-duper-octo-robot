import { createSVG, createColorGroups, createPath } from '../utils/svgUtils.js';
import { validateBouwkampCode } from '../utils/validationUtils.js';
import { generateSingleSerpentineLine } from '../utils/patternUtils.js';
import { ColorManager } from '../utils/colorUtils.js';
export class BouwkampConfig {
    constructor(params) {
        this.width = params.paper?.width || 420;
        this.height = params.paper?.height || 297;
        // Extract code array from params
        const code = params.code;
        if (!Array.isArray(code)) {
            throw new Error('Bouwkamp code must be an array');
        }
        validateBouwkampCode(code);
        this.order = code[0];
        this.width = code[1];
        this.height = code[2];
        this.squares = code.slice(3);
    }

    toArray() {
        return [this.order, this.width, this.height, ...this.squares];
    }
}

export function drawBouwkampCode(drawingConfig, isPortrait = false) {
    const bouwkamp = drawingConfig.drawingData;
    const svg = createSVG(drawingConfig, bouwkamp.width, bouwkamp.height, isPortrait);
    
    const colorGroups = createColorGroups(svg, drawingConfig.colorPalette);
    const colorManager = new ColorManager(drawingConfig.colorPalette);

    // Calculate scaling to fit within paper size while maintaining aspect ratio
    const scaleX = (drawingConfig.paper.width - 2 * drawingConfig.paper.margin) / bouwkamp.width;
    const scaleY = (drawingConfig.paper.height - 2 * drawingConfig.paper.margin) / bouwkamp.height;
    const scale = Math.min(scaleX, scaleY); // Use 100% of available space
    
    console.log(`Plot dimensions: ${drawingConfig.paper.width}×${drawingConfig.paper.height}mm`);
    
    // Calculate the center of the paper
    const paperCenterX = drawingConfig.paper.width / 2;
    const paperCenterY = drawingConfig.paper.height / 2;
    
    // Calculate the center of the bouwkamp drawing
    const bouwkampCenterX = (bouwkamp.width / 2);
    const bouwkampCenterY = (bouwkamp.height / 2);

    const helper = new Array(900).fill(0);

    for (let rect = 0; rect < bouwkamp.order; rect++) {
        let i = 0;
        for (let j = 1; j < bouwkamp.width; j++) {
            if (helper[j] < helper[i]) {
                i = j;
            }
        }

        const position = { x: i, y: helper[i] };
        const size = bouwkamp.squares[rect];
        const vertexGap = drawingConfig.line.vertexGap;
        
        // Scale and center the rectangle position and size
        const rectData = {
            x: paperCenterX + (position.x - bouwkampCenterX) * scale + vertexGap,
            y: paperCenterY + (position.y - bouwkampCenterY) * scale + vertexGap,
            width: (size - 2 * vertexGap) * scale,
            height: (size - 2 * vertexGap) * scale
        };
        const points = generateSingleSerpentineLine(rectData, drawingConfig.line.spacing, drawingConfig.line.strokeWidth);
        
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
