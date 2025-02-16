import { createSVG, createColorGroups, createPath } from '../svgUtils.js';
import { validateBouwkampCode, generateSingleSerpentineLine } from '../bouwkampUtils.js';
import { ColorManager } from '../ColorManager.js';
import { BaseConfig } from '../configs/BaseConfig.js';

export class BouwkampConfig extends BaseConfig {
    constructor(params) {
        super(params);
        if (!Array.isArray(params.code)) {
            throw new Error('Bouwkamp code must be an array');
        }
        
        this.order = params.code[0];
        this.width = params.code[1];
        this.height = params.code[2];
        this.squares = params.code.slice(3);
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
    const scale = Math.min(scaleX, scaleY) * 0.95; // Use 95% of available space
    
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
