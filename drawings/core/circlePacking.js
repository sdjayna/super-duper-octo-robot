import {
    defineDrawing,
    SizedDrawingConfig,
    createDrawingRuntime,
    colorPalettes
} from '../shared/kit.js';
import { attachControls } from '../shared/controlsUtils.js';
import { clampInteger, clampNumber } from '../shared/utils/paramMath.js';

const CIRCLE_LIMITS = {
    minRadius: { min: 3, max: 10, default: 4 },
    maxRadius: { min: 10, max: 18, default: 16 },
    circleCount: { min: 200, max: 600, default: 400 },
    spacingFactor: { min: 1.05, max: 1.2, default: 1.12 },
    seed: { min: 1, max: 9999, default: 88 }
};

class CirclePackingConfig extends SizedDrawingConfig {
    constructor(params = {}) {
        super({
            ...params,
            width: params.width ?? 380,
            height: params.height ?? 260
        });
        this.minRadius = clampNumber(params.minRadius, CIRCLE_LIMITS.minRadius.min, CIRCLE_LIMITS.minRadius.max, CIRCLE_LIMITS.minRadius.default);
        this.maxRadius = clampNumber(params.maxRadius, CIRCLE_LIMITS.maxRadius.min, CIRCLE_LIMITS.maxRadius.max, CIRCLE_LIMITS.maxRadius.default);
        if (this.maxRadius <= this.minRadius) {
            this.maxRadius = Math.min(CIRCLE_LIMITS.maxRadius.max, this.minRadius + 2);
        }
        this.circleCount = clampInteger(params.circleCount, CIRCLE_LIMITS.circleCount.min, CIRCLE_LIMITS.circleCount.max, CIRCLE_LIMITS.circleCount.default);
        this.spacingFactor = clampNumber(params.spacingFactor, CIRCLE_LIMITS.spacingFactor.min, CIRCLE_LIMITS.spacingFactor.max, CIRCLE_LIMITS.spacingFactor.default);
        this.seed = clampInteger(params.seed, CIRCLE_LIMITS.seed.min, CIRCLE_LIMITS.seed.max, CIRCLE_LIMITS.seed.default);
    }
}

function pseudoRandom(seed) {
    let state = seed % 2147483647;
    return () => {
        state = (state * 16807) % 2147483647;
        return (state - 1) / 2147483646;
    };
}

function generateCircles(config, width, height) {
    const rand = pseudoRandom(config.seed);
    const circles = [];
    const attempts = config.circleCount * 40;

    for (let i = 0; i < attempts && circles.length < config.circleCount; i++) {
        const radius = config.minRadius + Math.pow(rand(), 2) * (config.maxRadius - config.minRadius);
        const x = radius + rand() * (width - 2 * radius);
        const y = radius + rand() * (height - 2 * radius);
        if (isValidCircle(circles, x, y, radius, config.spacingFactor)) {
            circles.push({ x, y, radius });
        }
    }
    return circles;
}

function isValidCircle(existing, x, y, radius, spacingFactor) {
    for (let i = 0; i < existing.length; i++) {
        const circle = existing[i];
        const dist = Math.hypot(circle.x - x, circle.y - y);
        if (dist < (circle.radius + radius) * spacingFactor) {
            return false;
        }
    }
    return true;
}

export function drawCirclePacking(drawingConfig, renderContext) {
    const { svg, builder } = createDrawingRuntime({ drawingConfig, renderContext });
    const config = drawingConfig.drawingData;
    const circles = generateCircles(config, renderContext.drawingWidth, renderContext.drawingHeight);

    circles.forEach(circle => {
        const rect = builder.projectRect({
            x: circle.x - circle.radius,
            y: circle.y - circle.radius,
            width: circle.radius * 2,
            height: circle.radius * 2
        });
        const path = [];
        const segments = 32;
        for (let i = 0; i <= segments; i++) {
            const theta = (i / segments) * Math.PI * 2;
            path.push({
                x: rect.x + rect.width / 2 + Math.cos(theta) * rect.width / 2,
                y: rect.y + rect.height / 2 + Math.sin(theta) * rect.height / 2
            });
        }
        builder.appendPath(path, { geometry: rect });
    });
    return svg;
}

const circleControls = [
    {
        id: 'minRadius',
        label: 'Min Radius',
        target: 'drawingData.minRadius',
        inputType: 'range',
        min: CIRCLE_LIMITS.minRadius.min,
        max: CIRCLE_LIMITS.minRadius.max,
        step: 0.25,
        default: CIRCLE_LIMITS.minRadius.default,
        description: 'Minimum circle radius (mm)'
    },
    {
        id: 'maxRadius',
        label: 'Max Radius',
        target: 'drawingData.maxRadius',
        inputType: 'range',
        min: CIRCLE_LIMITS.maxRadius.min,
        max: CIRCLE_LIMITS.maxRadius.max,
        step: 0.25,
        default: CIRCLE_LIMITS.maxRadius.default,
        description: 'Maximum circle radius (mm)'
    },
    {
        id: 'circleCount',
        label: 'Circle Count',
        target: 'drawingData.circleCount',
        inputType: 'range',
        min: CIRCLE_LIMITS.circleCount.min,
        max: CIRCLE_LIMITS.circleCount.max,
        step: 20,
        default: CIRCLE_LIMITS.circleCount.default,
        description: 'Target number of circles'
    },
    {
        id: 'spacingFactor',
        label: 'Spacing Factor',
        target: 'drawingData.spacingFactor',
        inputType: 'range',
        min: CIRCLE_LIMITS.spacingFactor.min,
        max: CIRCLE_LIMITS.spacingFactor.max,
        step: 0.005,
        default: CIRCLE_LIMITS.spacingFactor.default,
        description: 'Multiplier applied to radius sums for rejection'
    },
    {
        id: 'seed',
        label: 'Seed',
        target: 'drawingData.seed',
        inputType: 'number',
        min: CIRCLE_LIMITS.seed.min,
        max: CIRCLE_LIMITS.seed.max,
        step: 1,
        default: CIRCLE_LIMITS.seed.default,
        description: 'Random seed controlling circle placement'
    }
];

const circlePackingDefinition = attachControls(defineDrawing({
    id: 'circlePacking',
    name: 'Circle Packing',
    configClass: CirclePackingConfig,
    drawFunction: drawCirclePacking,
    presets: [
        {
            key: 'circlePackingDense',
            name: 'Dense Packing',
            params: {
                type: 'circlePacking',
                width: 380,
                height: 260,
                minRadius: 4,
                maxRadius: 16,
                circleCount: 420,
                spacingFactor: 1.12,
                seed: 101,
                line: { strokeWidth: 0.2 },
                colorPalette: colorPalettes.sakuraPalette
            }
        }
    ]
}), circleControls);

export const circlePackingDrawing = circlePackingDefinition;
export default circlePackingDefinition;
