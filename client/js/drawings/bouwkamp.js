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
        this.bounds = {
            minX: 0,
            minY: 0,
            width: this.width,
            height: this.height
        };
    }

    toArray() {
        return [this.order, this.width, this.height, ...this.squares];
    }
}

export function drawBouwkampCode(drawingConfig, renderContext) {
    const bouwkamp = drawingConfig.drawingData;
    const svg = createSVG(renderContext);
    
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
            width: size - 2 * vertexGap,
            height: size - 2 * vertexGap
        };
        const projectedRect = renderContext.projectRect(rectData);
        const points = generateSingleSerpentineLine(projectedRect, drawingConfig.line.spacing, drawingConfig.line.strokeWidth);
        
        const pathElement = createPath(points);
        pathElement.setAttribute('stroke-width', drawingConfig.line.strokeWidth.toString());
        
        const color = colorManager.getValidColor(projectedRect);
        colorGroups[color].appendChild(pathElement);

        for (let j = 0; j < size; j++) {
            helper[i + j] += size;
        }
    }
    return svg;
}
