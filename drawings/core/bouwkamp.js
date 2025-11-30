import {
    defineDrawing,
    SizedDrawingConfig,
    createDrawingRuntime,
    validateBouwkampCode,
    generateSingleSerpentineLine,
    generatePolygonScanlineHatch,
    generatePolygonSkeletonHatch,
    generatePolygonContourHatch,
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
        const preserveAspectRatio = params.preserveAspectRatio !== false;
        const resolvedParams = {
            ...params,
            preserveAspectRatio,
            width: code[1],
            height: code[2]
        };
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
    const fillPaper = bouwkamp.preserveAspectRatio === false;
    const targetBounds = renderContext.bounds || {
        width: bouwkamp.width,
        height: bouwkamp.height
    };
    const fillScaleX = fillPaper ? (targetBounds.width / bouwkamp.width) : 1;
    const fillScaleY = fillPaper ? (targetBounds.height / bouwkamp.height) : 1;

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
        const vertexGap = Number(drawingConfig.line?.vertexGap ?? 0);
        const insetSize = Math.max(size - 2 * vertexGap, 0);

        const rectData = {
            x: (position.x + vertexGap) * fillScaleX,
            y: (position.y + vertexGap) * fillScaleY,
            width: insetSize * fillScaleX,
            height: insetSize * fillScaleY
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
        } else if (hatchStyle === 'skeleton') {
            const skeletonPath = generatePolygonSkeletonHatch(polygon, {
                spacing,
                includeBoundary,
                apexInset: hatchInset
            });
            if (skeletonPath.length > 0) {
                builder.appendPath(skeletonPath, { geometry: projectedRect });
            }
        } else if (hatchStyle === 'contour') {
            const contourPath = generatePolygonContourHatch(polygon, spacing, {
                inset: hatchInset,
                includeBoundary
            });
            if (contourPath.length > 0) {
                builder.appendPath(contourPath, { geometry: projectedRect });
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
        id: 'fitToMargin',
        label: 'Fit to Margin',
        target: 'drawingData.preserveAspectRatio',
        inputType: 'checkbox',
        default: true,
        description: 'Check to fit the rectangle to the paper margins. Uncheck to keep the original Bouwkamp proportions.'
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
