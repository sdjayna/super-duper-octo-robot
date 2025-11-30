import {
    defineDrawing,
    SizedDrawingConfig,
    createDrawingRuntime,
    colorPalettes
} from '../shared/kit.js';
import { attachControls } from '../shared/controlsUtils.js';
import { clampInteger, clampNumber } from '../shared/utils/paramMath.js';

const TURING_LIMITS = {
    feed: { min: 0.02, max: 0.06, default: 0.04 },
    kill: { min: 0.05, max: 0.07, default: 0.065 },
    diffusionU: { min: 0.1, max: 0.3, default: 0.16 },
    diffusionV: { min: 0.04, max: 0.15, default: 0.08 },
    steps: { min: 200, max: 1500, default: 1000 },
    resolution: { min: 200, max: 600, default: 400 },
    threshold: { min: 0.15, max: 0.35, default: 0.22 }
};

class TuringConfig extends SizedDrawingConfig {
    constructor(params = {}) {
        super(params);
        this.feed = clampNumber(params.feed, TURING_LIMITS.feed.min, TURING_LIMITS.feed.max, TURING_LIMITS.feed.default);
        this.kill = clampNumber(params.kill, TURING_LIMITS.kill.min, TURING_LIMITS.kill.max, TURING_LIMITS.kill.default);
        this.diffusionU = clampNumber(params.diffusionU, TURING_LIMITS.diffusionU.min, TURING_LIMITS.diffusionU.max, TURING_LIMITS.diffusionU.default);
        this.diffusionV = clampNumber(params.diffusionV, TURING_LIMITS.diffusionV.min, TURING_LIMITS.diffusionV.max, TURING_LIMITS.diffusionV.default);
        this.steps = clampInteger(params.steps, TURING_LIMITS.steps.min, TURING_LIMITS.steps.max, TURING_LIMITS.steps.default);
        this.resolution = clampInteger(params.resolution, TURING_LIMITS.resolution.min, TURING_LIMITS.resolution.max, TURING_LIMITS.resolution.default);
        this.threshold = clampNumber(params.threshold, TURING_LIMITS.threshold.min, TURING_LIMITS.threshold.max, TURING_LIMITS.threshold.default);
    }
}

function runGrayScott(config) {
    const size = config.resolution;
    const U = new Float32Array(size * size).fill(1);
    const V = new Float32Array(size * size).fill(0);

    const seedStart = Math.floor(size * 0.4);
    const seedEnd = Math.floor(size * 0.6);
    for (let y = seedStart; y < seedEnd; y++) {
        for (let x = seedStart; x < seedEnd; x++) {
            const idx = y * size + x;
            V[idx] = 1;
            U[idx] = 0;
        }
    }

    const laplacian = (array, x, y) => {
        const idx = y * size + x;
        let sum = -array[idx] * 1;
        sum += array[y * size + ((x + 1 + size) % size)] * 0.2;
        sum += array[y * size + ((x - 1 + size) % size)] * 0.2;
        sum += array[((y + 1 + size) % size) * size + x] * 0.2;
        sum += array[((y - 1 + size) % size) * size + x] * 0.2;
        sum += array[((y + 1 + size) % size) * size + ((x + 1 + size) % size)] * 0.05;
        sum += array[((y + 1 + size) % size) * size + ((x - 1 + size) % size)] * 0.05;
        sum += array[((y - 1 + size) % size) * size + ((x + 1 + size) % size)] * 0.05;
        sum += array[((y - 1 + size) % size) * size + ((x - 1 + size) % size)] * 0.05;
        return sum;
    };

    for (let step = 0; step < config.steps; step++) {
        const nextU = new Float32Array(U.length);
        const nextV = new Float32Array(V.length);

        for (let y = 0; y < size; y++) {
            for (let x = 0; x < size; x++) {
                const idx = y * size + x;
                const u = U[idx];
                const v = V[idx];
                const uvv = u * v * v;
                nextU[idx] = u + (config.diffusionU * laplacian(U, x, y) - uvv + config.feed * (1 - u));
                nextV[idx] = v + (config.diffusionV * laplacian(V, x, y) + uvv - (config.kill + config.feed) * v);
            }
        }
        U.set(nextU);
        V.set(nextV);
    }

    return { U, V, size };
}

export function drawTuringPatterns(drawingConfig, renderContext) {
    const { svg, builder } = createDrawingRuntime({ drawingConfig, renderContext });
    const sim = runGrayScott(drawingConfig.drawingData);
    const threshold = drawingConfig.drawingData.threshold;
    const cellWidth = renderContext.drawingWidth / sim.size;
    const cellHeight = renderContext.drawingHeight / sim.size;
    const geometry = { x: 0, y: 0, width: renderContext.drawingWidth, height: renderContext.drawingHeight };

    for (let y = 0; y < sim.size; y++) {
        for (let x = 0; x < sim.size; x++) {
            const idx = y * sim.size + x;
            if (sim.V[idx] > threshold) {
                const rect = builder.projectRect({
                    x: x * cellWidth,
                    y: y * cellHeight,
                    width: cellWidth,
                    height: cellHeight
                });
                const pathPoints = [
                    { x: rect.x, y: rect.y },
                    { x: rect.x + rect.width, y: rect.y },
                    { x: rect.x + rect.width, y: rect.y + rect.height },
                    { x: rect.x, y: rect.y + rect.height },
                    { x: rect.x, y: rect.y }
                ];
                builder.appendPath(pathPoints, { geometry });
            }
        }
    }

    return svg;
}

const turingControls = [
    {
        id: 'feed',
        label: 'Feed Rate',
        target: 'drawingData.feed',
        inputType: 'range',
        min: TURING_LIMITS.feed.min,
        max: TURING_LIMITS.feed.max,
        step: 0.001,
        default: TURING_LIMITS.feed.default,
        description: 'Feed rate (f) in the Gray-Scott system'
    },
    {
        id: 'kill',
        label: 'Kill Rate',
        target: 'drawingData.kill',
        inputType: 'range',
        min: TURING_LIMITS.kill.min,
        max: TURING_LIMITS.kill.max,
        step: 0.001,
        default: TURING_LIMITS.kill.default,
        description: 'Kill rate (k) in the Gray-Scott system'
    },
    {
        id: 'diffusionU',
        label: 'Diffusion U',
        target: 'drawingData.diffusionU',
        inputType: 'range',
        min: TURING_LIMITS.diffusionU.min,
        max: TURING_LIMITS.diffusionU.max,
        step: 0.005,
        default: TURING_LIMITS.diffusionU.default,
        description: 'Diffusion rate for chemical U'
    },
    {
        id: 'diffusionV',
        label: 'Diffusion V',
        target: 'drawingData.diffusionV',
        inputType: 'range',
        min: TURING_LIMITS.diffusionV.min,
        max: TURING_LIMITS.diffusionV.max,
        step: 0.005,
        default: TURING_LIMITS.diffusionV.default,
        description: 'Diffusion rate for chemical V'
    },
    {
        id: 'steps',
        label: 'Time Steps',
        target: 'drawingData.steps',
        inputType: 'range',
        min: TURING_LIMITS.steps.min,
        max: TURING_LIMITS.steps.max,
        step: 50,
        default: TURING_LIMITS.steps.default,
        description: 'Number of simulation iterations'
    },
    {
        id: 'resolution',
        label: 'Grid Resolution',
        target: 'drawingData.resolution',
        inputType: 'range',
        min: TURING_LIMITS.resolution.min,
        max: TURING_LIMITS.resolution.max,
        step: 10,
        default: TURING_LIMITS.resolution.default,
        description: 'Simulation grid size (higher = more detail)'
    },
    {
        id: 'threshold',
        label: 'Activation Threshold',
        target: 'drawingData.threshold',
        inputType: 'range',
        min: TURING_LIMITS.threshold.min,
        max: TURING_LIMITS.threshold.max,
        step: 0.01,
        default: TURING_LIMITS.threshold.default,
        description: 'Level of chemical V required to draw a cell'
    }
];

const turingDefinition = attachControls(defineDrawing({
    id: 'turing',
    name: 'Turing Patterns',
    configClass: TuringConfig,
    drawFunction: drawTuringPatterns,
    presets: [
        {
            key: 'turingStripes',
            name: 'Turing Stripes',
            params: {
                type: 'turing',
                width: 260,
                height: 260,
                feed: 0.034,
                kill: 0.063,
                diffusionU: 0.16,
                diffusionV: 0.08,
                steps: 1000,
                resolution: 400,
                threshold: 0.22,
                line: {
                    strokeWidth: 0.2
                },
                colorPalette: colorPalettes.molotowPalette || colorPalettes.sakuraPalette
            }
        }
    ]
}), turingControls);

export const turingDrawing = turingDefinition;
export default turingDefinition;
