import {
    defineDrawing,
    SizedDrawingConfig,
    createDrawingRuntime,
    colorPalettes
} from '../shared/kit.js';
import { attachControls } from '../shared/controlsUtils.js';
import { generateContourPaths } from '../shared/utils/contourUtils.js';
import { clampInteger, clampNumber } from '../shared/utils/paramMath.js';

const CONTOUR_LIMITS = {
    frequency: { min: 0.003, max: 0.02, default: 0.008 },
    octaves: { min: 2, max: 5, default: 3 },
    thresholdSpacing: { min: 0.2, max: 0.6, default: 0.3 },
    thresholdCount: { min: 3, max: 6, default: 4 },
    rotation: { min: 0, max: Math.PI * 2, default: 0.25 },
    seed: { min: 1, max: 9999, default: 77 }
};

class ContourConfig extends SizedDrawingConfig {
    constructor(params = {}) {
        super({
            ...params,
            width: params.width ?? 400,
            height: params.height ?? 280
        });
        this.frequency = clampNumber(params.frequency, CONTOUR_LIMITS.frequency.min, CONTOUR_LIMITS.frequency.max, CONTOUR_LIMITS.frequency.default);
        this.octaves = clampInteger(params.octaves, CONTOUR_LIMITS.octaves.min, CONTOUR_LIMITS.octaves.max, CONTOUR_LIMITS.octaves.default);
        this.thresholdSpacing = clampNumber(params.thresholdSpacing, CONTOUR_LIMITS.thresholdSpacing.min, CONTOUR_LIMITS.thresholdSpacing.max, CONTOUR_LIMITS.thresholdSpacing.default);
        this.thresholdCount = clampInteger(params.thresholdCount, CONTOUR_LIMITS.thresholdCount.min, CONTOUR_LIMITS.thresholdCount.max, CONTOUR_LIMITS.thresholdCount.default);
        this.seed = clampInteger(params.seed, CONTOUR_LIMITS.seed.min, CONTOUR_LIMITS.seed.max, CONTOUR_LIMITS.seed.default);
        this.rotation = clampNumber(params.rotation, CONTOUR_LIMITS.rotation.min, CONTOUR_LIMITS.rotation.max, CONTOUR_LIMITS.rotation.default);
    }
}

function resolveContourConfig(config = {}) {
    return {
        frequency: config.frequency ?? CONTOUR_LIMITS.frequency.default,
        octaves: config.octaves ?? CONTOUR_LIMITS.octaves.default,
        thresholdSpacing: config.thresholdSpacing ?? CONTOUR_LIMITS.thresholdSpacing.default,
        thresholdCount: config.thresholdCount ?? CONTOUR_LIMITS.thresholdCount.default,
        rotation: config.rotation ?? CONTOUR_LIMITS.rotation.default,
        seed: config.seed ?? CONTOUR_LIMITS.seed.default
    };
}

function contourNoise(x, y, config) {
    let value = 0;
    let amp = 1;
    let freq = config.frequency;
    for (let i = 0; i < config.octaves; i++) {
        value += amp * Math.sin((x * Math.cos(config.rotation) - y * Math.sin(config.rotation) + config.seed * 13) * freq)
            * Math.cos((x * Math.sin(config.rotation) + y * Math.cos(config.rotation) + config.seed * 7) * freq * 1.3);
        freq *= 1.9;
        amp *= 0.6;
    }
    return value;
}

export function drawContourMap(drawingConfig, renderContext) {
    const { svg, builder } = createDrawingRuntime({ drawingConfig, renderContext });
    const config = resolveContourConfig(drawingConfig.drawingData);
    const thresholds = [];
    for (let i = -Math.floor(config.thresholdCount / 2); i <= Math.floor(config.thresholdCount / 2); i++) {
        thresholds.push(i * config.thresholdSpacing);
    }

    const paths = generateContourPaths({
        width: renderContext.drawingWidth,
        height: renderContext.drawingHeight,
        cols: 220,
        fieldFn: (x, y) => contourNoise(x, y, config),
        thresholds
    });

    paths.forEach(path => {
        builder.appendPath(builder.projectPoints(path), {
            geometry: {
                x: 0,
                y: 0,
                width: renderContext.drawingWidth,
                height: renderContext.drawingHeight
            }
        });
    });

    return svg;
}

const contourControls = [
    {
        id: 'frequency',
        label: 'Noise Frequency',
        target: 'drawingData.frequency',
        inputType: 'range',
        min: CONTOUR_LIMITS.frequency.min,
        max: CONTOUR_LIMITS.frequency.max,
        step: 0.0005,
        default: CONTOUR_LIMITS.frequency.default,
        description: 'Base noise frequency for the elevation field'
    },
    {
        id: 'octaves',
        label: 'Noise Octaves',
        target: 'drawingData.octaves',
        inputType: 'range',
        min: CONTOUR_LIMITS.octaves.min,
        max: CONTOUR_LIMITS.octaves.max,
        step: 1,
        default: CONTOUR_LIMITS.octaves.default,
        description: 'Number of layered noise octaves'
    },
    {
        id: 'thresholdSpacing',
        label: 'Contour Spacing',
        target: 'drawingData.thresholdSpacing',
        inputType: 'range',
        min: CONTOUR_LIMITS.thresholdSpacing.min,
        max: CONTOUR_LIMITS.thresholdSpacing.max,
        step: 0.05,
        default: CONTOUR_LIMITS.thresholdSpacing.default,
        description: 'Spacing between contour levels'
    },
    {
        id: 'thresholdCount',
        label: 'Contour Levels',
        target: 'drawingData.thresholdCount',
        inputType: 'range',
        min: CONTOUR_LIMITS.thresholdCount.min,
        max: CONTOUR_LIMITS.thresholdCount.max,
        step: 1,
        default: CONTOUR_LIMITS.thresholdCount.default,
        description: 'Number of contour levels to draw'
    },
    {
        id: 'rotation',
        label: 'Noise Rotation',
        target: 'drawingData.rotation',
        inputType: 'range',
        min: CONTOUR_LIMITS.rotation.min,
        max: CONTOUR_LIMITS.rotation.max,
        step: 0.01,
        default: CONTOUR_LIMITS.rotation.default,
        description: 'Rotate the noise field to avoid repetition'
    },
    {
        id: 'seed',
        label: 'Seed',
        target: 'drawingData.seed',
        inputType: 'number',
        min: CONTOUR_LIMITS.seed.min,
        max: CONTOUR_LIMITS.seed.max,
        step: 1,
        default: CONTOUR_LIMITS.seed.default,
        description: 'Random seed for contour variation'
    }
];

const contourDefinition = attachControls(defineDrawing({
    id: 'contour',
    name: 'Contour Map',
    configClass: ContourConfig,
    drawFunction: drawContourMap,
    presets: [
        {
            key: 'contourHighlands',
            name: 'Highland Contours',
            params: {
                type: 'contour',
                width: 400,
                height: 280,
                frequency: 0.012,
                octaves: 4,
                thresholdSpacing: 0.25,
                thresholdCount: 5,
                rotation: 0.4,
                line: {
                    strokeWidth: 0.25
                },
                colorPalette: colorPalettes.sakuraPalette
            }
        }
    ]
}), contourControls);

export const contourDrawing = contourDefinition;
export default contourDefinition;
