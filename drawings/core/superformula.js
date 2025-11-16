import {
    defineDrawing,
    SizedDrawingConfig,
    createDrawingRuntime,
    colorPalettes,
    ensureColorReachableLimit
} from '../shared/kit.js';
import { attachControls } from '../shared/controlsUtils.js';
import { clampInteger, clampNumber } from '../shared/utils/paramMath.js';

const derivedLayerCountMax = ensureColorReachableLimit(4);

const SUPERFORMULA_LIMITS = {
    m: { min: 3, max: 12, default: 8 },
    n1: { min: 0.3, max: 8, default: 0.5 },
    n2: { min: 0.3, max: 8, default: 2 },
    n3: { min: 0.3, max: 8, default: 2 },
    a: { min: 0.2, max: 1.5, default: 1 },
    b: { min: 0.2, max: 1.5, default: 1 },
    scale: { min: 0.3, max: 1.2, default: 0.5 },
    rotation: { min: 0, max: Math.PI * 2, default: 0 },
    samples: { min: 2000, max: 5000, default: 3200 },
    layerCount: { min: 1, max: derivedLayerCountMax, default: 2 },
    layerRotation: { min: 0, max: 0.35, default: 0.08 },
    exponentDrift: { min: 0, max: 1, default: 0.3 }
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
        this.layerCount = clampInteger(params.layerCount, SUPERFORMULA_LIMITS.layerCount.min, SUPERFORMULA_LIMITS.layerCount.max, SUPERFORMULA_LIMITS.layerCount.default);
        this.layerRotation = clampNumber(params.layerRotation, SUPERFORMULA_LIMITS.layerRotation.min, SUPERFORMULA_LIMITS.layerRotation.max, SUPERFORMULA_LIMITS.layerRotation.default);
        this.exponentDrift = clampNumber(params.exponentDrift, SUPERFORMULA_LIMITS.exponentDrift.min, SUPERFORMULA_LIMITS.exponentDrift.max, SUPERFORMULA_LIMITS.exponentDrift.default);
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
    const width = renderContext.drawingWidth;
    const height = renderContext.drawingHeight;
    const centerX = width / 2;
    const centerY = height / 2;
    const drawingData = drawingConfig.drawingData;
    const layerCount = drawingData.layerCount ?? SUPERFORMULA_LIMITS.layerCount.default;
    const layerRotation = drawingData.layerRotation ?? SUPERFORMULA_LIMITS.layerRotation.default;
    const exponentDrift = drawingData.exponentDrift ?? SUPERFORMULA_LIMITS.exponentDrift.default;
    const baseScale = Math.min(width, height) / 2 * drawingData.scale;

    for (let layer = 0; layer < layerCount; layer++) {
        const exponentOffset = layer * exponentDrift;
        const layerParams = {
            ...drawingData,
            rotation: drawingData.rotation + layer * layerRotation,
            n1: clampNumber(drawingData.n1 + exponentOffset, SUPERFORMULA_LIMITS.n1.min, SUPERFORMULA_LIMITS.n1.max),
            n2: clampNumber(drawingData.n2 - exponentOffset * 0.5, SUPERFORMULA_LIMITS.n2.min, SUPERFORMULA_LIMITS.n2.max),
            n3: clampNumber(drawingData.n3 + exponentOffset * 0.5, SUPERFORMULA_LIMITS.n3.min, SUPERFORMULA_LIMITS.n3.max),
            m: clampNumber(drawingData.m + layer * exponentDrift * 0.5, SUPERFORMULA_LIMITS.m.min, SUPERFORMULA_LIMITS.m.max)
        };
        const scale = baseScale * (1 - layer * 0.05);
        const points = [];

        for (let i = 0; i <= drawingData.samples; i++) {
            const phi = (i / drawingData.samples) * Math.PI * 2;
            const r = superformulaRadius(phi, layerParams);
            const angle = phi + layerParams.rotation;
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
    }
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
    },
    {
        id: 'layerCount',
        label: 'Layer Count',
        target: 'drawingData.layerCount',
        inputType: 'range',
        min: SUPERFORMULA_LIMITS.layerCount.min,
        max: SUPERFORMULA_LIMITS.layerCount.max,
        step: 1,
        default: SUPERFORMULA_LIMITS.layerCount.default,
        description: 'How many rotated layers to emit'
    },
    {
        id: 'layerRotation',
        label: 'Layer Rotation',
        target: 'drawingData.layerRotation',
        inputType: 'range',
        min: SUPERFORMULA_LIMITS.layerRotation.min,
        max: SUPERFORMULA_LIMITS.layerRotation.max,
        step: 0.005,
        default: SUPERFORMULA_LIMITS.layerRotation.default,
        description: 'Rotation offset applied between layers'
    },
    {
        id: 'exponentDrift',
        label: 'Exponent Drift',
        target: 'drawingData.exponentDrift',
        inputType: 'range',
        min: SUPERFORMULA_LIMITS.exponentDrift.min,
        max: SUPERFORMULA_LIMITS.exponentDrift.max,
        step: 0.05,
        default: SUPERFORMULA_LIMITS.exponentDrift.default,
        description: 'Increment applied to exponents per layer'
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
                layerCount: 2,
                layerRotation: 0.1,
                exponentDrift: 0.2,
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
