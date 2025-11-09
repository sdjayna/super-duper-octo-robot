import { createSVG } from '../utils/svgUtils.js';
import { validateBouwkampCode } from '../utils/validationUtils.js';
import { generateSingleSerpentineLine } from '../utils/patternUtils.js';
import { createDrawingBuilder } from '../utils/drawingBuilder.js';
import { SizedDrawingConfig } from '../utils/drawingConfigBase.js';
import { registerDrawing, addDrawingPreset } from '../drawingRegistry.js';
import { colorPalettes } from '../utils/colorUtils.js';

export class BouwkampConfig extends SizedDrawingConfig {
    constructor(params = {}) {
        const code = params.code;
        if (!Array.isArray(code)) {
            throw new Error('Bouwkamp code must be an array');
        }
        validateBouwkampCode(code);
        const resolvedParams = { ...params, width: code[1], height: code[2] };
        super(resolvedParams);
        this.order = code[0];
        this.squares = code.slice(3);
    }

    toArray() {
        return [this.order, this.width, this.height, ...this.squares];
    }
}

export function drawBouwkampCode(drawingConfig, renderContext) {
    const bouwkamp = drawingConfig.drawingData;
    const svg = createSVG(renderContext);
    const builder = createDrawingBuilder({ svg, drawingConfig, renderContext });

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
        const projectedRect = builder.projectRect(rectData);
        const points = generateSingleSerpentineLine(projectedRect, drawingConfig.line.spacing, drawingConfig.line.strokeWidth);
        
        builder.appendPath(points, { geometry: projectedRect });

        for (let j = 0; j < size; j++) {
            helper[i + j] += size;
        }
    }
    return svg;
}

registerDrawing({
    id: 'bouwkamp',
    name: 'Bouwkamp Code',
    configClass: BouwkampConfig,
    drawFunction: drawBouwkampCode,
    validator: () => true
});

addDrawingPreset('simplePerfectRectangle', 'Simple Perfect Rectangle', {
    type: 'bouwkamp',
    code: [17, 403, 285, 148, 111, 144, 75, 36, 3, 141, 39, 58, 37, 53, 21, 16, 15, 99, 84, 79],
    line: {
        spacing: 2,
        strokeWidth: 0.85,
        vertexGap: 0.2
    },
    colorPalette: colorPalettes.sakuraPalette
});
