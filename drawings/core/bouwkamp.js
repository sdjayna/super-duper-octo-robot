import {
    defineDrawing,
    SizedDrawingConfig,
    createDrawingRuntime,
    validateBouwkampCode,
    generateSingleSerpentineLine,
    generatePolygonScanlineHatch,
    rectToPolygon,
    colorPalettes
} from '../shared/kit.js';
import { attachControls } from '../shared/controlsUtils.js';

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
    const desiredSpacing = typeof drawingConfig.line?.spacing === 'number'
        ? drawingConfig.line.spacing
        : 2.5;
    const spacing = Math.max(0.1, desiredSpacing);
    const hatchStyle = typeof drawingConfig.line?.hatchStyle === 'string'
        ? drawingConfig.line.hatchStyle
        : 'serpentine';
    const { svg, builder } = createDrawingRuntime({ drawingConfig, renderContext });

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
        const polygon = rectToPolygon(projectedRect);
        const hatchInset = typeof drawingConfig.line?.hatchInset === 'number'
            ? drawingConfig.line.hatchInset
            : spacing / 2;
        const includeBoundary = drawingConfig.line?.includeBoundary !== false;
        if (hatchStyle === 'none') {
            builder.appendPath(polygon, { geometry: projectedRect });
        } else if (hatchStyle === 'scanline') {
            const scanlinePath = generatePolygonScanlineHatch(polygon, spacing, {
                inset: hatchInset,
                includeBoundary
            });
            if (scanlinePath.length > 0) {
                builder.appendPath(scanlinePath, { geometry: projectedRect });
            }
        } else {
            const points = generateSingleSerpentineLine(projectedRect, spacing, drawingConfig.line.strokeWidth, {
                inset: hatchInset,
                includeBoundary
            });
            builder.appendPath(points, { geometry: projectedRect });
        }

        for (let j = 0; j < size; j++) {
            helper[i + j] += size;
        }
    }
    return svg;
}

export const bouwkampControls = [
    {
        id: 'squareMargin',
        label: 'Square Margin',
        target: 'line.vertexGap',
        inputType: 'range',
        min: 0,
        max: 50,
        step: 0.25,
        default: 0.2,
        valueType: 'number',
        description: 'Inset distance from each square edge before the hatch starts (creates a clean border)'
    },
    {
        id: 'hatchSpacing',
        label: 'Hatch Spacing',
        target: 'line.spacing',
        inputType: 'range',
        min: 0,
        max: 10,
        step: 0.25,
        default: 2,
        valueType: 'number',
        description: 'Distance between each serpentine hatch pass (higher values leave larger gaps)'
    },
    {
        id: 'hatchInset',
        label: 'Hatch Offset',
        target: 'line.hatchInset',
        inputType: 'range',
        min: 0,
        max: 5,
        step: 0.1,
        default: 1,
        valueType: 'number',
        description: 'How far to pull hatching away from the boundary before the final outline pass'
    },
    {
        id: 'includeBoundary',
        label: 'Draw Boundary Outline',
        target: 'line.includeBoundary',
        inputType: 'checkbox',
        default: true,
        valueType: 'boolean',
        description: 'Toggle the final perimeter pass (useful when testing hatch offsets)'
    },
    {
        id: 'hatchStyle',
        label: 'Hatch Style',
        target: 'line.hatchStyle',
        inputType: 'select',
        options: [
            { label: 'Serpentine', value: 'serpentine' },
            { label: 'Scanline Fill', value: 'scanline' },
            { label: 'No Hatch', value: 'none' }
        ],
        default: 'serpentine',
        valueType: 'string',
        description: 'Choose the hatching algorithm for each rectangle'
    }
];

export const bouwkampDrawing = attachControls(defineDrawing({
    id: 'bouwkamp',
    name: 'Bouwkamp Code',
    configClass: BouwkampConfig,
    drawFunction: drawBouwkampCode,
    validator: () => true,
    presets: [
        {
            key: 'simplePerfectRectangle',
            name: 'Simple Perfect Rectangle',
            params: {
                type: 'bouwkamp',
                code: [17, 403, 285, 148, 111, 144, 75, 36, 3, 141, 39, 58, 37, 53, 21, 16, 15, 99, 84, 79],
                line: {
                    spacing: 2,
                    strokeWidth: 0.85,
                    vertexGap: 0.2
                },
                colorPalette: colorPalettes.sakuraPalette
            }
        }
    ]
}), bouwkampControls);

export default bouwkampDrawing;
