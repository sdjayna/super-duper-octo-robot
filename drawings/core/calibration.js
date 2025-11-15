import {
    defineDrawing,
    SizedDrawingConfig,
    createDrawingRuntime,
    colorPalettes
} from '../shared/kit.js';
import { attachControls } from '../shared/controlsUtils.js';

const SVG_NS = 'http://www.w3.org/2000/svg';
const PATTERNS = [
    { key: 'parallel', label: 'Parallel Lines', draw: drawParallelLines },
    { key: 'cross', label: 'Cross Hatch', draw: drawCrossHatch },
    { key: 'concentric', label: 'Concentric Rings', draw: drawConcentricRings },
    { key: 'edgePairs', label: 'Edge Pairs', draw: drawEdgePairs },
    { key: 'sine', label: 'Wave Guides', draw: drawSinePairs }
];

function clampNumber(value, min, max) {
    if (!Number.isFinite(value)) {
        return min;
    }
    return Math.min(Math.max(value, min), max);
}

export class CalibrationConfig extends SizedDrawingConfig {
    constructor(params = {}) {
        super(params);
        this.minSpacing = clampNumber(params.minSpacing ?? 0.45, 0.05, 10);
        const resolvedMax = clampNumber(params.maxSpacing ?? 3, this.minSpacing, 15);
        this.maxSpacing = Math.max(resolvedMax, this.minSpacing);
        this.samples = Math.max(2, Math.floor(params.samples ?? 6));
        this.tilePadding = clampNumber(params.tilePadding ?? 4, 0, 40);
        this.patternScale = clampNumber(params.patternScale ?? 1, 0.5, 3);
    }
}

export function drawCalibrationPatterns(drawingConfig, renderContext) {
    const calibration = drawingConfig.drawingData;
    const { svg, builder } = createDrawingRuntime({ drawingConfig, renderContext });
    const columnCount = PATTERNS.length;
    const rowCount = calibration.samples;
    const padding = calibration.tilePadding;
    const labelGutter = Math.max(20, renderContext.drawingWidth * 0.08);
    const availableWidth = Math.max(renderContext.drawingWidth - padding * (columnCount + 1) - labelGutter, 1);
    const availableHeight = Math.max(renderContext.drawingHeight - padding * (rowCount + 1), 1);
    const tileWidth = Math.max(availableWidth / columnCount, 1);
    const tileHeight = Math.max(availableHeight / rowCount, 1);
    const labelAnchorX = padding + columnCount * (tileWidth + padding) + padding;

    for (let row = 0; row < rowCount; row++) {
        const spacing = computeSpacingValue(calibration, row, rowCount);
        let lastCell = null;
        for (let column = 0; column < columnCount; column++) {
            const cell = {
                x: padding + column * (tileWidth + padding),
                y: padding + row * (tileHeight + padding),
                width: tileWidth,
                height: tileHeight
            };
            const pattern = PATTERNS[column];
            pattern.draw(builder, cell, spacing, calibration.patternScale);
            if (column === columnCount - 1) {
                lastCell = cell;
            }
        }
        if (lastCell) {
            annotateSpacing(builder, svg, lastCell, spacing, labelAnchorX);
        }
    }
    return svg;
}

function computeSpacingValue(calibration, index, totalCount) {
    if (totalCount <= 1) {
        return calibration.maxSpacing;
    }
    const fraction = index / (totalCount - 1);
    const range = calibration.maxSpacing - calibration.minSpacing;
    const spacing = calibration.minSpacing + fraction * range;
    return clampNumber(spacing, 0.05, 25);
}

function innerCell(cell) {
    const inset = Math.min(cell.width, cell.height) * 0.08;
    return {
        x: cell.x + inset,
        y: cell.y + inset,
        width: Math.max(cell.width - inset * 2, 1),
        height: Math.max(cell.height - inset * 2, 1)
    };
}

function drawParallelLines(builder, cell, spacing) {
    const inner = innerCell(cell);
    const safeSpacing = Math.max(spacing, 0.05);
    const count = Math.max(2, Math.floor(inner.height / safeSpacing));
    const offset = (inner.height - (count - 1) * safeSpacing) / 2;
    for (let i = 0; i < count; i++) {
        const y = inner.y + offset + i * safeSpacing;
        const points = builder.projectPoints([
            { x: inner.x, y },
            { x: inner.x + inner.width, y }
        ]);
        builder.appendPath(points, { geometry: inner });
    }
}

function drawCrossHatch(builder, cell, spacing) {
    drawParallelLines(builder, cell, spacing);
    const inner = innerCell(cell);
    const safeSpacing = Math.max(spacing, 0.05);
    const count = Math.max(2, Math.floor(inner.width / safeSpacing));
    const offset = (inner.width - (count - 1) * safeSpacing) / 2;
    for (let i = 0; i < count; i++) {
        const x = inner.x + offset + i * safeSpacing;
        const points = builder.projectPoints([
            { x, y: inner.y },
            { x, y: inner.y + inner.height }
        ]);
        builder.appendPath(points, { geometry: inner });
    }
}

function drawConcentricRings(builder, cell, spacing, scale) {
    const inner = innerCell(cell);
    const safeSpacing = Math.max(spacing * 0.5, 0.05) * scale;
    const radiusMax = Math.min(inner.width, inner.height) / 2;
    const center = {
        x: inner.x + inner.width / 2,
        y: inner.y + inner.height / 2
    };
    for (let radius = safeSpacing; radius <= radiusMax; radius += safeSpacing) {
        const circlePoints = createCirclePoints(center, radius);
        const projected = builder.projectPoints(circlePoints);
        builder.appendPath(projected, { geometry: inner });
    }
}

function drawEdgePairs(builder, cell, spacing) {
    const inner = innerCell(cell);
    const lineLength = inner.height;
    const safeSpacing = Math.max(spacing, 0.05);
    const pairStride = Math.max(safeSpacing * 3, inner.width * 0.2);
    const y0 = inner.y;
    const y1 = inner.y + lineLength;
    let currentX = inner.x + safeSpacing;
    while (currentX + safeSpacing <= inner.x + inner.width) {
        const first = builder.projectPoints([{ x: currentX, y: y0 }, { x: currentX, y: y1 }]);
        const second = builder.projectPoints([
            { x: currentX + safeSpacing, y: y0 },
            { x: currentX + safeSpacing, y: y1 }
        ]);
        builder.appendPath(first, { geometry: inner });
        builder.appendPath(second, { geometry: inner });
        currentX += pairStride;
    }
}

function drawSinePairs(builder, cell, spacing, scale) {
    const inner = innerCell(cell);
    const startX = inner.x;
    const endX = inner.x + inner.width;
    const midY = inner.y + inner.height / 2;
    const safeSpacing = Math.max(spacing, 0.05);
    const amplitude = Math.min(inner.height / 3, safeSpacing * 2 * scale);
    const sampleCount = 80;
    const offset = safeSpacing / 2;

    const createWavePoints = (direction) => {
        const points = [];
        for (let i = 0; i <= sampleCount; i++) {
            const t = i / sampleCount;
            const x = startX + t * (endX - startX);
            const angle = t * Math.PI * 2 * scale;
            const y = midY + Math.sin(angle) * amplitude + direction * offset;
            points.push({ x, y });
        }
        return points;
    };

    [1, -1].forEach(direction => {
        const wave = createWavePoints(direction);
        const projected = builder.projectPoints(wave);
        builder.appendPath(projected, { geometry: inner });
    });
}

function createCirclePoints(center, radius, segments = 48) {
    const points = [];
    for (let i = 0; i <= segments; i++) {
        const angle = (i / segments) * Math.PI * 2;
        points.push({
            x: center.x + Math.cos(angle) * radius,
            y: center.y + Math.sin(angle) * radius
        });
    }
    return points;
}

function annotateSpacing(builder, svg, cell, spacing, anchorX) {
    if (!svg) {
        return;
    }
    const projected = builder.projectPoints([{
        x: anchorX,
        y: cell.y + cell.height / 2
    }])[0];
    const inset = Math.max(cell.width * 0.015, 1.5);
    const textX = projected.x + inset;
    const textY = projected.y;
    const text = document.createElementNS(SVG_NS, 'text');
    text.setAttribute('x', String(textX));
    text.setAttribute('y', String(textY));
    text.setAttribute('text-anchor', 'start');
    text.setAttribute('dominant-baseline', 'middle');
    text.setAttribute('font-size', '6');
    text.setAttribute('fill', '#666');
    text.textContent = `${spacing.toFixed(2)} mm`;
    svg.appendChild(text);
}

const calibrationControls = [
    {
        id: 'minSpacing',
        label: 'Minimum Spacing',
        target: 'drawingData.minSpacing',
        inputType: 'range',
        min: 0.1,
        max: 3,
        step: 0.05,
        default: 0.45,
        valueType: 'number',
        description: 'Smallest distance (in mm) between adjacent strokes on the test grid'
    },
    {
        id: 'maxSpacing',
        label: 'Maximum Spacing',
        target: 'drawingData.maxSpacing',
        inputType: 'range',
        min: 0.2,
        max: 6,
        step: 0.1,
        default: 3,
        valueType: 'number',
        description: 'Largest distance (in mm) shown on the calibration grid'
    },
    {
        id: 'samples',
        label: 'Spacing Samples',
        target: 'drawingData.samples',
        inputType: 'range',
        min: 2,
        max: 12,
        step: 1,
        default: 6,
        valueType: 'number',
        description: 'How many rows of spacing samples to generate (each row steps between min/max)'
    },
    {
        id: 'tilePadding',
        label: 'Tile Padding',
        target: 'drawingData.tilePadding',
        inputType: 'range',
        min: 0,
        max: 20,
        step: 0.5,
        default: 4,
        valueType: 'number',
        description: 'Gap between calibration tiles; increase for thick markers to avoid overlap'
    },
    {
        id: 'patternScale',
        label: 'Pattern Scale',
        target: 'drawingData.patternScale',
        inputType: 'range',
        min: 0.5,
        max: 3,
        step: 0.1,
        default: 1,
        valueType: 'number',
        description: 'Scales concentric rings and wave amplitudes to study bleed at different radii'
    }
];

const calibrationDefinition = attachControls(defineDrawing({
    id: 'calibration',
    name: 'Calibration Patterns',
    configClass: CalibrationConfig,
    drawFunction: drawCalibrationPatterns,
    presets: [
        {
            key: 'calibrationDefault',
            name: 'Paper/Medium Calibration Grid',
            params: {
                type: 'calibration',
                minSpacing: 0.45,
                maxSpacing: 3,
                samples: 6,
                tilePadding: 4,
                patternScale: 1,
                line: {
                    strokeWidth: 0.4
                },
                colorPalette: colorPalettes.sakuraPalette
            }
        }
    ]
}), calibrationControls);

export const calibrationDrawing = calibrationDefinition;
export default calibrationDefinition;
