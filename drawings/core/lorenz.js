import {
    defineDrawing,
    SizedDrawingConfig,
    createDrawingRuntime,
    colorPalettes
} from '../shared/kit.js';
import { attachControls } from '../shared/controlsUtils.js';
import { clampInteger, clampNumber } from '../shared/utils/paramMath.js';
import { projectChaoticPoints } from '../shared/utils/attractorUtils.js';

const LORENZ_LIMITS = {
    steps: { min: 50000, max: 400000, default: 260000 },
    dt: { min: 0.002, max: 0.02, default: 0.01 },
    sigma: { min: 5, max: 15, default: 10 },
    rho: { min: 20, max: 35, default: 28 },
    beta: { min: 2.4, max: 3.2, default: 8 / 3 },
    smoothing: { min: 0, max: 0.5, default: 0.05 }
};

class LorenzConfig extends SizedDrawingConfig {
    constructor(params = {}) {
        super(params);
        this.steps = clampInteger(params.steps, LORENZ_LIMITS.steps.min, LORENZ_LIMITS.steps.max, LORENZ_LIMITS.steps.default, 'round');
        this.dt = clampNumber(params.dt, LORENZ_LIMITS.dt.min, LORENZ_LIMITS.dt.max, LORENZ_LIMITS.dt.default);
        this.sigma = clampNumber(params.sigma, LORENZ_LIMITS.sigma.min, LORENZ_LIMITS.sigma.max, LORENZ_LIMITS.sigma.default);
        this.rho = clampNumber(params.rho, LORENZ_LIMITS.rho.min, LORENZ_LIMITS.rho.max, LORENZ_LIMITS.rho.default);
        this.beta = clampNumber(params.beta, LORENZ_LIMITS.beta.min, LORENZ_LIMITS.beta.max, LORENZ_LIMITS.beta.default);
        this.smoothing = clampNumber(params.smoothing, LORENZ_LIMITS.smoothing.min, LORENZ_LIMITS.smoothing.max, LORENZ_LIMITS.smoothing.default);
    }
}

function generateLorenzPoints(config) {
    const points = [];
    let x = 0.1;
    let y = 0;
    let z = 0;

    for (let i = 0; i < config.steps; i++) {
        const dx = config.sigma * (y - x);
        const dy = x * (config.rho - z) - y;
        const dz = x * y - config.beta * z;
        x += dx * config.dt;
        y += dy * config.dt;
        z += dz * config.dt;
        points.push({ x, y });
    }

    return points;
}

export function drawLorenzAttractor(drawingConfig, renderContext) {
    const { svg, builder } = createDrawingRuntime({ drawingConfig, renderContext });
    const config = drawingConfig.drawingData;
    const points = generateLorenzPoints(config);
    const projected = projectChaoticPoints(points, renderContext, config.smoothing);

    if (projected.length > 1) {
        builder.appendPath(builder.projectPoints(projected), {
            geometry: {
                x: 0,
                y: 0,
                width: renderContext.drawingWidth,
                height: renderContext.drawingHeight
            }
        });
    }

    return svg;
}

const lorenzControls = [
    {
        id: 'sigma',
        label: 'Sigma (σ)',
        target: 'drawingData.sigma',
        inputType: 'range',
        min: LORENZ_LIMITS.sigma.min,
        max: LORENZ_LIMITS.sigma.max,
        step: 0.1,
        default: LORENZ_LIMITS.sigma.default,
        description: 'Controls the Prandtl number in the Lorenz system'
    },
    {
        id: 'rho',
        label: 'Rho (ρ)',
        target: 'drawingData.rho',
        inputType: 'range',
        min: LORENZ_LIMITS.rho.min,
        max: LORENZ_LIMITS.rho.max,
        step: 0.1,
        default: LORENZ_LIMITS.rho.default,
        description: 'Temperature difference driving the chaotic lobes'
    },
    {
        id: 'beta',
        label: 'Beta (β)',
        target: 'drawingData.beta',
        inputType: 'range',
        min: LORENZ_LIMITS.beta.min,
        max: LORENZ_LIMITS.beta.max,
        step: 0.01,
        default: LORENZ_LIMITS.beta.default,
        description: 'Aspect ratio of the Lorenz attractor'
    },
    {
        id: 'dt',
        label: 'Time Step',
        target: 'drawingData.dt',
        inputType: 'range',
        min: LORENZ_LIMITS.dt.min,
        max: LORENZ_LIMITS.dt.max,
        step: 0.001,
        default: LORENZ_LIMITS.dt.default,
        description: 'Integration timestep; smaller values add detail'
    },
    {
        id: 'steps',
        label: 'Iterations',
        target: 'drawingData.steps',
        inputType: 'range',
        min: LORENZ_LIMITS.steps.min,
        max: LORENZ_LIMITS.steps.max,
        step: 10000,
        default: LORENZ_LIMITS.steps.default,
        description: 'Total Lorenz iterations traced'
    },
    {
        id: 'smoothing',
        label: 'Smoothing',
        target: 'drawingData.smoothing',
        inputType: 'range',
        min: LORENZ_LIMITS.smoothing.min,
        max: LORENZ_LIMITS.smoothing.max,
        step: 0.01,
        default: LORENZ_LIMITS.smoothing.default,
        description: 'Exponential smoothing applied between points'
    }
];

const lorenzDefinition = attachControls(defineDrawing({
    id: 'lorenz',
    name: 'Lorenz Attractor',
    configClass: LorenzConfig,
    drawFunction: drawLorenzAttractor,
    presets: [
        {
            key: 'lorenzClassic',
            name: 'Classic Lorenz',
            params: {
                type: 'lorenz',
                width: 260,
                height: 200,
                sigma: 10,
                rho: 28,
                beta: 8 / 3,
                dt: 0.01,
                steps: 260000,
                smoothing: 0.05,
                line: { strokeWidth: 0.25 },
                colorPalette: colorPalettes.sakuraPalette
            }
        }
    ]
}), lorenzControls);

export const lorenzDrawing = lorenzDefinition;
export default lorenzDefinition;
