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
        const rectData = { 
            x: position.x + vertexGap, 
            y: position.y + vertexGap, 
            width: size - (2 * vertexGap), 
            height: size - (2 * vertexGap)
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
