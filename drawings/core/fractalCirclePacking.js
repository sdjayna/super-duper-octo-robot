import {
    defineDrawing,
    SizedDrawingConfig,
    createDrawingRuntime,
    colorPalettes
} from '../shared/kit.js';
import { attachControls } from '../shared/controlsUtils.js';
import { clampInteger, clampNumber } from '../shared/utils/paramMath.js';
import { createSeededRandom, fractalValueNoise2D } from '../shared/utils/noiseUtils.js';

const FDCP_LIMITS = {
    minRadius: { min: 3, max: 20, default: 5 },
    maxRadius: { min: 8, max: 30, default: 16 },
    circleCount: { min: 200, max: 700, default: 380 },
    threshold: { min: 0.3, max: 0.7, default: 0.45 },
    thresholdStep: { min: 0, max: 0.2, default: 0.05 },
    fieldFrequency: { min: 0.004, max: 0.02, default: 0.01 },
    attemptMultiplier: { min: 2, max: 6, default: 4 },
    layerCount: { min: 1, max: 3, default: 2 },
    seed: { min: 1, max: 9999, default: 515 }
};

class FractalCirclePackingConfig extends SizedDrawingConfig {
    constructor(params = {}) {
        super({
            ...params,
            width: params.width ?? 360,
            height: params.height ?? 260
        });
        this.minRadius = clampNumber(params.minRadius, FDCP_LIMITS.minRadius.min, FDCP_LIMITS.minRadius.max, FDCP_LIMITS.minRadius.default);
        this.maxRadius = clampNumber(params.maxRadius, FDCP_LIMITS.maxRadius.min, FDCP_LIMITS.maxRadius.max, FDCP_LIMITS.maxRadius.default);
        if (this.maxRadius <= this.minRadius) {
            this.maxRadius = this.minRadius + 1;
        }
        this.circleCount = clampInteger(params.circleCount, FDCP_LIMITS.circleCount.min, FDCP_LIMITS.circleCount.max, FDCP_LIMITS.circleCount.default);
        this.threshold = clampNumber(params.threshold, FDCP_LIMITS.threshold.min, FDCP_LIMITS.threshold.max, FDCP_LIMITS.threshold.default);
        this.thresholdStep = clampNumber(params.thresholdStep, FDCP_LIMITS.thresholdStep.min, FDCP_LIMITS.thresholdStep.max, FDCP_LIMITS.thresholdStep.default);
        this.fieldFrequency = clampNumber(params.fieldFrequency, FDCP_LIMITS.fieldFrequency.min, FDCP_LIMITS.fieldFrequency.max, FDCP_LIMITS.fieldFrequency.default);
        this.attemptMultiplier = clampInteger(params.attemptMultiplier, FDCP_LIMITS.attemptMultiplier.min, FDCP_LIMITS.attemptMultiplier.max, FDCP_LIMITS.attemptMultiplier.default);
        this.layerCount = clampInteger(params.layerCount, FDCP_LIMITS.layerCount.min, FDCP_LIMITS.layerCount.max, FDCP_LIMITS.layerCount.default);
        this.seed = clampInteger(params.seed, FDCP_LIMITS.seed.min, FDCP_LIMITS.seed.max, FDCP_LIMITS.seed.default);
    }
}

function isValidCircle(existing, x, y, radius, spacing = 1.02) {
    for (let i = 0; i < existing.length; i++) {
        const circle = existing[i];
        const dist = Math.hypot(circle.x - x, circle.y - y);
        if (dist < (circle.radius + radius) * spacing) {
            return false;
        }
    }
    return true;
}

function buildCircles(config, width, height) {
    const allCircles = [];
    const rand = createSeededRandom(config.seed);
    const totalAttempts = config.circleCount * config.attemptMultiplier;

    for (let layer = 0; layer < config.layerCount; layer++) {
        const layerThreshold = clampNumber(
            config.threshold + layer * config.thresholdStep,
            FDCP_LIMITS.threshold.min,
            FDCP_LIMITS.threshold.max
        );
        const layerMax = Math.max(config.minRadius + 1, config.maxRadius * (1 - layer * 0.15));
        const layerMin = Math.max(2, config.minRadius * (1 - layer * 0.1));
        let accepted = 0;
        for (let attempt = 0; attempt < totalAttempts && accepted < config.circleCount; attempt++) {
            const radius = layerMin + Math.pow(rand(), 2) * (layerMax - layerMin);
            const x = radius + rand() * (width - radius * 2);
            const y = radius + rand() * (height - radius * 2);
            const field = fractalValueNoise2D(x * config.fieldFrequency, y * config.fieldFrequency, {
                seed: config.seed + layer * 101,
                frequency: 1.7,
                octaves: 3,
                persistence: 0.65
            });
            if (field < layerThreshold) {
                continue;
            }
            if (!isValidCircle(allCircles, x, y, radius)) {
                continue;
            }
            allCircles.push({ x, y, radius, layer });
            accepted++;
        }
    }
    return allCircles;
}

function circlePath(circle, segments = 40) {
    const path = [];
    for (let i = 0; i <= segments; i++) {
        const t = (i / segments) * Math.PI * 2;
        path.push({
            x: circle.x + Math.cos(t) * circle.radius,
            y: circle.y + Math.sin(t) * circle.radius
        });
    }
    return path;
}

export function drawFractalCirclePacking(drawingConfig, renderContext) {
    const { svg, builder } = createDrawingRuntime({ drawingConfig, renderContext });
    const config = drawingConfig.drawingData;
    const width = renderContext.drawingWidth;
    const height = renderContext.drawingHeight;
    const circles = buildCircles(config, width, height);

    circles.forEach(circle => {
        const path = circlePath(circle);
        builder.appendPath(builder.projectPoints(path), {
            geometry: {
                x: circle.x - circle.radius,
                y: circle.y - circle.radius,
                width: circle.radius * 2,
                height: circle.radius * 2
            }
        });
    });

    return svg;
}

const fractalCirclePackingControls = [
    {
        id: 'minRadius',
        label: 'Min Radius',
        target: 'drawingData.minRadius',
        inputType: 'range',
        min: FDCP_LIMITS.minRadius.min,
        max: FDCP_LIMITS.minRadius.max,
        step: 0.25,
        default: FDCP_LIMITS.minRadius.default,
        description: 'Smallest circle radius (mm)'
    },
    {
        id: 'maxRadius',
        label: 'Max Radius',
        target: 'drawingData.maxRadius',
        inputType: 'range',
        min: FDCP_LIMITS.maxRadius.min,
        max: FDCP_LIMITS.maxRadius.max,
        step: 0.25,
        default: FDCP_LIMITS.maxRadius.default,
        description: 'Largest circle radius (A4)'
    },
    {
        id: 'circleCount',
        label: 'Target Count',
        target: 'drawingData.circleCount',
        inputType: 'range',
        min: FDCP_LIMITS.circleCount.min,
        max: FDCP_LIMITS.circleCount.max,
        step: 20,
        default: FDCP_LIMITS.circleCount.default,
        description: 'Number of circles attempted per layer'
    },
    {
        id: 'threshold',
        label: 'Threshold',
        target: 'drawingData.threshold',
        inputType: 'range',
        min: FDCP_LIMITS.threshold.min,
        max: FDCP_LIMITS.threshold.max,
        step: 0.01,
        default: FDCP_LIMITS.threshold.default,
        description: 'Fractal acceptance threshold'
    },
    {
        id: 'thresholdStep',
        label: 'Threshold Step',
        target: 'drawingData.thresholdStep',
        inputType: 'range',
        min: FDCP_LIMITS.thresholdStep.min,
        max: FDCP_LIMITS.thresholdStep.max,
        step: 0.005,
        default: FDCP_LIMITS.thresholdStep.default,
        description: 'Change applied per additional layer'
    },
    {
        id: 'fieldFrequency',
        label: 'Field Frequency',
        target: 'drawingData.fieldFrequency',
        inputType: 'range',
        min: FDCP_LIMITS.fieldFrequency.min,
        max: FDCP_LIMITS.fieldFrequency.max,
        step: 0.0005,
        default: FDCP_LIMITS.fieldFrequency.default,
        description: 'Scales the fractal field used for acceptance'
    },
    {
        id: 'attemptMultiplier',
        label: 'Attempt Multiplier',
        target: 'drawingData.attemptMultiplier',
        inputType: 'range',
        min: FDCP_LIMITS.attemptMultiplier.min,
        max: FDCP_LIMITS.attemptMultiplier.max,
        step: 1,
        default: FDCP_LIMITS.attemptMultiplier.default,
        description: 'Extra attempts per desired circle'
    },
    {
        id: 'layerCount',
        label: 'Layer Count',
        target: 'drawingData.layerCount',
        inputType: 'range',
        min: FDCP_LIMITS.layerCount.min,
        max: FDCP_LIMITS.layerCount.max,
        step: 1,
        default: FDCP_LIMITS.layerCount.default,
        description: 'Number of threshold sweeps'
    },
    {
        id: 'seed',
        label: 'Seed',
        target: 'drawingData.seed',
        inputType: 'number',
        min: FDCP_LIMITS.seed.min,
        max: FDCP_LIMITS.seed.max,
        step: 1,
        default: FDCP_LIMITS.seed.default,
        description: 'Seed controlling randomness'
    }
];

const fractalCirclePackingDefinition = attachControls(defineDrawing({
    id: 'fractalCirclePacking',
    name: 'Fractal Circle Packing',
    configClass: FractalCirclePackingConfig,
    drawFunction: drawFractalCirclePacking,
    presets: [
        {
            key: 'fractalPacking',
            name: 'Fractal Packing',
            params: {
                type: 'fractalCirclePacking',
                width: 360,
                height: 260,
                minRadius: 5,
                maxRadius: 18,
                circleCount: 360,
                threshold: 0.44,
                thresholdStep: 0.04,
                fieldFrequency: 0.011,
                attemptMultiplier: 4,
                layerCount: 2,
                seed: 515,
                line: { strokeWidth: 0.2 },
                colorPalette: colorPalettes.sakuraPalette
            }
        }
    ]
}), fractalCirclePackingControls);

export const fractalCirclePackingDrawing = fractalCirclePackingDefinition;
export default fractalCirclePackingDefinition;
