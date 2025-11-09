import { createSVG } from '../utils/svgUtils.js';
import { validateBouwkampCode } from '../utils/validationUtils.js';
import { generateSingleSerpentineLine } from '../utils/patternUtils.js';
import { appendColoredPath } from '../utils/drawingUtils.js';
import { createDrawingContext } from '../utils/drawingContext.js';
export class BouwkampConfig {
    constructor(params) {
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
        this.width = this.bounds.width;
        this.height = this.bounds.height;
    }

    toArray() {
        return [this.order, this.width, this.height, ...this.squares];
    }
}

export function drawBouwkampCode(drawingConfig, renderContext) {
    const bouwkamp = drawingConfig.drawingData;
    const svg = createSVG(renderContext);
    const drawingContext = createDrawingContext(svg, drawingConfig.colorPalette);

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
        appendColoredPath({
            points,
            strokeWidth: drawingConfig.line.strokeWidth,
            strokeLinecap: drawingConfig.line.lineCap || 'round',
            strokeLinejoin: drawingConfig.line.lineJoin || 'round',
            geometry: projectedRect,
            colorGroups: drawingContext.colorGroups,
            colorManager: drawingContext.colorManager
        });

        for (let j = 0; j < size; j++) {
            helper[i + j] += size;
        }
    }
    return svg;
}
