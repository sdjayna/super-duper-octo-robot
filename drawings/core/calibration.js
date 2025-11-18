import {
    defineDrawing,
    SizedDrawingConfig,
    createDrawingRuntime,
    colorPalettes,
    generateSingleSerpentineLine
} from '../shared/kit.js';
import { attachControls } from '../shared/controlsUtils.js';

const SVG_NS = 'http://www.w3.org/2000/svg';
const PATTERNS = [
    { key: 'parallel', label: 'Parallel Lines', draw: drawParallelLines },
    { key: 'concentric', label: 'Concentric Rings', draw: drawConcentricRings },
    { key: 'sine', label: 'Wave Bundle', draw: drawSineBundle },
    { key: 'arc', label: 'Arc Sweeps', draw: drawArcSweeps },
    { key: 'bezier', label: 'Bezier Ribbons', draw: drawBezierRibbons },
    { key: 'radial', label: 'Radial Fan', draw: drawRadialFan },
    { key: 'tessellation', label: 'Touching Polygons', draw: drawHexTessellation },
    { key: 'serpentinePoly', label: 'Serpentine Polygons', draw: drawSerpentinePolygons }
];

const DEFAULT_CAPABILITIES = {
    repeatability: 0.1,
    cautionSpacing: 0.2,
    microSpacing: 0.15
};

let activePlotterCapabilities = { ...DEFAULT_CAPABILITIES };

async function loadPlotterCapabilities() {
    if (typeof fetch !== 'function') {
        return;
    }
    try {
        const response = await fetch(`/config/plotters.json?v=${Date.now()}`);
        if (!response.ok) {
            throw new Error(`Failed to load plotter config (${response.status})`);
        }
        const data = await response.json();
        const defaultId = data.default;
        const plotter = data.plotters?.[defaultId];
        const specs = plotter?.specs || {};
        const repeatability = Number(specs.repeatability_mm) || DEFAULT_CAPABILITIES.repeatability;
        const cautionSpacing = Number(specs.cautionSpacing_mm) || repeatability * 2;
        const microSpacing = Number(specs.micro_spacing_mm) || repeatability * 1.5;
        activePlotterCapabilities = {
            repeatability,
            cautionSpacing,
            microSpacing
        };
    } catch (error) {
        console.warn('Unable to load plotter specs; using defaults', error);
        activePlotterCapabilities = { ...DEFAULT_CAPABILITIES };
    }
}

if (typeof fetch === 'function') {
    loadPlotterCapabilities();
}

function getPlotterCapabilities() {
    return activePlotterCapabilities;
}

function clampNumber(value, min, max) {
    if (!Number.isFinite(value)) {
        return min;
    }
    return Math.min(Math.max(value, min), max);
}

export class CalibrationConfig extends SizedDrawingConfig {
    constructor(params = {}) {
        const baseParams = { ...params };
        if (!Number.isFinite(baseParams.width)) {
            baseParams.width = Number(baseParams.paper?.width) || 420;
        }
        if (!Number.isFinite(baseParams.height)) {
            baseParams.height = Number(baseParams.paper?.height) || 297;
        }
        super(baseParams);
        this.minSpacing = clampNumber(params.minSpacing ?? 0.45, 0.05, 10);
        const resolvedMax = clampNumber(params.maxSpacing ?? 3, this.minSpacing, 15);
        this.maxSpacing = Math.max(resolvedMax, this.minSpacing);
        this.samples = Math.max(2, Math.floor(params.samples ?? 6));
        this.tilePadding = clampNumber(params.tilePadding ?? 4, 0, 40);
        this.patternScale = clampNumber(params.patternScale ?? 1, 0.5, 3);
    }

    getBounds({ paper, orientation } = {}) {
        if (!paper) {
            return super.getBounds({ paper, orientation });
        }
        const width = Number(paper.width);
        const height = Number(paper.height);
        if (!Number.isFinite(width) || !Number.isFinite(height)) {
            return super.getBounds({ paper, orientation });
        }
        const shorter = Math.min(width, height);
        const longer = Math.max(width, height);
        const isPortrait = orientation === 'portrait';
        return {
            minX: 0,
            minY: 0,
            width: isPortrait ? shorter : longer,
            height: isPortrait ? longer : shorter
        };
    }
}

export function drawCalibrationPatterns(drawingConfig, renderContext) {
    const calibration = drawingConfig.drawingData;
    const { svg, builder } = createDrawingRuntime({ drawingConfig, renderContext });
    const columnCount = PATTERNS.length;
    const spacingValues = buildSpacingValues(calibration);
    const rowCount = spacingValues.length;
    const padding = calibration.tilePadding;
    const labelWidth = Math.max(12, renderContext.drawingWidth * 0.035);
    const labelAnchorX = renderContext.drawingWidth - labelWidth + 2;
    const horizontalMargin = padding * (columnCount + 1) + labelWidth;
    const availableWidth = Math.max(renderContext.drawingWidth - horizontalMargin, 1);
    const availableHeight = Math.max(renderContext.drawingHeight - padding * (rowCount + 1), 1);
    const tileWidth = Math.max(availableWidth / columnCount, 1);
    const tileHeight = Math.max(availableHeight / rowCount, 1);

    for (let row = 0; row < rowCount; row++) {
        const spacing = spacingValues[row];
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

function buildSpacingValues(calibration) {
    const capabilities = getPlotterCapabilities();
    const microSpacing = capabilities.microSpacing;
    const values = [];
    if (microSpacing && calibration.minSpacing - microSpacing > 0.05) {
        values.push(microSpacing);
    }
    for (let row = 0; row < calibration.samples; row++) {
        values.push(computeSpacingValue(calibration, row, calibration.samples));
    }
    return values;
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

function drawSineBundle(builder, cell, spacing, scale) {
    const inner = innerCell(cell);
    const startX = inner.x;
    const endX = inner.x + inner.width;
    const midY = inner.y + inner.height / 2;
    const safeSpacing = Math.max(spacing, 0.05);
    const amplitude = Math.min(inner.height / 3, safeSpacing * 2 * scale);
    const sampleCount = 120;
    const offsets = [-1.5, -0.5, 0.5, 1.5].map(mult => mult * safeSpacing * 0.4);

    offsets.forEach(offset => {
        const wave = [];
        for (let i = 0; i <= sampleCount; i++) {
            const t = i / sampleCount;
            const x = startX + t * (endX - startX);
            const angle = t * Math.PI * 2 * scale;
            const y = midY + Math.sin(angle) * amplitude + offset;
            wave.push({ x, y });
        }
        const projected = builder.projectPoints(wave);
        builder.appendPath(projected, { geometry: inner });
    });
}

function drawArcSweeps(builder, cell, spacing, scale) {
    const inner = innerCell(cell);
    const center = {
        x: inner.x + inner.width / 2,
        y: inner.y + inner.height / 2
    };
    const safeSpacing = Math.max(spacing * 0.4, 0.05);
    const radiusBase = Math.min(inner.width, inner.height) / 2 - safeSpacing;
    const sweeps = [60, 120, 180];
    sweeps.forEach((sweep, index) => {
        const radius = Math.max(radiusBase - index * safeSpacing * 1.2, safeSpacing * 2);
        const start = -90 - index * 10;
        const arcPoints = createArcPoints(center, radius, start, start + sweep, Math.ceil(32 * scale));
        const projected = builder.projectPoints(arcPoints);
        builder.appendPath(projected, { geometry: inner });
    });
}

function drawBezierRibbons(builder, cell, spacing, scale) {
    const inner = innerCell(cell);
    const strokeGap = Math.max(spacing * 0.6, 0.2);
    const height = inner.height;
    const width = inner.width;
    const offsets = [-strokeGap, 0, strokeGap];

    offsets.forEach((offset, idx) => {
        const p0 = { x: inner.x, y: inner.y + height * (0.2 + idx * 0.3) };
        const p3 = { x: inner.x + width, y: inner.y + height * (0.8 - idx * 0.2) };
        const curvature = height * 0.4 * scale;
        const p1 = { x: p0.x + width * 0.33, y: p0.y - curvature + offset };
        const p2 = { x: p0.x + width * 0.66, y: p3.y + curvature - offset };
        const bezierPoints = sampleCubicBezier(p0, p1, p2, p3, 80);
        const projected = builder.projectPoints(bezierPoints);
        builder.appendPath(projected, { geometry: inner });
    });
}

function drawRadialFan(builder, cell, spacing, scale) {
    const inner = innerCell(cell);
    const center = {
        x: inner.x + inner.width * 0.2,
        y: inner.y + inner.height / 2
    };
    const normalizedScale = Number.isFinite(scale) ? Math.max(0.5, Math.min(scale, 3)) : 1;
    const radius = Math.min(inner.width * 0.75, inner.height / 1.1) * normalizedScale;
    const safeSpacing = Math.max(spacing / normalizedScale, 0.05);
    const angleIncrement = Math.max(5, safeSpacing * 3);
    for (let angle = -60; angle <= 60; angle += angleIncrement) {
        const rad = (angle * Math.PI) / 180;
        const endPoint = {
            x: center.x + Math.cos(rad) * radius,
            y: center.y + Math.sin(rad) * radius
        };
        const projected = builder.projectPoints([center, endPoint]);
        builder.appendPath(projected, { geometry: inner });
    }
}


function drawHexTessellation(builder, cell, spacing) {
    const inner = innerCell(cell);
    const contactGap = Math.max(spacing - 0.45, 0);
    const targetCols = Math.max(4, Math.floor(inner.width / 35));
    const targetRows = Math.max(3, Math.floor(inner.height / 30));
    const radiusFromWidth = (inner.width - contactGap) / (targetCols * 1.5 + 0.5);
    const radiusFromHeight = (inner.height - contactGap) / (targetRows * Math.sqrt(3));
    const radius = Math.max(Math.min(radiusFromWidth, radiusFromHeight), 1.5);
    const horizontalStride = radius * 1.5 + contactGap;
    const verticalStride = radius * Math.sqrt(3) + contactGap * 0.5;
    const yStart = inner.y + radius;
    const yEnd = inner.y + inner.height - radius;

    let rowIndex = 0;
    for (let cy = yStart; cy <= yEnd; cy += verticalStride) {
        const offset = (rowIndex % 2) * (horizontalStride / 2);
        const xStart = inner.x + radius + offset;
        const xEnd = inner.x + inner.width - radius;
        for (let cx = xStart; cx <= xEnd; cx += horizontalStride) {
            const hexPoints = createHexPoints({ x: cx, y: cy }, radius);
            const projected = builder.projectPoints([...hexPoints, hexPoints[0]]);
            builder.appendPath(projected, {
                geometry: {
                    x: cx - radius,
                    y: cy - radius,
                    width: radius * 2,
                    height: radius * 2
                }
            });
        }
        rowIndex++;
    }
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

function createHexPoints(center, radius) {
    const points = [];
    for (let i = 0; i < 6; i++) {
        const angle = Math.PI / 3 * i;
        points.push({
            x: center.x + Math.cos(angle) * radius,
            y: center.y + Math.sin(angle) * radius
        });
    }
    return points;
}

function createArcPoints(center, radius, startDeg, endDeg, segments = 48) {
    const points = [];
    const start = (startDeg * Math.PI) / 180;
    const end = (endDeg * Math.PI) / 180;
    const step = (end - start) / segments;
    for (let i = 0; i <= segments; i++) {
        const angle = start + step * i;
        points.push({
            x: center.x + Math.cos(angle) * radius,
            y: center.y + Math.sin(angle) * radius
        });
    }
    return points;
}

function sampleCubicBezier(p0, p1, p2, p3, samples = 60) {
    const points = [];
    for (let i = 0; i <= samples; i++) {
        const t = i / samples;
        const mt = 1 - t;
        const x = mt ** 3 * p0.x +
            3 * mt ** 2 * t * p1.x +
            3 * mt * t ** 2 * p2.x +
            t ** 3 * p3.x;
        const y = mt ** 3 * p0.y +
            3 * mt ** 2 * t * p1.y +
            3 * mt * t ** 2 * p2.y +
            t ** 3 * p3.y;
        points.push({ x, y });
    }
    return points;
}


function drawSerpentinePolygons(builder, cell, spacing) {
    const inner = innerCell(cell);
    const cols = Math.max(2, Math.floor(inner.width / 35));
    const rows = Math.max(2, Math.floor(inner.height / 35));
    const gridWidth = inner.width / cols;
    const gridHeight = inner.height / rows;
    const polygons = [
        [
            { x: 0.1, y: 0.1 },
            { x: 0.9, y: 0.1 },
            { x: 0.9, y: 0.9 },
            { x: 0.1, y: 0.9 }
        ],
        [
            { x: 0.2, y: 0.1 },
            { x: 0.8, y: 0.1 },
            { x: 0.9, y: 0.5 },
            { x: 0.8, y: 0.9 },
            { x: 0.2, y: 0.9 },
            { x: 0.1, y: 0.5 }
        ],
        [
            { x: 0.5, y: 0.1 },
            { x: 0.9, y: 0.5 },
            { x: 0.5, y: 0.9 },
            { x: 0.1, y: 0.5 }
        ]
    ];

    let index = 0;
    for (let row = 0; row < rows; row++) {
        for (let col = 0; col < cols; col++) {
            const template = polygons[index % polygons.length];
            const rect = {
                x: inner.x + col * gridWidth,
                y: inner.y + row * gridHeight,
                width: gridWidth,
                height: gridHeight
            };
            const bounds = polygonBounds(template);
            const scaleX = rect.width / (bounds.maxX - bounds.minX);
            const scaleY = rect.height / (bounds.maxY - bounds.minY);
            const scaledPoints = template.map(point => ({
                x: rect.x + (point.x - bounds.minX) * scaleX,
                y: rect.y + (point.y - bounds.minY) * scaleY
            }));
            const polygonPath = builder.projectPoints([...scaledPoints, scaledPoints[0]]);
            builder.appendPath(polygonPath, { geometry: rect });

            const hatchRect = insetRect(polygonBounds(scaledPoints), spacing * 0.1);
            const serpentine = generateSingleSerpentineLine(
                hatchRect,
                Math.max(spacing, 0.2),
                builder.context?.defaultStrokeWidth || 0.4
            );
            const clipped = clipPathToPolygon(serpentine, scaledPoints);
            if (clipped.length > 1) {
                const projected = builder.projectPoints(clipped);
                builder.appendPath(projected, { geometry: rect });
            }
            index++;
        }
    }
}

function polygonBounds(points) {
    const xs = points.map(p => p.x);
    const ys = points.map(p => p.y);
    return {
        minX: Math.min(...xs),
        maxX: Math.max(...xs),
        minY: Math.min(...ys),
        maxY: Math.max(...ys),
        width: Math.max(...xs) - Math.min(...xs),
        height: Math.max(...ys) - Math.min(...ys)
    };
}

function insetRect(bounds, inset) {
    const safeInset = Math.max(inset, 0);
    return {
        x: bounds.minX + safeInset,
        y: bounds.minY + safeInset,
        width: Math.max(bounds.width - safeInset * 2, 0.5),
        height: Math.max(bounds.height - safeInset * 2, 0.5)
    };
}

function clipPathToPolygon(points, polygon) {
    // Simple point filter: keep points inside polygon
    return points.filter(point => isPointInPolygon(point, polygon));
}

function isPointInPolygon(point, polygon) {
    let inside = false;
    for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
        const xi = polygon[i].x, yi = polygon[i].y;
        const xj = polygon[j].x, yj = polygon[j].y;
        const intersect = ((yi > point.y) !== (yj > point.y)) &&
            (point.x < (xj - xi) * (point.y - yi) / (yj - yi + 1e-9) + xi);
        if (intersect) inside = !inside;
    }
    return inside;
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
    const capability = describeSpacingCapability(spacing, getPlotterCapabilities());

    const text = document.createElementNS(SVG_NS, 'text');
    text.setAttribute('text-anchor', 'start');
    text.setAttribute('font-size', '6');
    text.setAttribute('fill', capability.color);

    const valueLine = document.createElementNS(SVG_NS, 'tspan');
    valueLine.setAttribute('x', String(textX));
    valueLine.setAttribute('y', String(textY));
    valueLine.setAttribute('dominant-baseline', 'middle');
    valueLine.textContent = `${spacing.toFixed(2)} mm`;
    text.appendChild(valueLine);

    if (capability.note) {
        const noteLine = document.createElementNS(SVG_NS, 'tspan');
        noteLine.setAttribute('x', String(textX));
        noteLine.setAttribute('dy', '6');
        noteLine.setAttribute('font-size', '4');
        noteLine.textContent = capability.note;
        text.appendChild(noteLine);
    }

    svg.appendChild(text);
}

function describeSpacingCapability(spacing, capabilities) {
    const repeatability = capabilities.repeatability || DEFAULT_CAPABILITIES.repeatability;
    if (spacing <= repeatability + 0.02) {
        return {
            note: `Below plotter repeatability (~${repeatability.toFixed(2)} mm)`,
            color: '#c0392b'
        };
    }
    if (spacing <= (capabilities.cautionSpacing || DEFAULT_CAPABILITIES.cautionSpacing)) {
        return {
            note: 'Watch for carriage drift; slow speeds',
            color: '#e67e22'
        };
    }
    if (spacing <= 0.5) {
        return {
            note: 'Ideal fineliner spacing',
            color: '#2c3e50'
        };
    }
    return {
        note: 'Safe for acrylic / paint fills',
        color: '#16a085'
    };
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
