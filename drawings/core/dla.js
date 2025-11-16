import {
    defineDrawing,
    SizedDrawingConfig,
    createDrawingRuntime,
    colorPalettes
} from '../shared/kit.js';
import { attachControls } from '../shared/controlsUtils.js';
import { clampInteger, clampNumber } from '../shared/utils/paramMath.js';

const DLA_LIMITS = {
    stickiness: { min: 0.5, max: 0.9, default: 0.7 },
    bias: { min: 0.01, max: 0.05, default: 0.02 },
    particleCount: { min: 150, max: 3500, default: 600 },
    maxRadius: { min: 120, max: 150, default: 130 },
    seed: { min: 1, max: 9999, default: 55 }
};

class DLAConfig extends SizedDrawingConfig {
    constructor(params = {}) {
        super({
            ...params,
            width: params.width ?? 300,
            height: params.height ?? 300
        });
        this.stickiness = clampNumber(params.stickiness, DLA_LIMITS.stickiness.min, DLA_LIMITS.stickiness.max, DLA_LIMITS.stickiness.default);
        this.bias = clampNumber(params.bias, DLA_LIMITS.bias.min, DLA_LIMITS.bias.max, DLA_LIMITS.bias.default);
        this.particleCount = clampInteger(params.particleCount, DLA_LIMITS.particleCount.min, DLA_LIMITS.particleCount.max, DLA_LIMITS.particleCount.default);
        this.maxRadius = clampNumber(params.maxRadius, DLA_LIMITS.maxRadius.min, DLA_LIMITS.maxRadius.max, DLA_LIMITS.maxRadius.default);
        this.seed = clampInteger(params.seed, DLA_LIMITS.seed.min, DLA_LIMITS.seed.max, DLA_LIMITS.seed.default);
    }
}

function pseudoRandom(seed) {
    let state = seed % 2147483647;
    return () => {
        state = (state * 16807) % 2147483647;
        return (state - 1) / 2147483646;
    };
}

function simulateDLA(config) {
    const rand = pseudoRandom(config.seed);
    const cluster = [{ x: 0, y: 0 }];
    const maxSteps = Math.max(500, config.maxRadius * 15);

    while (cluster.length < config.particleCount) {
        let angle = rand() * Math.PI * 2;
        let radius = config.maxRadius * 0.8;
        let x = Math.cos(angle) * radius;
        let y = Math.sin(angle) * radius;
        for (let step = 0; step < maxSteps; step++) {
            const dirAngle = rand() * Math.PI * 2;
            const biasAngle = angle + (rand() - 0.5) * config.bias * Math.PI * 2;
            x += Math.cos(dirAngle) + Math.cos(biasAngle) * config.bias;
            y += Math.sin(dirAngle) + Math.sin(biasAngle) * config.bias;
            const dist = Math.hypot(x, y);
            if (dist > config.maxRadius) {
                break;
            }
            if (isNearCluster(cluster, x, y, config.stickiness, rand)) {
                cluster.push({ x, y });
                break;
            }
        }
        if (cluster.length >= config.particleCount) {
            break;
        }
    }
    return cluster;
}

function isNearCluster(cluster, x, y, stickiness, rand) {
    for (let i = 0; i < cluster.length; i++) {
        const dx = cluster[i].x - x;
        const dy = cluster[i].y - y;
        if (dx * dx + dy * dy < 4 && rand() < stickiness) {
            return true;
        }
    }
    return false;
}

export function drawDLACluster(drawingConfig, renderContext) {
    const { svg, builder } = createDrawingRuntime({ drawingConfig, renderContext });
    const config = drawingConfig.drawingData;
    const cluster = simulateDLA(config);
    const scale = Math.min(renderContext.drawingWidth, renderContext.drawingHeight) / (config.maxRadius * 2);
    const centerX = renderContext.drawingWidth / 2;
    const centerY = renderContext.drawingHeight / 2;

    cluster.forEach(point => {
        const rect = builder.projectRect({
            x: centerX + point.x * scale - 0.4,
            y: centerY + point.y * scale - 0.4,
            width: 0.8,
            height: 0.8
        });
        const square = [
            { x: rect.x, y: rect.y },
            { x: rect.x + rect.width, y: rect.y },
            { x: rect.x + rect.width, y: rect.y + rect.height },
            { x: rect.x, y: rect.y + rect.height },
            { x: rect.x, y: rect.y }
        ];
        builder.appendPath(square, { geometry: rect });
    });
    return svg;
}

const dlaControls = [
    {
        id: 'stickiness',
        label: 'Stickiness',
        target: 'drawingData.stickiness',
        inputType: 'range',
        min: DLA_LIMITS.stickiness.min,
        max: DLA_LIMITS.stickiness.max,
        step: 0.01,
        default: DLA_LIMITS.stickiness.default,
        description: 'Chance a particle sticks when hitting the cluster'
    },
    {
        id: 'bias',
        label: 'Directional Bias',
        target: 'drawingData.bias',
        inputType: 'range',
        min: DLA_LIMITS.bias.min,
        max: DLA_LIMITS.bias.max,
        step: 0.002,
        default: DLA_LIMITS.bias.default,
        description: 'Directional bias applied to particle drift'
    },
    {
        id: 'maxRadius',
        label: 'Cluster Radius',
        target: 'drawingData.maxRadius',
        inputType: 'range',
        min: DLA_LIMITS.maxRadius.min,
        max: DLA_LIMITS.maxRadius.max,
        step: 2,
        default: DLA_LIMITS.maxRadius.default,
        description: 'Maximum radius (mm) of the aggregated cluster'
    },
    {
        id: 'particleCount',
        label: 'Particle Count',
        target: 'drawingData.particleCount',
        inputType: 'range',
        min: DLA_LIMITS.particleCount.min,
        max: DLA_LIMITS.particleCount.max,
        step: 50,
        default: DLA_LIMITS.particleCount.default,
        description: 'Number of particles to aggregate'
    },
    {
        id: 'seed',
        label: 'Seed',
        target: 'drawingData.seed',
        inputType: 'number',
        min: DLA_LIMITS.seed.min,
        max: DLA_LIMITS.seed.max,
        step: 1,
        default: DLA_LIMITS.seed.default,
        description: 'Random seed controlling aggregation'
    }
];

const dlaDefinition = attachControls(defineDrawing({
    id: 'dla',
    name: 'Diffusion-Limited Aggregation',
    configClass: DLAConfig,
    drawFunction: drawDLACluster,
    presets: [
        {
            key: 'dlaDendrite',
            name: 'Dendrite Cluster',
            params: {
                type: 'dla',
                width: 300,
                height: 300,
                stickiness: 0.75,
                bias: 0.03,
                particleCount: 900,
                maxRadius: 130,
                seed: 99,
                line: { strokeWidth: 0.15 },
                colorPalette: colorPalettes.sakuraPalette
            }
        }
    ]
}), dlaControls);

export const dlaDrawing = dlaDefinition;
export default dlaDefinition;
