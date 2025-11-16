import {
    defineDrawing,
    SizedDrawingConfig,
    createDrawingRuntime,
    colorPalettes
} from '../shared/kit.js';
import { attachControls } from '../shared/controlsUtils.js';
import { clampInteger, clampNumber } from '../shared/utils/paramMath.js';

const PHYLLOTAXIS_LIMITS = {
    divergence: { min: 120, max: 150, default: 137.5 },
    radialStep: { min: 3, max: 6, default: 4.5 },
    pointCount: { min: 600, max: 1200, default: 900 },
    jitter: { min: 0, max: 0.6, default: 0.3 },
    rotation: { min: 0, max: 360, default: 0 }
};

class PhyllotaxisConfig extends SizedDrawingConfig {
    constructor(params = {}) {
        super(params);
        this.divergence = clampNumber(params.divergence, PHYLLOTAXIS_LIMITS.divergence.min, PHYLLOTAXIS_LIMITS.divergence.max, PHYLLOTAXIS_LIMITS.divergence.default);
        this.radialStep = clampNumber(params.radialStep, PHYLLOTAXIS_LIMITS.radialStep.min, PHYLLOTAXIS_LIMITS.radialStep.max, PHYLLOTAXIS_LIMITS.radialStep.default);
        this.pointCount = clampInteger(params.pointCount, PHYLLOTAXIS_LIMITS.pointCount.min, PHYLLOTAXIS_LIMITS.pointCount.max, PHYLLOTAXIS_LIMITS.pointCount.default);
        this.jitter = clampNumber(params.jitter, PHYLLOTAXIS_LIMITS.jitter.min, PHYLLOTAXIS_LIMITS.jitter.max, PHYLLOTAXIS_LIMITS.jitter.default);
        this.rotation = clampNumber(params.rotation, PHYLLOTAXIS_LIMITS.rotation.min, PHYLLOTAXIS_LIMITS.rotation.max, PHYLLOTAXIS_LIMITS.rotation.default);
        this.connect = params.connect ?? false;
    }
}

export function drawPhyllotaxis(drawingConfig, renderContext) {
    const { svg, builder } = createDrawingRuntime({ drawingConfig, renderContext });
    const data = drawingConfig.drawingData;
    const points = [];
    const centerX = renderContext.drawingWidth / 2;
    const centerY = renderContext.drawingHeight / 2;
    const maxRadius = Math.min(renderContext.drawingWidth, renderContext.drawingHeight) / 2 - data.radialStep;

    for (let i = 0; i < data.pointCount; i++) {
        const radius = Math.min(Math.sqrt(i) * data.radialStep, maxRadius);
        const angle = (data.divergence * i + data.rotation) * (Math.PI / 180);
        const jitterX = data.jitter * (Math.random() - 0.5);
        const jitterY = data.jitter * (Math.random() - 0.5);
        points.push({
            x: centerX + Math.cos(angle) * radius + jitterX,
            y: centerY + Math.sin(angle) * radius + jitterY
        });
    }

    if (!points.length) {
        return svg;
    }

    if (data.connect) {
        builder.appendPath(builder.projectPoints(points), {
            geometry: {
                x: 0,
                y: 0,
                width: renderContext.drawingWidth,
                height: renderContext.drawingHeight
            }
        });
    } else {
        points.forEach(point => {
            const rect = builder.projectRect({
                x: point.x - 0.5,
                y: point.y - 0.5,
                width: 1,
                height: 1
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
    }

    return svg;
}

const phyllotaxisControls = [
    {
        id: 'divergence',
        label: 'Divergence Angle',
        target: 'drawingData.divergence',
        inputType: 'range',
        min: PHYLLOTAXIS_LIMITS.divergence.min,
        max: PHYLLOTAXIS_LIMITS.divergence.max,
        step: 0.5,
        default: PHYLLOTAXIS_LIMITS.divergence.default,
        description: 'Angle between successive seeds (degrees)'
    },
    {
        id: 'radialStep',
        label: 'Radial Step',
        target: 'drawingData.radialStep',
        inputType: 'range',
        min: PHYLLOTAXIS_LIMITS.radialStep.min,
        max: PHYLLOTAXIS_LIMITS.radialStep.max,
        step: 0.1,
        default: PHYLLOTAXIS_LIMITS.radialStep.default,
        description: 'Distance growth between seeds'
    },
    {
        id: 'pointCount',
        label: 'Seed Count',
        target: 'drawingData.pointCount',
        inputType: 'range',
        min: PHYLLOTAXIS_LIMITS.pointCount.min,
        max: PHYLLOTAXIS_LIMITS.pointCount.max,
        step: 50,
        default: PHYLLOTAXIS_LIMITS.pointCount.default,
        description: 'Total number of seeds plotted'
    },
    {
        id: 'jitter',
        label: 'Jitter',
        target: 'drawingData.jitter',
        inputType: 'range',
        min: PHYLLOTAXIS_LIMITS.jitter.min,
        max: PHYLLOTAXIS_LIMITS.jitter.max,
        step: 0.05,
        default: PHYLLOTAXIS_LIMITS.jitter.default,
        description: 'Random offset applied to each seed'
    },
    {
        id: 'rotation',
        label: 'Rotation',
        target: 'drawingData.rotation',
        inputType: 'range',
        min: PHYLLOTAXIS_LIMITS.rotation.min,
        max: PHYLLOTAXIS_LIMITS.rotation.max,
        step: 1,
        default: PHYLLOTAXIS_LIMITS.rotation.default,
        description: 'Overall rotation offset (degrees)'
    },
    {
        id: 'connect',
        label: 'Connect Seeds',
        target: 'drawingData.connect',
        inputType: 'checkbox',
        default: false,
        description: 'Draw a continuous path through seeds'
    }
];

const phyllotaxisDefinition = attachControls(defineDrawing({
    id: 'phyllotaxis',
    name: 'Phyllotaxis',
    configClass: PhyllotaxisConfig,
    drawFunction: drawPhyllotaxis,
    presets: [
        {
            key: 'phyllotaxisSunflower',
            name: 'Sunflower Spiral',
            params: {
                type: 'phyllotaxis',
                width: 260,
                height: 260,
                divergence: 137.5,
                radialStep: 4,
                pointCount: 1200,
                jitter: 0.2,
                connect: false,
                line: {
                    strokeWidth: 0.25
                },
                colorPalette: colorPalettes.yonoPalette || colorPalettes.sakuraPalette
            }
        }
    ]
}), phyllotaxisControls);

export const phyllotaxisDrawing = phyllotaxisDefinition;
export default phyllotaxisDefinition;
