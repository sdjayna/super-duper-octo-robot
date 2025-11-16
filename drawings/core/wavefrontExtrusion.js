import {
    defineDrawing,
    SizedDrawingConfig,
    createDrawingRuntime,
    colorPalettes,
    ensureColorReachableLimit
} from '../shared/kit.js';
import { attachControls } from '../shared/controlsUtils.js';
import { clampInteger, clampNumber } from '../shared/utils/paramMath.js';
import { fractalValueNoise2D } from '../shared/utils/noiseUtils.js';

const derivedLayerCountMax = ensureColorReachableLimit(3);

const WAVEFRONT_LIMITS = {
    baseFrequency: { min: 0.003, max: 0.012, default: 0.006 },
    samples: { min: 400, max: 1200, default: 720 },
    offsetStep: { min: 1, max: 6, default: 2 },
    offsetCount: { min: 2, max: 7, default: 4 },
    noise: { min: 0, max: 0.5, default: 0.18 },
    curvature: { min: 0.2, max: 1, default: 0.6 },
    layerCount: { min: 1, max: derivedLayerCountMax, default: 2 },
    layerNoiseShift: { min: 0, max: 0.3, default: 0.1 },
    seed: { min: 1, max: 9999, default: 918 }
};

class WavefrontExtrusionConfig extends SizedDrawingConfig {
    constructor(params = {}) {
        super({
            ...params,
            width: params.width ?? 360,
            height: params.height ?? 260
        });
        this.baseFrequency = clampNumber(params.baseFrequency, WAVEFRONT_LIMITS.baseFrequency.min, WAVEFRONT_LIMITS.baseFrequency.max, WAVEFRONT_LIMITS.baseFrequency.default);
        this.samples = clampInteger(params.samples, WAVEFRONT_LIMITS.samples.min, WAVEFRONT_LIMITS.samples.max, WAVEFRONT_LIMITS.samples.default);
        this.offsetStep = clampNumber(params.offsetStep, WAVEFRONT_LIMITS.offsetStep.min, WAVEFRONT_LIMITS.offsetStep.max, WAVEFRONT_LIMITS.offsetStep.default);
        this.offsetCount = clampInteger(params.offsetCount, WAVEFRONT_LIMITS.offsetCount.min, WAVEFRONT_LIMITS.offsetCount.max, WAVEFRONT_LIMITS.offsetCount.default);
        this.noise = clampNumber(params.noise, WAVEFRONT_LIMITS.noise.min, WAVEFRONT_LIMITS.noise.max, WAVEFRONT_LIMITS.noise.default);
        this.curvature = clampNumber(params.curvature, WAVEFRONT_LIMITS.curvature.min, WAVEFRONT_LIMITS.curvature.max, WAVEFRONT_LIMITS.curvature.default);
        this.layerCount = clampInteger(params.layerCount, WAVEFRONT_LIMITS.layerCount.min, WAVEFRONT_LIMITS.layerCount.max, WAVEFRONT_LIMITS.layerCount.default);
        this.layerNoiseShift = clampNumber(params.layerNoiseShift, WAVEFRONT_LIMITS.layerNoiseShift.min, WAVEFRONT_LIMITS.layerNoiseShift.max, WAVEFRONT_LIMITS.layerNoiseShift.default);
        this.seed = clampInteger(params.seed, WAVEFRONT_LIMITS.seed.min, WAVEFRONT_LIMITS.seed.max, WAVEFRONT_LIMITS.seed.default);
    }
}

function generateBaseCurve(config, width, height, layer) {
    const points = [];
    const radius = Math.min(width, height) * 0.3;
    const centerX = width / 2;
    const centerY = height / 2;
    const layerOffset = layer * config.layerNoiseShift;
    const oscillation = 2 + config.baseFrequency * 180;
    for (let i = 0; i <= config.samples; i++) {
        const t = (i / config.samples) * Math.PI * 2;
        const wave = Math.sin(t * (oscillation + layer * 0.4)) * 0.08;
        const noise = fractalValueNoise2D(Math.cos(t) * 2 + layerOffset, Math.sin(t) * 2 - layerOffset, {
            seed: config.seed + layer * 101,
            frequency: 1.8,
            octaves: 3,
            persistence: 0.55
        });
        const radiusVariation = 1 + wave + noise * config.noise;
        const r = radius * radiusVariation;
        points.push({
            x: centerX + Math.cos(t) * r,
            y: centerY + Math.sin(t) * r
        });
    }
    return points;
}

function offsetCurve(points, distance, config, width, height) {
    const centerX = width / 2;
    const centerY = height / 2;
    return points.map((point, idx) => {
        const prev = points[(idx - 1 + points.length) % points.length];
        const next = points[(idx + 1) % points.length];
        const normal = averageNormal(prev, point, next);
        const radial = normalizeVector({ x: point.x - centerX, y: point.y - centerY });
        const blended = {
            x: normal.x * config.curvature + radial.x * (1 - config.curvature),
            y: normal.y * config.curvature + radial.y * (1 - config.curvature)
        };
        const len = Math.hypot(blended.x, blended.y) || 1;
        blended.x /= len;
        blended.y /= len;
        return {
            x: point.x + blended.x * distance,
            y: point.y + blended.y * distance
        };
    });
}

function averageNormal(prev, point, next) {
    const dirPrev = normalizeVector({ x: point.x - prev.x, y: point.y - prev.y });
    const dirNext = normalizeVector({ x: next.x - point.x, y: next.y - point.y });
    const tangent = normalizeVector({ x: dirPrev.x + dirNext.x, y: dirPrev.y + dirNext.y });
    return { x: -tangent.y, y: tangent.x };
}

function normalizeVector(vec) {
    const length = Math.hypot(vec.x, vec.y);
    if (length === 0) {
        return { x: 0, y: 0 };
    }
    return { x: vec.x / length, y: vec.y / length };
}

export function drawWavefrontExtrusion(drawingConfig, renderContext) {
    const { svg, builder } = createDrawingRuntime({ drawingConfig, renderContext });
    const config = drawingConfig.drawingData;
    const width = renderContext.drawingWidth;
    const height = renderContext.drawingHeight;

    for (let layer = 0; layer < config.layerCount; layer++) {
        const baseCurve = generateBaseCurve(config, width, height, layer);
        builder.appendPath(builder.projectPoints(baseCurve), {
            geometry: {
                x: 0,
                y: 0,
                width,
                height
            }
        });
        for (let offsetIndex = 0; offsetIndex < config.offsetCount; offsetIndex++) {
            const distance = (offsetIndex + 1) * config.offsetStep;
            const offsetCurvePoints = offsetCurve(baseCurve, distance, config, width, height);
            builder.appendPath(builder.projectPoints(offsetCurvePoints), {
                geometry: {
                    x: 0,
                    y: 0,
                    width,
                    height
                }
            });
        }
    }

    return svg;
}

const wavefrontExtrusionControls = [
    {
        id: 'baseFrequency',
        label: 'Base Frequency',
        target: 'drawingData.baseFrequency',
        inputType: 'range',
        min: WAVEFRONT_LIMITS.baseFrequency.min,
        max: WAVEFRONT_LIMITS.baseFrequency.max,
        step: 0.0005,
        default: WAVEFRONT_LIMITS.baseFrequency.default,
        description: 'Controls undulation frequency of the base curve'
    },
    {
        id: 'samples',
        label: 'Samples',
        target: 'drawingData.samples',
        inputType: 'range',
        min: WAVEFRONT_LIMITS.samples.min,
        max: WAVEFRONT_LIMITS.samples.max,
        step: 20,
        default: WAVEFRONT_LIMITS.samples.default,
        description: 'Resolution of each wavefront'
    },
    {
        id: 'offsetStep',
        label: 'Offset Step (mm)',
        target: 'drawingData.offsetStep',
        inputType: 'range',
        min: WAVEFRONT_LIMITS.offsetStep.min,
        max: WAVEFRONT_LIMITS.offsetStep.max,
        step: 0.1,
        default: WAVEFRONT_LIMITS.offsetStep.default,
        description: 'Spacing between successive offsets'
    },
    {
        id: 'offsetCount',
        label: 'Offset Count',
        target: 'drawingData.offsetCount',
        inputType: 'range',
        min: WAVEFRONT_LIMITS.offsetCount.min,
        max: WAVEFRONT_LIMITS.offsetCount.max,
        step: 1,
        default: WAVEFRONT_LIMITS.offsetCount.default,
        description: 'Number of offset bands'
    },
    {
        id: 'noise',
        label: 'Noise Amount',
        target: 'drawingData.noise',
        inputType: 'range',
        min: WAVEFRONT_LIMITS.noise.min,
        max: WAVEFRONT_LIMITS.noise.max,
        step: 0.01,
        default: WAVEFRONT_LIMITS.noise.default,
        description: 'Noise applied to the base radius'
    },
    {
        id: 'curvature',
        label: 'Curvature Blend',
        target: 'drawingData.curvature',
        inputType: 'range',
        min: WAVEFRONT_LIMITS.curvature.min,
        max: WAVEFRONT_LIMITS.curvature.max,
        step: 0.02,
        default: WAVEFRONT_LIMITS.curvature.default,
        description: 'Blend between local normals and radial offsets'
    },
    {
        id: 'layerCount',
        label: 'Layer Count',
        target: 'drawingData.layerCount',
        inputType: 'range',
        min: WAVEFRONT_LIMITS.layerCount.min,
        max: WAVEFRONT_LIMITS.layerCount.max,
        step: 1,
        default: WAVEFRONT_LIMITS.layerCount.default,
        description: 'Number of extruded layers'
    },
    {
        id: 'layerNoiseShift',
        label: 'Layer Noise Shift',
        target: 'drawingData.layerNoiseShift',
        inputType: 'range',
        min: WAVEFRONT_LIMITS.layerNoiseShift.min,
        max: WAVEFRONT_LIMITS.layerNoiseShift.max,
        step: 0.01,
        default: WAVEFRONT_LIMITS.layerNoiseShift.default,
        description: 'Phase offset added between layers'
    },
    {
        id: 'seed',
        label: 'Seed',
        target: 'drawingData.seed',
        inputType: 'number',
        min: WAVEFRONT_LIMITS.seed.min,
        max: WAVEFRONT_LIMITS.seed.max,
        step: 1,
        default: WAVEFRONT_LIMITS.seed.default,
        description: 'Seed controlling noise field'
    }
];

const wavefrontExtrusionDefinition = attachControls(defineDrawing({
    id: 'wavefrontExtrusion',
    name: 'Wavefront Extrusion',
    configClass: WavefrontExtrusionConfig,
    drawFunction: drawWavefrontExtrusion,
    presets: [
        {
            key: 'wavefrontOffsets',
            name: 'Wavefront Offsets',
            params: {
                type: 'wavefrontExtrusion',
                width: 360,
                height: 260,
                baseFrequency: 0.006,
                samples: 720,
                offsetStep: 2,
                offsetCount: 4,
                noise: 0.2,
                curvature: 0.65,
                layerCount: 2,
                layerNoiseShift: 0.1,
                seed: 918,
                line: { strokeWidth: 0.22 },
                colorPalette: colorPalettes.sakuraPalette
            }
        }
    ]
}), wavefrontExtrusionControls);

export const wavefrontExtrusionDrawing = wavefrontExtrusionDefinition;
export default wavefrontExtrusionDefinition;
