import {
    defineDrawing,
    SizedDrawingConfig,
    createDrawingRuntime,
    colorPalettes
} from '../shared/kit.js';
import { attachControls } from '../shared/controlsUtils.js';
import { generateContourPaths } from '../shared/utils/contourUtils.js';
import { clampInteger, clampNumber } from '../shared/utils/paramMath.js';

const WAVE_LIMITS = {
    emitterCount: { min: 3, max: 7, default: 5 },
    wavelength: { min: 60, max: 200, default: 140 },
    thresholdSpacing: { min: 0.15, max: 0.35, default: 0.2 },
    thresholdCount: { min: 3, max: 6, default: 4 },
    seed: { min: 1, max: 9999, default: 19 }
};

class WaveInterferenceConfig extends SizedDrawingConfig {
    constructor(params = {}) {
        super({
            ...params,
            width: params.width ?? 380,
            height: params.height ?? 260
        });
        this.emitterCount = clampInteger(params.emitterCount, WAVE_LIMITS.emitterCount.min, WAVE_LIMITS.emitterCount.max, WAVE_LIMITS.emitterCount.default);
        this.wavelength = clampNumber(params.wavelength, WAVE_LIMITS.wavelength.min, WAVE_LIMITS.wavelength.max, WAVE_LIMITS.wavelength.default);
        this.thresholdSpacing = clampNumber(params.thresholdSpacing, WAVE_LIMITS.thresholdSpacing.min, WAVE_LIMITS.thresholdSpacing.max, WAVE_LIMITS.thresholdSpacing.default);
        this.thresholdCount = clampInteger(params.thresholdCount, WAVE_LIMITS.thresholdCount.min, WAVE_LIMITS.thresholdCount.max, WAVE_LIMITS.thresholdCount.default);
        this.seed = clampInteger(params.seed, WAVE_LIMITS.seed.min, WAVE_LIMITS.seed.max, WAVE_LIMITS.seed.default);
    }
}

function buildEmitters(config, width, height) {
    const rand = pseudoRandom(config.seed);
    const emitters = [];
    for (let i = 0; i < config.emitterCount; i++) {
        emitters.push({
            x: rand() * width,
            y: rand() * height,
            phase: rand() * Math.PI * 2
        });
    }
    return emitters;
}

function waveField(x, y, emitters, config) {
    let sum = 0;
    emitters.forEach(emitter => {
        const dist = Math.hypot(x - emitter.x, y - emitter.y);
        const angle = (dist / config.wavelength) * Math.PI * 2 + emitter.phase;
        sum += Math.sin(angle);
    });
    return sum / emitters.length;
}

export function drawWaveInterference(drawingConfig, renderContext) {
    const { svg, builder } = createDrawingRuntime({ drawingConfig, renderContext });
    const config = drawingConfig.drawingData;
    const emitters = buildEmitters(config, renderContext.drawingWidth, renderContext.drawingHeight);
    const thresholds = [];
    for (let i = 0; i < config.thresholdCount; i++) {
        thresholds.push(-1 + i * config.thresholdSpacing);
    }

    const paths = generateContourPaths({
        width: renderContext.drawingWidth,
        height: renderContext.drawingHeight,
        cols: 200,
        fieldFn: (x, y) => waveField(x, y, emitters, config),
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

function pseudoRandom(seed) {
    let state = seed % 2147483647;
    return () => {
        state = (state * 48271) % 2147483647;
        return (state - 1) / 2147483646;
    };
}

const waveControls = [
    {
        id: 'emitterCount',
        label: 'Emitters',
        target: 'drawingData.emitterCount',
        inputType: 'range',
        min: WAVE_LIMITS.emitterCount.min,
        max: WAVE_LIMITS.emitterCount.max,
        step: 1,
        default: WAVE_LIMITS.emitterCount.default,
        description: 'Number of wave emitters'
    },
    {
        id: 'wavelength',
        label: 'Wavelength (mm)',
        target: 'drawingData.wavelength',
        inputType: 'range',
        min: WAVE_LIMITS.wavelength.min,
        max: WAVE_LIMITS.wavelength.max,
        step: 1,
        default: WAVE_LIMITS.wavelength.default,
        description: 'Wave frequency converted to millimeters'
    },
    {
        id: 'thresholdSpacing',
        label: 'Contour Spacing',
        target: 'drawingData.thresholdSpacing',
        inputType: 'range',
        min: WAVE_LIMITS.thresholdSpacing.min,
        max: WAVE_LIMITS.thresholdSpacing.max,
        step: 0.01,
        default: WAVE_LIMITS.thresholdSpacing.default,
        description: 'Spacing between interference contour lines'
    },
    {
        id: 'thresholdCount',
        label: 'Contour Levels',
        target: 'drawingData.thresholdCount',
        inputType: 'range',
        min: WAVE_LIMITS.thresholdCount.min,
        max: WAVE_LIMITS.thresholdCount.max,
        step: 1,
        default: WAVE_LIMITS.thresholdCount.default,
        description: 'Number of contour levels'
    },
    {
        id: 'seed',
        label: 'Seed',
        target: 'drawingData.seed',
        inputType: 'number',
        min: WAVE_LIMITS.seed.min,
        max: WAVE_LIMITS.seed.max,
        step: 1,
        default: WAVE_LIMITS.seed.default,
        description: 'Random seed for emitter placement and phase'
    }
];

const waveDefinition = attachControls(defineDrawing({
    id: 'waveInterference',
    name: 'Wave Interference',
    configClass: WaveInterferenceConfig,
    drawFunction: drawWaveInterference,
    presets: [
        {
            key: 'waveRipples',
            name: 'Ripple Fields',
            params: {
                type: 'waveInterference',
                width: 380,
                height: 260,
                emitterCount: 6,
                wavelength: 140,
                thresholdSpacing: 0.2,
                thresholdCount: 5,
                line: {
                    strokeWidth: 0.22
                },
                colorPalette: colorPalettes.sakuraPalette
            }
        }
    ]
}), waveControls);

export const waveInterferenceDrawing = waveDefinition;
export default waveDefinition;
