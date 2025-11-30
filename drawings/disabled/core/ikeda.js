import {
    defineDrawing,
    SizedDrawingConfig,
    createDrawingRuntime,
    colorPalettes
} from '../shared/kit.js';
import { attachControls } from '../shared/controlsUtils.js';
import { clampInteger, clampNumber } from '../shared/utils/paramMath.js';
import { projectChaoticPoints } from '../shared/utils/attractorUtils.js';

const IKEDA_LIMITS = {
    steps: { min: 80000, max: 300000, default: 200000 },
    u: { min: 0.7, max: 1.0, default: 0.918 },
    smoothing: { min: 0, max: 0.5, default: 0.02 }
};

class IkedaConfig extends SizedDrawingConfig {
    constructor(params = {}) {
        super(params);
        this.steps = clampInteger(params.steps, IKEDA_LIMITS.steps.min, IKEDA_LIMITS.steps.max, IKEDA_LIMITS.steps.default, 'round');
        this.u = clampNumber(params.u, IKEDA_LIMITS.u.min, IKEDA_LIMITS.u.max, IKEDA_LIMITS.u.default);
        this.smoothing = clampNumber(params.smoothing, IKEDA_LIMITS.smoothing.min, IKEDA_LIMITS.smoothing.max, IKEDA_LIMITS.smoothing.default);
    }
}

function generateIkedaPoints(config) {
    const points = [];
    let x = 0.1;
    let y = 0;

    for (let i = 0; i < config.steps; i++) {
        const t = 0.4 - 6 / (1 + x * x + y * y);
        const nextX = 1 + config.u * (x * Math.cos(t) - y * Math.sin(t));
        const nextY = config.u * (x * Math.sin(t) + y * Math.cos(t));
        x = nextX;
        y = nextY;
        points.push({ x, y });
    }
    return points;
}

export function drawIkedaAttractor(drawingConfig, renderContext) {
    const { svg, builder } = createDrawingRuntime({ drawingConfig, renderContext });
    const config = drawingConfig.drawingData;
    const points = generateIkedaPoints(config);
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

const ikedaControls = [
    {
        id: 'u',
        label: 'Parameter u',
        target: 'drawingData.u',
        inputType: 'range',
        min: IKEDA_LIMITS.u.min,
        max: IKEDA_LIMITS.u.max,
        step: 0.001,
        default: IKEDA_LIMITS.u.default,
        description: 'Controls the contraction of the Ikeda attractor'
    },
    {
        id: 'steps',
        label: 'Iterations',
        target: 'drawingData.steps',
        inputType: 'range',
        min: IKEDA_LIMITS.steps.min,
        max: IKEDA_LIMITS.steps.max,
        step: 5000,
        default: IKEDA_LIMITS.steps.default,
        description: 'Total Ikeda iterations'
    },
    {
        id: 'smoothing',
        label: 'Smoothing',
        target: 'drawingData.smoothing',
        inputType: 'range',
        min: IKEDA_LIMITS.smoothing.min,
        max: IKEDA_LIMITS.smoothing.max,
        step: 0.01,
        default: IKEDA_LIMITS.smoothing.default,
        description: 'Blend successive points to calm chaotic jumps'
    }
];

const ikedaDefinition = attachControls(defineDrawing({
    id: 'ikeda',
    name: 'Ikeda Attractor',
    configClass: IkedaConfig,
    drawFunction: drawIkedaAttractor,
    presets: [
        {
            key: 'ikedaSwirl',
            name: 'Swirl Cluster',
            params: {
                type: 'ikeda',
                width: 260,
                height: 200,
                u: 0.918,
                steps: 200000,
                smoothing: 0.02,
                line: { strokeWidth: 0.2 },
                colorPalette: colorPalettes.yonoPalette || colorPalettes.sakuraPalette
            }
        }
    ]
}), ikedaControls);

export const ikedaDrawing = ikedaDefinition;
export default ikedaDefinition;
