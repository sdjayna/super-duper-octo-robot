import {
    defineDrawing,
    SizedDrawingConfig,
    createDrawingRuntime,
    colorPalettes
} from '../shared/kit.js';
import { attachControls } from '../shared/controlsUtils.js';
import { clampInteger, clampNumber } from '../shared/utils/paramMath.js';
import { projectChaoticPoints } from '../shared/utils/attractorUtils.js';

const DEJONG_LIMITS = {
    steps: { min: 100000, max: 400000, default: 220000 },
    parameter: { min: -3, max: 3 },
    smoothing: { min: 0, max: 0.5, default: 0.03 }
};

class DeJongConfig extends SizedDrawingConfig {
    constructor(params = {}) {
        super(params);
        this.steps = clampInteger(params.steps, DEJONG_LIMITS.steps.min, DEJONG_LIMITS.steps.max, DEJONG_LIMITS.steps.default, 'round');
        this.a = clampNumber(params.a, DEJONG_LIMITS.parameter.min, DEJONG_LIMITS.parameter.max, -1.4);
        this.b = clampNumber(params.b, DEJONG_LIMITS.parameter.min, DEJONG_LIMITS.parameter.max, 1.6);
        this.c = clampNumber(params.c, DEJONG_LIMITS.parameter.min, DEJONG_LIMITS.parameter.max, -1.2);
        this.d = clampNumber(params.d, DEJONG_LIMITS.parameter.min, DEJONG_LIMITS.parameter.max, 0.7);
        this.smoothing = clampNumber(params.smoothing, DEJONG_LIMITS.smoothing.min, DEJONG_LIMITS.smoothing.max, DEJONG_LIMITS.smoothing.default);
    }
}

function generateDeJongPoints(config) {
    const points = [];
    let x = 0.1;
    let y = 0;

    for (let i = 0; i < config.steps; i++) {
        const nextX = Math.sin(config.a * y) - Math.cos(config.b * x);
        const nextY = Math.sin(config.c * x) - Math.cos(config.d * y);
        x = nextX;
        y = nextY;
        points.push({ x, y });
    }

    return points;
}

export function drawDeJongAttractor(drawingConfig, renderContext) {
    const { svg, builder } = createDrawingRuntime({ drawingConfig, renderContext });
    const config = drawingConfig.drawingData;
    const points = generateDeJongPoints(config);
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

const parameterControl = (id, label) => ({
    id,
    label,
    target: `drawingData.${id}`,
    inputType: 'range',
    min: DEJONG_LIMITS.parameter.min,
    max: DEJONG_LIMITS.parameter.max,
    step: 0.01,
    default: id === 'a' ? -1.4 : id === 'b' ? 1.6 : id === 'c' ? -1.2 : 0.7,
    description: `Peter de Jong parameter ${id}`
});

const dejongControls = [
    parameterControl('a', 'Parameter a'),
    parameterControl('b', 'Parameter b'),
    parameterControl('c', 'Parameter c'),
    parameterControl('d', 'Parameter d'),
    {
        id: 'steps',
        label: 'Iterations',
        target: 'drawingData.steps',
        inputType: 'range',
        min: DEJONG_LIMITS.steps.min,
        max: DEJONG_LIMITS.steps.max,
        step: 5000,
        default: DEJONG_LIMITS.steps.default,
        description: 'Number of Peter de Jong iterations'
    },
    {
        id: 'smoothing',
        label: 'Smoothing',
        target: 'drawingData.smoothing',
        inputType: 'range',
        min: DEJONG_LIMITS.smoothing.min,
        max: DEJONG_LIMITS.smoothing.max,
        step: 0.01,
        default: DEJONG_LIMITS.smoothing.default,
        description: 'Exponential smoothing for projected points'
    }
];

const deJongDefinition = attachControls(defineDrawing({
    id: 'dejong',
    name: 'Peter de Jong Attractor',
    configClass: DeJongConfig,
    drawFunction: drawDeJongAttractor,
    presets: [
        {
            key: 'dejongClassic',
            name: 'Classic de Jong',
            params: {
                type: 'dejong',
                width: 260,
                height: 200,
                a: -1.4,
                b: 1.6,
                c: -1.2,
                d: 0.7,
                steps: 220000,
                smoothing: 0.03,
                line: { strokeWidth: 0.2 },
                colorPalette: colorPalettes.sakuraPalette
            }
        }
    ]
}), dejongControls);

export const deJongDrawing = deJongDefinition;
export default deJongDefinition;
