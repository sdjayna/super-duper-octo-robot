import {
    defineDrawing,
    SizedDrawingConfig,
    createDrawingRuntime,
    colorPalettes
} from '../shared/kit.js';
import { attachControls } from '../shared/controlsUtils.js';
import { clampInteger, clampNumber } from '../shared/utils/paramMath.js';
import { createSeededRandom, fractalValueNoise2D } from '../shared/utils/noiseUtils.js';

const WALKER_LIMITS = {
    walkerCount: { min: 600, max: 2500, default: 1400 },
    stepSize: { min: 0.4, max: 2, default: 1 },
    stepsPerWalker: { min: 120, max: 320, default: 220 },
    curvatureLimit: { min: 0.2, max: 1.2, default: 0.6 },
    fieldFrequency: { min: 0.004, max: 0.018, default: 0.01 },
    thresholdDrift: { min: 0, max: 0.5, default: 0.15 },
    jitter: { min: 0, max: 0.4, default: 0.08 },
    layerCount: { min: 1, max: 4, default: 3 },
    seed: { min: 1, max: 9999, default: 602 }
};

class ImplicitLineWalkersConfig extends SizedDrawingConfig {
    constructor(params = {}) {
        super({
            ...params,
            width: params.width ?? 380,
            height: params.height ?? 260
        });
        this.walkerCount = clampInteger(params.walkerCount, WALKER_LIMITS.walkerCount.min, WALKER_LIMITS.walkerCount.max, WALKER_LIMITS.walkerCount.default);
        this.stepSize = clampNumber(params.stepSize, WALKER_LIMITS.stepSize.min, WALKER_LIMITS.stepSize.max, WALKER_LIMITS.stepSize.default);
        this.stepsPerWalker = clampInteger(params.stepsPerWalker, WALKER_LIMITS.stepsPerWalker.min, WALKER_LIMITS.stepsPerWalker.max, WALKER_LIMITS.stepsPerWalker.default);
        this.curvatureLimit = clampNumber(params.curvatureLimit, WALKER_LIMITS.curvatureLimit.min, WALKER_LIMITS.curvatureLimit.max, WALKER_LIMITS.curvatureLimit.default);
        this.fieldFrequency = clampNumber(params.fieldFrequency, WALKER_LIMITS.fieldFrequency.min, WALKER_LIMITS.fieldFrequency.max, WALKER_LIMITS.fieldFrequency.default);
        this.thresholdDrift = clampNumber(params.thresholdDrift, WALKER_LIMITS.thresholdDrift.min, WALKER_LIMITS.thresholdDrift.max, WALKER_LIMITS.thresholdDrift.default);
        this.jitter = clampNumber(params.jitter, WALKER_LIMITS.jitter.min, WALKER_LIMITS.jitter.max, WALKER_LIMITS.jitter.default);
        this.layerCount = clampInteger(params.layerCount, WALKER_LIMITS.layerCount.min, WALKER_LIMITS.layerCount.max, WALKER_LIMITS.layerCount.default);
        this.seed = clampInteger(params.seed, WALKER_LIMITS.seed.min, WALKER_LIMITS.seed.max, WALKER_LIMITS.seed.default);
    }
}

function fieldValue(x, y, config) {
    const freq = config.fieldFrequency;
    const sinTerm = Math.sin((x * freq * 1.3) + config.seed * 0.1);
    const cosTerm = Math.cos((y * freq * 1.8) - config.seed * 0.2);
    const noise = fractalValueNoise2D(x * freq, y * freq, {
        seed: config.seed * 3.17,
        frequency: 1.4,
        octaves: 3,
        persistence: 0.6
    });
    return (sinTerm + cosTerm) * 0.5 + noise * 0.6;
}

function gradient(x, y, config) {
    const eps = config.stepSize * 0.5;
    const fx = (fieldValue(x + eps, y, config) - fieldValue(x - eps, y, config)) / (2 * eps);
    const fy = (fieldValue(x, y + eps, config) - fieldValue(x, y - eps, config)) / (2 * eps);
    return { x: fx, y: fy };
}

function traceWalker({ startX, startY, targetValue, config, rng, width, height }) {
    const path = [];
    let x = startX;
    let y = startY;
    let prevDir = null;

    for (let step = 0; step < config.stepsPerWalker; step++) {
        if (x < -width * 0.05 || x > width * 1.05 || y < -height * 0.05 || y > height * 1.05) {
            break;
        }
        const grad = gradient(x, y, config);
        let tangent = { x: -grad.y, y: grad.x };
        const mag = Math.hypot(tangent.x, tangent.y);
        if (mag < 1e-5) {
            break;
        }
        tangent.x /= mag;
        tangent.y /= mag;

        const forward = {
            x: x + tangent.x * config.stepSize,
            y: y + tangent.y * config.stepSize
        };
        const backward = {
            x: x - tangent.x * config.stepSize,
            y: y - tangent.y * config.stepSize
        };

        const forwardDiff = Math.abs(fieldValue(forward.x, forward.y, config) - targetValue);
        const backwardDiff = Math.abs(fieldValue(backward.x, backward.y, config) - targetValue);
        if (backwardDiff < forwardDiff) {
            tangent.x *= -1;
            tangent.y *= -1;
        }

        if (prevDir) {
            tangent.x = prevDir.x * (1 - config.curvatureLimit) + tangent.x * config.curvatureLimit;
            tangent.y = prevDir.y * (1 - config.curvatureLimit) + tangent.y * config.curvatureLimit;
            const len = Math.hypot(tangent.x, tangent.y);
            tangent.x /= len;
            tangent.y /= len;
        }
        prevDir = { ...tangent };

        x += tangent.x * config.stepSize + (rng() - 0.5) * config.jitter;
        y += tangent.y * config.stepSize + (rng() - 0.5) * config.jitter;

        const delta = fieldValue(x, y, config) - targetValue;
        x -= grad.x * delta * 0.2;
        y -= grad.y * delta * 0.2;

        path.push({ x, y });

        if (path.length > 2 && Math.hypot(path[path.length - 1].x - path[path.length - 2].x, path[path.length - 1].y - path[path.length - 2].y) < 0.01) {
            break;
        }
    }
    return path;
}

export function drawImplicitLineWalkers(drawingConfig, renderContext) {
    const { svg, builder } = createDrawingRuntime({ drawingConfig, renderContext });
    const config = drawingConfig.drawingData;
    const width = renderContext.drawingWidth;
    const height = renderContext.drawingHeight;

    for (let layer = 0; layer < config.layerCount; layer++) {
        const layerSeed = config.seed + layer * 211;
        const rng = createSeededRandom(layerSeed);
        const layerShift = (layer - (config.layerCount - 1) / 2) * config.thresholdDrift;
        for (let i = 0; i < config.walkerCount; i++) {
            const startX = rng() * width;
            const startY = rng() * height;
            const baseValue = fieldValue(startX, startY, config);
            const target = baseValue + layerShift;
            const path = traceWalker({
                startX,
                startY,
                targetValue: target,
                config,
                rng,
                width,
                height
            });
            if (path.length > 2) {
                builder.appendPath(builder.projectPoints(path), {
                    geometry: {
                        x: startX,
                        y: startY,
                        width: config.stepSize * config.stepsPerWalker,
                        height: config.stepSize * config.stepsPerWalker
                    }
                });
            }
        }
    }

    return svg;
}

const implicitWalkerControls = [
    {
        id: 'walkerCount',
        label: 'Walker Count',
        target: 'drawingData.walkerCount',
        inputType: 'range',
        min: WALKER_LIMITS.walkerCount.min,
        max: WALKER_LIMITS.walkerCount.max,
        step: 50,
        default: WALKER_LIMITS.walkerCount.default,
        description: 'Number of walkers launched per layer'
    },
    {
        id: 'stepSize',
        label: 'Step Size (mm)',
        target: 'drawingData.stepSize',
        inputType: 'range',
        min: WALKER_LIMITS.stepSize.min,
        max: WALKER_LIMITS.stepSize.max,
        step: 0.05,
        default: WALKER_LIMITS.stepSize.default,
        description: 'Walker step length'
    },
    {
        id: 'stepsPerWalker',
        label: 'Steps Per Walker',
        target: 'drawingData.stepsPerWalker',
        inputType: 'range',
        min: WALKER_LIMITS.stepsPerWalker.min,
        max: WALKER_LIMITS.stepsPerWalker.max,
        step: 10,
        default: WALKER_LIMITS.stepsPerWalker.default,
        description: 'How long each path runs before termination'
    },
    {
        id: 'curvatureLimit',
        label: 'Curvature Limit',
        target: 'drawingData.curvatureLimit',
        inputType: 'range',
        min: WALKER_LIMITS.curvatureLimit.min,
        max: WALKER_LIMITS.curvatureLimit.max,
        step: 0.05,
        default: WALKER_LIMITS.curvatureLimit.default,
        description: 'Weight applied to turning toward gradients'
    },
    {
        id: 'fieldFrequency',
        label: 'Field Frequency',
        target: 'drawingData.fieldFrequency',
        inputType: 'range',
        min: WALKER_LIMITS.fieldFrequency.min,
        max: WALKER_LIMITS.fieldFrequency.max,
        step: 0.0005,
        default: WALKER_LIMITS.fieldFrequency.default,
        description: 'Controls oscillation rate of the implicit field'
    },
    {
        id: 'thresholdDrift',
        label: 'Threshold Drift',
        target: 'drawingData.thresholdDrift',
        inputType: 'range',
        min: WALKER_LIMITS.thresholdDrift.min,
        max: WALKER_LIMITS.thresholdDrift.max,
        step: 0.01,
        default: WALKER_LIMITS.thresholdDrift.default,
        description: 'Difference applied to each layer\'s target value'
    },
    {
        id: 'jitter',
        label: 'Jitter',
        target: 'drawingData.jitter',
        inputType: 'range',
        min: WALKER_LIMITS.jitter.min,
        max: WALKER_LIMITS.jitter.max,
        step: 0.005,
        default: WALKER_LIMITS.jitter.default,
        description: 'Random displacement added per step'
    },
    {
        id: 'layerCount',
        label: 'Layer Count',
        target: 'drawingData.layerCount',
        inputType: 'range',
        min: WALKER_LIMITS.layerCount.min,
        max: WALKER_LIMITS.layerCount.max,
        step: 1,
        default: WALKER_LIMITS.layerCount.default,
        description: 'Number of walker layers seeded'
    },
    {
        id: 'seed',
        label: 'Seed',
        target: 'drawingData.seed',
        inputType: 'number',
        min: WALKER_LIMITS.seed.min,
        max: WALKER_LIMITS.seed.max,
        step: 1,
        default: WALKER_LIMITS.seed.default,
        description: 'Seed controlling walker placement'
    }
];

const implicitLineWalkerDefinition = attachControls(defineDrawing({
    id: 'implicitLineWalkers',
    name: 'Implicit Line-Walkers',
    configClass: ImplicitLineWalkersConfig,
    drawFunction: drawImplicitLineWalkers,
    presets: [
        {
            key: 'implicitWalkers',
            name: 'Implicit Walkers',
            params: {
                type: 'implicitLineWalkers',
                width: 380,
                height: 260,
                walkerCount: 1300,
                stepSize: 0.9,
                stepsPerWalker: 220,
                curvatureLimit: 0.55,
                fieldFrequency: 0.011,
                thresholdDrift: 0.12,
                jitter: 0.08,
                layerCount: 3,
                seed: 512,
                line: { strokeWidth: 0.18 },
                colorPalette: colorPalettes.sakuraPalette
            }
        }
    ]
}), implicitWalkerControls);

export const implicitLineWalkersDrawing = implicitLineWalkerDefinition;
export default implicitLineWalkerDefinition;
