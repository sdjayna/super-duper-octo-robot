import {
    defineDrawing,
    SizedDrawingConfig,
    createDrawingRuntime,
    colorPalettes
} from '../shared/kit.js';
import { attachControls } from '../shared/controlsUtils.js';
import { clampInteger, clampNumber } from '../shared/utils/paramMath.js';
import { generateContourPaths } from '../shared/utils/contourUtils.js';

const RDI_LIMITS = {
    feed: { min: 0.015, max: 0.06, default: 0.035 },
    kill: { min: 0.045, max: 0.08, default: 0.062 },
    diffusionU: { min: 0.1, max: 0.24, default: 0.16 },
    diffusionV: { min: 0.02, max: 0.14, default: 0.08 },
    steps: { min: 250, max: 900, default: 520 },
    resolution: { min: 180, max: 360, default: 260 },
    thresholdBase: { min: 0.1, max: 0.6, default: 0.22 },
    thresholdStep: { min: 0.02, max: 0.18, default: 0.07 },
    layerCount: { min: 1, max: 4, default: 3 },
    layerRotation: { min: 0, max: 0.6, default: 0.18 },
    seed: { min: 1, max: 9999, default: 404 }
};

class ReactionDiffusionIsosurfaceConfig extends SizedDrawingConfig {
    constructor(params = {}) {
        super({
            ...params,
            width: params.width ?? 360,
            height: params.height ?? 260
        });
        this.feed = clampNumber(params.feed, RDI_LIMITS.feed.min, RDI_LIMITS.feed.max, RDI_LIMITS.feed.default);
        this.kill = clampNumber(params.kill, RDI_LIMITS.kill.min, RDI_LIMITS.kill.max, RDI_LIMITS.kill.default);
        this.diffusionU = clampNumber(params.diffusionU, RDI_LIMITS.diffusionU.min, RDI_LIMITS.diffusionU.max, RDI_LIMITS.diffusionU.default);
        this.diffusionV = clampNumber(params.diffusionV, RDI_LIMITS.diffusionV.min, RDI_LIMITS.diffusionV.max, RDI_LIMITS.diffusionV.default);
        this.steps = clampInteger(params.steps, RDI_LIMITS.steps.min, RDI_LIMITS.steps.max, RDI_LIMITS.steps.default);
        this.resolution = clampInteger(params.resolution, RDI_LIMITS.resolution.min, RDI_LIMITS.resolution.max, RDI_LIMITS.resolution.default);
        this.thresholdBase = clampNumber(params.thresholdBase, RDI_LIMITS.thresholdBase.min, RDI_LIMITS.thresholdBase.max, RDI_LIMITS.thresholdBase.default);
        this.thresholdStep = clampNumber(params.thresholdStep, RDI_LIMITS.thresholdStep.min, RDI_LIMITS.thresholdStep.max, RDI_LIMITS.thresholdStep.default);
        this.layerCount = clampInteger(params.layerCount, RDI_LIMITS.layerCount.min, RDI_LIMITS.layerCount.max, RDI_LIMITS.layerCount.default);
        this.layerRotation = clampNumber(params.layerRotation, RDI_LIMITS.layerRotation.min, RDI_LIMITS.layerRotation.max, RDI_LIMITS.layerRotation.default);
        this.seed = clampInteger(params.seed, RDI_LIMITS.seed.min, RDI_LIMITS.seed.max, RDI_LIMITS.seed.default);
    }
}

function simulateGrayScott(config) {
    const size = config.resolution;
    const U = new Float32Array(size * size).fill(1);
    const V = new Float32Array(size * size);

    const perturbWidth = Math.floor(size * 0.08);
    for (let y = 0; y < size; y++) {
        for (let x = 0; x < size; x++) {
            const idx = y * size + x;
            const dx = x - size / 2;
            const dy = y - size / 2;
            const dist = Math.sqrt(dx * dx + dy * dy);
            const basePatch = dist < perturbWidth ? 1 : 0;
            const noise = seededNoise(x, y, config.seed);
            V[idx] = basePatch * 0.9 + noise * 0.1;
            U[idx] = 1 - V[idx];
        }
    }

    const laplacian = (array, x, y) => {
        const idx = y * size + x;
        let sum = -array[idx];
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

    return { V, size };
}

function seededNoise(x, y, seed) {
    return (Math.sin((x + seed * 13.13) * 12.9898 + (y + seed * 3.31) * 78.233) * 43758.5453) % 1;
}

function bilinearSample(simulation, gx, gy) {
    const size = simulation.size;
    const x0 = Math.floor(gx);
    const y0 = Math.floor(gy);
    const x1 = Math.min(x0 + 1, size - 1);
    const y1 = Math.min(y0 + 1, size - 1);
    const tx = gx - x0;
    const ty = gy - y0;

    const idx = (y, x) => y * size + x;
    const v00 = simulation.V[idx(y0, x0)];
    const v10 = simulation.V[idx(y0, x1)];
    const v01 = simulation.V[idx(y1, x0)];
    const v11 = simulation.V[idx(y1, x1)];

    const lerpX0 = v00 + (v10 - v00) * tx;
    const lerpX1 = v01 + (v11 - v01) * tx;
    return lerpX0 + (lerpX1 - lerpX0) * ty;
}

export function drawReactionDiffusionIsosurfaces(drawingConfig, renderContext) {
    const { svg, builder } = createDrawingRuntime({ drawingConfig, renderContext });
    const config = drawingConfig.drawingData;
    const simulation = simulateGrayScott(config);
    const width = renderContext.drawingWidth;
    const height = renderContext.drawingHeight;
    const centerX = width / 2;
    const centerY = height / 2;

    for (let layer = 0; layer < config.layerCount; layer++) {
        const angle = layer * config.layerRotation;
        const cosA = Math.cos(angle);
        const sinA = Math.sin(angle);
        const threshold = clampNumber(
            config.thresholdBase + layer * config.thresholdStep,
            RDI_LIMITS.thresholdBase.min,
            RDI_LIMITS.thresholdBase.max
        );

        const fieldFn = (x, y) => {
            const dx = x - centerX;
            const dy = y - centerY;
            const rx = dx * cosA - dy * sinA + centerX;
            const ry = dx * sinA + dy * cosA + centerY;
            const gx = (rx / width) * (simulation.size - 1);
            const gy = (ry / height) * (simulation.size - 1);
            return bilinearSample(simulation, gx, gy);
        };

        const paths = generateContourPaths({
            width,
            height,
            cols: Math.round(config.resolution * 0.9),
            fieldFn,
            thresholds: [threshold]
        });

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

const reactionDiffusionIsosurfaceControls = [
    {
        id: 'feed',
        label: 'Feed Rate',
        target: 'drawingData.feed',
        inputType: 'range',
        min: RDI_LIMITS.feed.min,
        max: RDI_LIMITS.feed.max,
        step: 0.001,
        default: RDI_LIMITS.feed.default,
        description: 'Feed (f) parameter controlling activator production'
    },
    {
        id: 'kill',
        label: 'Kill Rate',
        target: 'drawingData.kill',
        inputType: 'range',
        min: RDI_LIMITS.kill.min,
        max: RDI_LIMITS.kill.max,
        step: 0.001,
        default: RDI_LIMITS.kill.default,
        description: 'Kill (k) parameter balancing inhibitor removal'
    },
    {
        id: 'diffusionU',
        label: 'Diffusion U',
        target: 'drawingData.diffusionU',
        inputType: 'range',
        min: RDI_LIMITS.diffusionU.min,
        max: RDI_LIMITS.diffusionU.max,
        step: 0.01,
        default: RDI_LIMITS.diffusionU.default,
        description: 'Diffusion coefficient for U'
    },
    {
        id: 'diffusionV',
        label: 'Diffusion V',
        target: 'drawingData.diffusionV',
        inputType: 'range',
        min: RDI_LIMITS.diffusionV.min,
        max: RDI_LIMITS.diffusionV.max,
        step: 0.005,
        default: RDI_LIMITS.diffusionV.default,
        description: 'Diffusion coefficient for V'
    },
    {
        id: 'steps',
        label: 'Simulation Steps',
        target: 'drawingData.steps',
        inputType: 'range',
        min: RDI_LIMITS.steps.min,
        max: RDI_LIMITS.steps.max,
        step: 20,
        default: RDI_LIMITS.steps.default,
        description: 'Time steps before sampling iso-lines'
    },
    {
        id: 'resolution',
        label: 'Grid Resolution',
        target: 'drawingData.resolution',
        inputType: 'range',
        min: RDI_LIMITS.resolution.min,
        max: RDI_LIMITS.resolution.max,
        step: 10,
        default: RDI_LIMITS.resolution.default,
        description: 'Simulation grid size (A4→A1)'
    },
    {
        id: 'thresholdBase',
        label: 'Threshold Base',
        target: 'drawingData.thresholdBase',
        inputType: 'range',
        min: RDI_LIMITS.thresholdBase.min,
        max: RDI_LIMITS.thresholdBase.max,
        step: 0.01,
        default: RDI_LIMITS.thresholdBase.default,
        description: 'Starting iso-value for contours'
    },
    {
        id: 'thresholdStep',
        label: 'Threshold Step',
        target: 'drawingData.thresholdStep',
        inputType: 'range',
        min: RDI_LIMITS.thresholdStep.min,
        max: RDI_LIMITS.thresholdStep.max,
        step: 0.005,
        default: RDI_LIMITS.thresholdStep.default,
        description: 'Increment applied per layer'
    },
    {
        id: 'layerCount',
        label: 'Layer Count',
        target: 'drawingData.layerCount',
        inputType: 'range',
        min: RDI_LIMITS.layerCount.min,
        max: RDI_LIMITS.layerCount.max,
        step: 1,
        default: RDI_LIMITS.layerCount.default,
        description: 'Number of iso-layer sweeps'
    },
    {
        id: 'layerRotation',
        label: 'Layer Rotation',
        target: 'drawingData.layerRotation',
        inputType: 'range',
        min: RDI_LIMITS.layerRotation.min,
        max: RDI_LIMITS.layerRotation.max,
        step: 0.01,
        default: RDI_LIMITS.layerRotation.default,
        description: 'Rotation applied between threshold layers'
    },
    {
        id: 'seed',
        label: 'Seed',
        target: 'drawingData.seed',
        inputType: 'number',
        min: RDI_LIMITS.seed.min,
        max: RDI_LIMITS.seed.max,
        step: 1,
        default: RDI_LIMITS.seed.default,
        description: 'Seed controlling initial perturbations'
    }
];

const reactionDiffusionIsosurfaceDefinition = attachControls(defineDrawing({
    id: 'reactionDiffusionIsosurfaces',
    name: 'Reaction–Diffusion Isosurfaces',
    configClass: ReactionDiffusionIsosurfaceConfig,
    drawFunction: drawReactionDiffusionIsosurfaces,
    presets: [
        {
            key: 'reactionDiffusionContours',
            name: 'RD Contours',
            params: {
                type: 'reactionDiffusionIsosurfaces',
                width: 360,
                height: 260,
                feed: 0.034,
                kill: 0.061,
                diffusionU: 0.17,
                diffusionV: 0.082,
                steps: 540,
                resolution: 260,
                thresholdBase: 0.2,
                thresholdStep: 0.06,
                layerCount: 3,
                layerRotation: 0.18,
                seed: 512,
                line: { strokeWidth: 0.21 },
                colorPalette: colorPalettes.sakuraPalette
            }
        }
    ]
}), reactionDiffusionIsosurfaceControls);

export const reactionDiffusionIsosurfacesDrawing = reactionDiffusionIsosurfaceDefinition;
export default reactionDiffusionIsosurfaceDefinition;
