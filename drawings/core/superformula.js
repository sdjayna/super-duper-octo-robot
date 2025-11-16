import {
    defineDrawing,
    SizedDrawingConfig,
    createDrawingRuntime,
    colorPalettes
} from '../shared/kit.js';
import { attachControls } from '../shared/controlsUtils.js';
import { clampInteger, clampNumber } from '../shared/utils/paramMath.js';

const SUPERFORMULA_LIMITS = {
    m: { min: 3, max: 12, default: 8 },
    n1: { min: 0.3, max: 8, default: 0.5 },
    n2: { min: 0.3, max: 8, default: 2 },
    n3: { min: 0.3, max: 8, default: 2 },
    a: { min: 0.2, max: 1.5, default: 1 },
    b: { min: 0.2, max: 1.5, default: 1 },
    scale: { min: 0.3, max: 1.2, default: 0.5 },
    rotation: { min: 0, max: Math.PI * 2, default: 0 },
    samples: { min: 2000, max: 5000, default: 3200 }
};

class SuperformulaConfig extends SizedDrawingConfig {
    constructor(params = {}) {
        super(params);
        this.m = clampNumber(params.m, SUPERFORMULA_LIMITS.m.min, SUPERFORMULA_LIMITS.m.max, SUPERFORMULA_LIMITS.m.default);
        this.n1 = clampNumber(params.n1, SUPERFORMULA_LIMITS.n1.min, SUPERFORMULA_LIMITS.n1.max, SUPERFORMULA_LIMITS.n1.default);
        this.n2 = clampNumber(params.n2, SUPERFORMULA_LIMITS.n2.min, SUPERFORMULA_LIMITS.n2.max, SUPERFORMULA_LIMITS.n2.default);
        this.n3 = clampNumber(params.n3, SUPERFORMULA_LIMITS.n3.min, SUPERFORMULA_LIMITS.n3.max, SUPERFORMULA_LIMITS.n3.default);
        this.a = clampNumber(params.a, SUPERFORMULA_LIMITS.a.min, SUPERFORMULA_LIMITS.a.max, SUPERFORMULA_LIMITS.a.default);
        this.b = clampNumber(params.b, SUPERFORMULA_LIMITS.b.min, SUPERFORMULA_LIMITS.b.max, SUPERFORMULA_LIMITS.b.default);
        this.rotation = clampNumber(params.rotation, SUPERFORMULA_LIMITS.rotation.min, SUPERFORMULA_LIMITS.rotation.max, SUPERFORMULA_LIMITS.rotation.default);
        this.samples = clampInteger(params.samples, SUPERFORMULA_LIMITS.samples.min, SUPERFORMULA_LIMITS.samples.max, SUPERFORMULA_LIMITS.samples.default);
        this.scale = clampNumber(params.scale, SUPERFORMULA_LIMITS.scale.min, SUPERFORMULA_LIMITS.scale.max, SUPERFORMULA_LIMITS.scale.default);
    }
}

function superformulaRadius(phi, params) {
    const { m, n1, n2, n3, a, b } = params;
    const part1 = Math.pow(Math.abs(Math.cos((m * phi) / 4) / a), n2);
    const part2 = Math.pow(Math.abs(Math.sin((m * phi) / 4) / b), n3);
    const denom = Math.pow(part1 + part2, 1 / n1);
    if (Math.abs(denom) === 0) {
        return 0;
    }
    return 1 / denom;
}

export function drawSuperformula(drawingConfig, renderContext) {
    const { svg, builder } = createDrawingRuntime({ drawingConfig, renderContext });
    const params = drawingConfig.drawingData;
    const width = renderContext.drawingWidth;
    const height = renderContext.drawingHeight;
    const centerX = width / 2;
    const centerY = height / 2;
    const scale = Math.min(width, height) / 2 * params.scale;
    const points = [];

    for (let i = 0; i <= params.samples; i++) {
        const phi = (i / params.samples) * Math.PI * 2;
        const r = superformulaRadius(phi, params);
        const angle = phi + params.rotation;
        const x = centerX + Math.cos(angle) * r * scale;
        const y = centerY + Math.sin(angle) * r * scale;
        points.push({ x, y });
    }

    builder.appendPath(builder.projectPoints(points), {
        geometry: {
            x: 0,
            y: 0,
            width,
            height
        }
    });
    return svg;
}

const superformulaControls = [
    {
        id: 'm',
        label: 'Symmetry (m)',
        target: 'drawingData.m',
        inputType: 'range',
        min: SUPERFORMULA_LIMITS.m.min,
        max: SUPERFORMULA_LIMITS.m.max,
        step: 1,
        default: SUPERFORMULA_LIMITS.m.default,
        description: 'Rotational symmetry parameter'
    },
    {
        id: 'n1',
        label: 'Exponent n1',
        target: 'drawingData.n1',
        inputType: 'range',
        min: SUPERFORMULA_LIMITS.n1.min,
        max: SUPERFORMULA_LIMITS.n1.max,
        step: 0.01,
        default: SUPERFORMULA_LIMITS.n1.default,
        description: 'Controls overall shape sharpness'
    },
    {
        id: 'n2',
        label: 'Exponent n2',
        target: 'drawingData.n2',
        inputType: 'range',
        min: SUPERFORMULA_LIMITS.n2.min,
        max: SUPERFORMULA_LIMITS.n2.max,
        step: 0.01,
        default: SUPERFORMULA_LIMITS.n2.default,
        description: 'Controls cosine term weighting'
    },
    {
        id: 'n3',
        label: 'Exponent n3',
        target: 'drawingData.n3',
        inputType: 'range',
        min: SUPERFORMULA_LIMITS.n3.min,
        max: SUPERFORMULA_LIMITS.n3.max,
        step: 0.01,
        default: SUPERFORMULA_LIMITS.n3.default,
        description: 'Controls sine term weighting'
    },
    {
        id: 'scale',
        label: 'Scale',
        target: 'drawingData.scale',
        inputType: 'range',
        min: SUPERFORMULA_LIMITS.scale.min,
        max: SUPERFORMULA_LIMITS.scale.max,
        step: 0.05,
        default: SUPERFORMULA_LIMITS.scale.default,
        description: 'Overall radius scale'
    },
    {
        id: 'rotation',
        label: 'Rotation',
        target: 'drawingData.rotation',
        inputType: 'range',
        min: SUPERFORMULA_LIMITS.rotation.min,
        max: SUPERFORMULA_LIMITS.rotation.max,
        step: 0.01,
        default: SUPERFORMULA_LIMITS.rotation.default,
        description: 'Rotation offset (radians)'
    },
    {
        id: 'samples',
        label: 'Resolution',
        target: 'drawingData.samples',
        inputType: 'range',
        min: SUPERFORMULA_LIMITS.samples.min,
        max: SUPERFORMULA_LIMITS.samples.max,
        step: 100,
        default: SUPERFORMULA_LIMITS.samples.default,
        description: 'Number of segments used to trace the shape'
    }
];

const superformulaDefinition = attachControls(defineDrawing({
    id: 'superformula',
    name: 'Superformula',
    configClass: SuperformulaConfig,
    drawFunction: drawSuperformula,
    presets: [
        {
            key: 'superformulaSunburst',
            name: 'Sunburst Superformula',
            params: {
                type: 'superformula',
                width: 260,
                height: 260,
                m: 9,
                n1: 0.5,
                n2: 2,
                n3: 2,
                scale: 0.55,
                rotation: 0,
                samples: 3200,
                line: {
                    strokeWidth: 0.35
                },
                colorPalette: colorPalettes.molotowPalette || colorPalettes.sakuraPalette
            }
        }
    ]
}), superformulaControls);

export const superformulaDrawing = superformulaDefinition;
export default superformulaDefinition;
