import {
    defineDrawing,
    SizedDrawingConfig,
    createDrawingRuntime,
    colorPalettes
} from '../shared/kit.js';
import { attachControls } from '../shared/controlsUtils.js';
import { clampInteger, clampNumber } from '../shared/utils/paramMath.js';
import { createSeededRandom } from '../shared/utils/noiseUtils.js';

const LACE_LIMITS = {
    gridDensity: { min: 10, max: 40, default: 22 },
    inversionRadius: { min: 20, max: 150, default: 70 },
    iterations: { min: 2, max: 7, default: 4 },
    jitter: { min: 0, max: 1.5, default: 0.35 },
    layerCount: { min: 1, max: 3, default: 2 },
    layerRadiusShift: { min: -0.3, max: 0.3, default: 0.08 },
    seed: { min: 1, max: 9999, default: 333 }
};

class FractalInversionLaceConfig extends SizedDrawingConfig {
    constructor(params = {}) {
        super({
            ...params,
            width: params.width ?? 360,
            height: params.height ?? 260
        });
        this.gridDensity = clampInteger(params.gridDensity, LACE_LIMITS.gridDensity.min, LACE_LIMITS.gridDensity.max, LACE_LIMITS.gridDensity.default);
        this.inversionRadius = clampNumber(params.inversionRadius, LACE_LIMITS.inversionRadius.min, LACE_LIMITS.inversionRadius.max, LACE_LIMITS.inversionRadius.default);
        this.iterations = clampInteger(params.iterations, LACE_LIMITS.iterations.min, LACE_LIMITS.iterations.max, LACE_LIMITS.iterations.default);
        this.jitter = clampNumber(params.jitter, LACE_LIMITS.jitter.min, LACE_LIMITS.jitter.max, LACE_LIMITS.jitter.default);
        this.layerCount = clampInteger(params.layerCount, LACE_LIMITS.layerCount.min, LACE_LIMITS.layerCount.max, LACE_LIMITS.layerCount.default);
        this.layerRadiusShift = clampNumber(params.layerRadiusShift, LACE_LIMITS.layerRadiusShift.min, LACE_LIMITS.layerRadiusShift.max, LACE_LIMITS.layerRadiusShift.default);
        this.seed = clampInteger(params.seed, LACE_LIMITS.seed.min, LACE_LIMITS.seed.max, LACE_LIMITS.seed.default);
    }
}

function buildCircleSet(config, width, height, layerIndex) {
    const layerScale = 1 + layerIndex * config.layerRadiusShift;
    const baseRadius = Math.max(config.inversionRadius * layerScale, 10);
    const cx = width / 2;
    const cy = height / 2;
    return [
        { cx, cy, radius: baseRadius },
        { cx: cx + baseRadius * 0.65, cy: cy - baseRadius * 0.25, radius: baseRadius * 0.82 },
        { cx: cx - baseRadius * 0.55, cy: cy + baseRadius * 0.3, radius: baseRadius * 0.9 }
    ];
}

function invertPoint(point, circle) {
    const dx = point.x - circle.cx;
    const dy = point.y - circle.cy;
    const distanceSq = dx * dx + dy * dy;
    if (distanceSq < 1e-6) {
        return { x: circle.cx + circle.radius, y: circle.cy };
    }
    const factor = (circle.radius * circle.radius) / distanceSq;
    return {
        x: circle.cx + dx * factor,
        y: circle.cy + dy * factor
    };
}

function generateLacePaths(config, width, height, layerIndex) {
    const columns = config.gridDensity;
    const rows = Math.max(10, Math.round(columns * (height / width)));
    const spacingX = width / columns;
    const spacingY = height / rows;
    const jitter = config.jitter;
    const circles = buildCircleSet(config, width, height, layerIndex);
    const rand = createSeededRandom(config.seed + layerIndex * 41);
    const paths = [];

    for (let row = 0; row <= rows; row++) {
        for (let col = 0; col <= columns; col++) {
            const start = {
                x: col * spacingX + (rand() - 0.5) * jitter,
                y: row * spacingY + (rand() - 0.5) * jitter
            };
            let current = start;
            const path = [current];
            for (let iter = 0; iter < config.iterations; iter++) {
                const circle = circles[(iter + col + row) % circles.length];
                current = invertPoint(current, circle);
                path.push({
                    x: current.x + (rand() - 0.5) * jitter * 0.5,
                    y: current.y + (rand() - 0.5) * jitter * 0.5
                });
            }
            if (path.length > 2) {
                paths.push(path);
            }
        }
    }
    return paths;
}

export function drawFractalInversionLace(drawingConfig, renderContext) {
    const { svg, builder } = createDrawingRuntime({ drawingConfig, renderContext });
    const config = drawingConfig.drawingData;
    const width = renderContext.drawingWidth;
    const height = renderContext.drawingHeight;

    for (let layer = 0; layer < config.layerCount; layer++) {
        const paths = generateLacePaths(config, width, height, layer);
        paths.forEach(path => {
            builder.appendPath(builder.projectPoints(path), {
                geometry: {
                    x: 0,
                    y: 0,
                    width,
                    height
                }
            });
        });
    }

    return svg;
}

const fractalInversionControls = [
    {
        id: 'gridDensity',
        label: 'Grid Density',
        target: 'drawingData.gridDensity',
        inputType: 'range',
        min: LACE_LIMITS.gridDensity.min,
        max: LACE_LIMITS.gridDensity.max,
        step: 1,
        default: LACE_LIMITS.gridDensity.default,
        description: 'Grid samples per short edge'
    },
    {
        id: 'inversionRadius',
        label: 'Inversion Radius (mm)',
        target: 'drawingData.inversionRadius',
        inputType: 'range',
        min: LACE_LIMITS.inversionRadius.min,
        max: LACE_LIMITS.inversionRadius.max,
        step: 1,
        default: LACE_LIMITS.inversionRadius.default,
        description: 'Primary circle radius guiding inversions'
    },
    {
        id: 'iterations',
        label: 'Iterations',
        target: 'drawingData.iterations',
        inputType: 'range',
        min: LACE_LIMITS.iterations.min,
        max: LACE_LIMITS.iterations.max,
        step: 1,
        default: LACE_LIMITS.iterations.default,
        description: 'How many inversion steps to keep'
    },
    {
        id: 'jitter',
        label: 'Jitter',
        target: 'drawingData.jitter',
        inputType: 'range',
        min: LACE_LIMITS.jitter.min,
        max: LACE_LIMITS.jitter.max,
        step: 0.01,
        default: LACE_LIMITS.jitter.default,
        description: 'Random offsets to keep lace organic'
    },
    {
        id: 'layerCount',
        label: 'Layer Count',
        target: 'drawingData.layerCount',
        inputType: 'range',
        min: LACE_LIMITS.layerCount.min,
        max: LACE_LIMITS.layerCount.max,
        step: 1,
        default: LACE_LIMITS.layerCount.default,
        description: 'Number of stacked inversion passes'
    },
    {
        id: 'layerRadiusShift',
        label: 'Radius Shift / Layer',
        target: 'drawingData.layerRadiusShift',
        inputType: 'range',
        min: LACE_LIMITS.layerRadiusShift.min,
        max: LACE_LIMITS.layerRadiusShift.max,
        step: 0.01,
        default: LACE_LIMITS.layerRadiusShift.default,
        description: 'Percent change to inversion radius per layer'
    },
    {
        id: 'seed',
        label: 'Seed',
        target: 'drawingData.seed',
        inputType: 'number',
        min: LACE_LIMITS.seed.min,
        max: LACE_LIMITS.seed.max,
        step: 1,
        default: LACE_LIMITS.seed.default,
        description: 'Seed controlling jitter placement'
    }
];

const fractalInversionDefinition = attachControls(defineDrawing({
    id: 'fractalInversionLace',
    name: 'Fractal Inversion Lace',
    configClass: FractalInversionLaceConfig,
    drawFunction: drawFractalInversionLace,
    presets: [
        {
            key: 'inversionLace',
            name: 'Inversion Lace',
            params: {
                type: 'fractalInversionLace',
                width: 360,
                height: 260,
                gridDensity: 22,
                inversionRadius: 75,
                iterations: 4,
                jitter: 0.35,
                layerCount: 2,
                layerRadiusShift: 0.1,
                seed: 441,
                line: { strokeWidth: 0.2 },
                colorPalette: colorPalettes.sakuraPalette
            }
        }
    ]
}), fractalInversionControls);

export const fractalInversionLaceDrawing = fractalInversionDefinition;
export default fractalInversionDefinition;
