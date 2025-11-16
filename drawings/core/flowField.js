import {
    defineDrawing,
    SizedDrawingConfig,
    createDrawingRuntime,
    colorPalettes
} from '../shared/kit.js';
import { attachControls } from '../shared/controlsUtils.js';
import { clampInteger, clampNumber } from '../shared/utils/paramMath.js';

const FLOW_LIMITS = {
    noiseScale: { min: 0.01, max: 0.04, default: 0.02 },
    stepLength: { min: 1, max: 2, default: 1.5 },
    particleCount: { min: 2000, max: 6000, default: 4000 },
    steps: { min: 200, max: 800, default: 450 },
    lineJitter: { min: 0, max: 0.5, default: 0.15 },
    noiseSeed: { min: 1, max: 9999, default: 321 }
};

class FlowFieldConfig extends SizedDrawingConfig {
    constructor(params = {}) {
        super(params);
        this.noiseScale = clampNumber(params.noiseScale, FLOW_LIMITS.noiseScale.min, FLOW_LIMITS.noiseScale.max, FLOW_LIMITS.noiseScale.default);
        this.noiseSeed = clampInteger(params.noiseSeed, FLOW_LIMITS.noiseSeed.min, FLOW_LIMITS.noiseSeed.max, FLOW_LIMITS.noiseSeed.default);
        this.stepLength = clampNumber(params.stepLength, FLOW_LIMITS.stepLength.min, FLOW_LIMITS.stepLength.max, FLOW_LIMITS.stepLength.default);
        this.particleCount = clampInteger(params.particleCount, FLOW_LIMITS.particleCount.min, FLOW_LIMITS.particleCount.max, FLOW_LIMITS.particleCount.default);
        this.steps = clampInteger(params.steps, FLOW_LIMITS.steps.min, FLOW_LIMITS.steps.max, FLOW_LIMITS.steps.default);
        this.lineJitter = clampNumber(params.lineJitter, FLOW_LIMITS.lineJitter.min, FLOW_LIMITS.lineJitter.max, FLOW_LIMITS.lineJitter.default);
    }
}

function pseudoNoise(x, y, seed) {
    return Math.sin((x * 12.9898 + y * 78.233 + seed * 43758.5453)) * 43758.5453 % 1;
}

function flowVector(x, y, config) {
    const angle = pseudoNoise(x * config.noiseScale, y * config.noiseScale, config.noiseSeed) * Math.PI * 2;
    return { x: Math.cos(angle), y: Math.sin(angle) };
}

export function drawFlowField(drawingConfig, renderContext) {
    const { svg, builder } = createDrawingRuntime({ drawingConfig, renderContext });
    const config = drawingConfig.drawingData;
    const rand = pseudoRandom(config.noiseSeed);

    for (let i = 0; i < config.particleCount; i++) {
        let x = rand() * renderContext.drawingWidth;
        let y = rand() * renderContext.drawingHeight;
        const path = [];

        for (let step = 0; step < config.steps; step++) {
            path.push({ x, y });
            const vec = flowVector(x, y, config);
            x += vec.x * config.stepLength + config.lineJitter * (rand() - 0.5);
            y += vec.y * config.stepLength + config.lineJitter * (rand() - 0.5);
            if (x < 0 || x > renderContext.drawingWidth || y < 0 || y > renderContext.drawingHeight) {
                break;
            }
        }

        if (path.length > 1) {
            builder.appendPath(builder.projectPoints(path), {
                geometry: {
                    x: 0,
                    y: 0,
                    width: renderContext.drawingWidth,
                    height: renderContext.drawingHeight
                }
            });
        }
    }

    return svg;
}

function pseudoRandom(seed) {
    let state = seed % 2147483647;
    return () => {
        state = (state * 16807) % 2147483647;
        return (state - 1) / 2147483646;
    };
}

const flowFieldControls = [
    {
        id: 'noiseScale',
        label: 'Noise Scale',
        target: 'drawingData.noiseScale',
        inputType: 'range',
        min: FLOW_LIMITS.noiseScale.min,
        max: FLOW_LIMITS.noiseScale.max,
        step: 0.001,
        default: FLOW_LIMITS.noiseScale.default,
        description: 'Frequency of the vector field noise'
    },
    {
        id: 'stepLength',
        label: 'Step Length',
        target: 'drawingData.stepLength',
        inputType: 'range',
        min: FLOW_LIMITS.stepLength.min,
        max: FLOW_LIMITS.stepLength.max,
        step: 0.05,
        default: FLOW_LIMITS.stepLength.default,
        description: 'Distance each particle travels per integration step'
    },
    {
        id: 'particleCount',
        label: 'Particle Count',
        target: 'drawingData.particleCount',
        inputType: 'range',
        min: FLOW_LIMITS.particleCount.min,
        max: FLOW_LIMITS.particleCount.max,
        step: 100,
        default: FLOW_LIMITS.particleCount.default,
        description: 'Number of streamlines to trace'
    },
    {
        id: 'steps',
        label: 'Steps Per Particle',
        target: 'drawingData.steps',
        inputType: 'range',
        min: FLOW_LIMITS.steps.min,
        max: FLOW_LIMITS.steps.max,
        step: 10,
        default: FLOW_LIMITS.steps.default,
        description: 'Maximum integration steps per particle'
    },
    {
        id: 'lineJitter',
        label: 'Line Jitter',
        target: 'drawingData.lineJitter',
        inputType: 'range',
        min: FLOW_LIMITS.lineJitter.min,
        max: FLOW_LIMITS.lineJitter.max,
        step: 0.01,
        default: FLOW_LIMITS.lineJitter.default,
        description: 'Randomness added each step for organic variation'
    },
    {
        id: 'noiseSeed',
        label: 'Noise Seed',
        target: 'drawingData.noiseSeed',
        inputType: 'number',
        min: FLOW_LIMITS.noiseSeed.min,
        max: FLOW_LIMITS.noiseSeed.max,
        step: 1,
        default: FLOW_LIMITS.noiseSeed.default,
        description: 'Random seed controlling flow variation'
    }
];

const flowFieldDefinition = attachControls(defineDrawing({
    id: 'flowField',
    name: 'Flow Field',
    configClass: FlowFieldConfig,
    drawFunction: drawFlowField,
    presets: [
        {
            key: 'flowFieldCurves',
            name: 'Noise Streamlines',
            params: {
                type: 'flowField',
                width: 260,
                height: 180,
                noiseScale: 0.015,
                stepLength: 1.8,
                particleCount: 3200,
                steps: 420,
                lineJitter: 0.18,
                noiseSeed: 321,
                line: {
                    strokeWidth: 0.2
                },
                colorPalette: colorPalettes.sakuraPalette
            }
        }
    ]
}), flowFieldControls);

export const flowFieldDrawing = flowFieldDefinition;
export default flowFieldDefinition;
