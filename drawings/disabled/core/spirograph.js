import {
    defineDrawing,
    SizedDrawingConfig,
    createDrawingRuntime,
    colorPalettes,
    ensureColorReachableLimit
} from '../shared/kit.js';
import { attachControls } from '../shared/controlsUtils.js';
import { clampInteger, clampNumber } from '../shared/utils/paramMath.js';

const derivedLayerCountMax = ensureColorReachableLimit(5);

const SPIRO_LIMITS = {
    R: { min: 80, max: 140, default: 110 },
    r: { min: 20, max: 70, default: 45 },
    d: { min: 10, max: 50, default: 30 },
    samples: { min: 4000, max: 12000, default: 8000 },
    layers: { min: 1, max: derivedLayerCountMax, default: 3 },
    layerOffset: { min: (2 * Math.PI) / 180, max: (12 * Math.PI) / 180, default: (5 * Math.PI) / 180 },
    phase: { min: 0, max: Math.PI * 2, default: 0 }
};

class SpirographConfig extends SizedDrawingConfig {
    constructor(params = {}) {
        super(params);
        this.R = clampNumber(params.R, SPIRO_LIMITS.R.min, SPIRO_LIMITS.R.max, SPIRO_LIMITS.R.default);
        this.r = clampNumber(params.r, SPIRO_LIMITS.r.min, SPIRO_LIMITS.r.max, SPIRO_LIMITS.r.default);
        this.d = clampNumber(params.d, SPIRO_LIMITS.d.min, SPIRO_LIMITS.d.max, SPIRO_LIMITS.d.default);
        this.samples = clampInteger(params.samples, SPIRO_LIMITS.samples.min, SPIRO_LIMITS.samples.max, SPIRO_LIMITS.samples.default);
        this.mode = params.mode === 'hypotrochoid' ? 'hypotrochoid' : 'epicycloid';
        this.phase = clampNumber(params.phase, SPIRO_LIMITS.phase.min, SPIRO_LIMITS.phase.max, SPIRO_LIMITS.phase.default);
        this.layers = clampInteger(params.layers, SPIRO_LIMITS.layers.min, SPIRO_LIMITS.layers.max, SPIRO_LIMITS.layers.default);
        this.layerOffset = clampNumber(params.layerOffset, SPIRO_LIMITS.layerOffset.min, SPIRO_LIMITS.layerOffset.max, SPIRO_LIMITS.layerOffset.default);
    }
}

function spirographPoint(t, cfg, layerIndex = 0) {
    const sign = cfg.mode === 'hypotrochoid' ? 1 : -1;
    const angle = t + cfg.phase + layerIndex * cfg.layerOffset;
    const R = cfg.R;
    const r = cfg.r;
    const d = cfg.d;
    const factor = (R + sign * r) / r;
    const x = (R + sign * r) * Math.cos(angle) - sign * d * Math.cos(factor * angle);
    const y = (R + sign * r) * Math.sin(angle) - d * Math.sin(factor * angle);
    return { x, y };
}

export function drawSpirograph(drawingConfig, renderContext) {
    const { svg, builder } = createDrawingRuntime({ drawingConfig, renderContext });
    const config = drawingConfig.drawingData;
    const scale = Math.min(renderContext.drawingWidth, renderContext.drawingHeight) / (2 * (config.R + config.r + config.d));
    const centerX = renderContext.drawingWidth / 2;
    const centerY = renderContext.drawingHeight / 2;

    for (let layer = 0; layer < config.layers; layer++) {
        const points = [];
        for (let i = 0; i <= config.samples; i++) {
            const t = (i / config.samples) * Math.PI * 2 * config.r;
            const pt = spirographPoint(t, config, layer);
            points.push({
                x: centerX + pt.x * scale,
                y: centerY + pt.y * scale
            });
        }
        builder.appendPath(builder.projectPoints(points), {
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

const spirographControls = [
    {
        id: 'mode',
        label: 'Mode',
        target: 'drawingData.mode',
        inputType: 'select',
        options: [
            { label: 'Epicycloid', value: 'epicycloid' },
            { label: 'Hypotrochoid', value: 'hypotrochoid' }
        ],
        default: 'epicycloid',
        description: 'Choose whether the rolling circle is outside or inside'
    },
    {
        id: 'R',
        label: 'Outer Radius (R)',
        target: 'drawingData.R',
        inputType: 'range',
        min: SPIRO_LIMITS.R.min,
        max: SPIRO_LIMITS.R.max,
        step: 1,
        default: SPIRO_LIMITS.R.default,
        description: 'Radius of the fixed circle'
    },
    {
        id: 'r',
        label: 'Inner Radius (r)',
        target: 'drawingData.r',
        inputType: 'range',
        min: SPIRO_LIMITS.r.min,
        max: SPIRO_LIMITS.r.max,
        step: 1,
        default: SPIRO_LIMITS.r.default,
        description: 'Radius of the rolling circle'
    },
    {
        id: 'd',
        label: 'Pen Offset (d)',
        target: 'drawingData.d',
        inputType: 'range',
        min: SPIRO_LIMITS.d.min,
        max: SPIRO_LIMITS.d.max,
        step: 1,
        default: SPIRO_LIMITS.d.default,
        description: 'Distance from the center of the rolling circle to the pen'
    },
    {
        id: 'samples',
        label: 'Resolution',
        target: 'drawingData.samples',
        inputType: 'range',
        min: SPIRO_LIMITS.samples.min,
        max: SPIRO_LIMITS.samples.max,
        step: 200,
        default: SPIRO_LIMITS.samples.default,
        description: 'Number of segments used to trace the curve'
    },
    {
        id: 'layers',
        label: 'Layers',
        target: 'drawingData.layers',
        inputType: 'range',
        min: SPIRO_LIMITS.layers.min,
        max: SPIRO_LIMITS.layers.max,
        step: 1,
        default: SPIRO_LIMITS.layers.default,
        description: 'Number of layered curves with phase offsets'
    },
    {
        id: 'layerOffset',
        label: 'Layer Offset',
        target: 'drawingData.layerOffset',
        inputType: 'range',
        min: SPIRO_LIMITS.layerOffset.min,
        max: SPIRO_LIMITS.layerOffset.max,
        step: 0.005,
        default: SPIRO_LIMITS.layerOffset.default,
        description: 'Phase offset applied between layers'
    }
];

const spirographDefinition = attachControls(defineDrawing({
    id: 'spirograph',
    name: 'Spirograph',
    configClass: SpirographConfig,
    drawFunction: drawSpirograph,
    presets: [
        {
            key: 'spirographClassic',
            name: 'Classic Spirograph',
            params: {
                type: 'spirograph',
                width: 260,
                height: 260,
                mode: 'hypotrochoid',
                R: 120,
                r: 40,
                d: 35,
                layers: 2,
                layerOffset: (6 * Math.PI) / 180,
                samples: 8000,
                line: {
                    strokeWidth: 0.3
                },
                colorPalette: colorPalettes.sakuraPalette
            }
        }
    ]
}), spirographControls);

export const spirographDrawing = spirographDefinition;
export default spirographDefinition;
