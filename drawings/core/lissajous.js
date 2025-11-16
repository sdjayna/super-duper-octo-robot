import {
    defineDrawing,
    SizedDrawingConfig,
    createDrawingRuntime,
    colorPalettes
} from '../shared/kit.js';
import { attachControls } from '../shared/controlsUtils.js';
import { clampInteger, clampNumber } from '../shared/utils/paramMath.js';

const LISSAJOUS_LIMITS = {
    freqA: { min: 2, max: 15, default: 5 },
    freqB: { min: 2, max: 15, default: 7 },
    phase: { min: 0, max: Math.PI, default: 0.25 },
    amplitude: { min: 0.3, max: 1, default: 0.85 },
    samples: { min: 2000, max: 5000, default: 3200 },
    layerCount: { min: 1, max: 4, default: 2 },
    phaseDrift: { min: 0, max: 0.6, default: 0.15 },
    frequencyDrift: { min: 0, max: 2, default: 0.5 }
};

class LissajousConfig extends SizedDrawingConfig {
    constructor(params = {}) {
        super(params);
        this.freqA = clampNumber(params.freqA, LISSAJOUS_LIMITS.freqA.min, LISSAJOUS_LIMITS.freqA.max, LISSAJOUS_LIMITS.freqA.default);
        this.freqB = clampNumber(params.freqB, LISSAJOUS_LIMITS.freqB.min, LISSAJOUS_LIMITS.freqB.max, LISSAJOUS_LIMITS.freqB.default);
        this.phase = clampNumber(params.phase, LISSAJOUS_LIMITS.phase.min, LISSAJOUS_LIMITS.phase.max, LISSAJOUS_LIMITS.phase.default);
        this.amplitude = clampNumber(params.amplitude, LISSAJOUS_LIMITS.amplitude.min, LISSAJOUS_LIMITS.amplitude.max, LISSAJOUS_LIMITS.amplitude.default);
        this.samples = clampInteger(params.samples, LISSAJOUS_LIMITS.samples.min, LISSAJOUS_LIMITS.samples.max, LISSAJOUS_LIMITS.samples.default);
        this.layerCount = clampInteger(params.layerCount, LISSAJOUS_LIMITS.layerCount.min, LISSAJOUS_LIMITS.layerCount.max, LISSAJOUS_LIMITS.layerCount.default);
        this.phaseDrift = clampNumber(params.phaseDrift, LISSAJOUS_LIMITS.phaseDrift.min, LISSAJOUS_LIMITS.phaseDrift.max, LISSAJOUS_LIMITS.phaseDrift.default);
        this.frequencyDrift = clampNumber(params.frequencyDrift, LISSAJOUS_LIMITS.frequencyDrift.min, LISSAJOUS_LIMITS.frequencyDrift.max, LISSAJOUS_LIMITS.frequencyDrift.default);
    }
}

export function drawLissajous(drawingConfig, renderContext) {
    const { svg, builder } = createDrawingRuntime({ drawingConfig, renderContext });
    const {
        freqA,
        freqB,
        phase,
        amplitude,
        samples,
        layerCount = LISSAJOUS_LIMITS.layerCount.default,
        phaseDrift = LISSAJOUS_LIMITS.phaseDrift.default,
        frequencyDrift = LISSAJOUS_LIMITS.frequencyDrift.default
    } = drawingConfig.drawingData;
    const width = renderContext.drawingWidth;
    const height = renderContext.drawingHeight;
    const scaleX = (width / 2) * amplitude;
    const scaleY = (height / 2) * amplitude;
    const centerX = width / 2;
    const centerY = height / 2;
    for (let layer = 0; layer < layerCount; layer++) {
        const layerPhase = phase + layer * phaseDrift;
        const drift = 1 + layer * frequencyDrift * 0.05;
        const points = [];

        for (let i = 0; i <= samples; i++) {
            const t = (i / samples) * Math.PI * 2;
            const x = centerX + Math.sin(freqA * drift * t + layerPhase) * scaleX;
            const y = centerY + Math.sin(freqB * drift * t) * scaleY;
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

const lissajousControls = [
    {
        id: 'freqA',
        label: 'Frequency A',
        target: 'drawingData.freqA',
        inputType: 'range',
        min: LISSAJOUS_LIMITS.freqA.min,
        max: LISSAJOUS_LIMITS.freqA.max,
        step: 1,
        default: LISSAJOUS_LIMITS.freqA.default,
        description: 'Frequency along the X axis (controls horizontal lobes)'
    },
    {
        id: 'freqB',
        label: 'Frequency B',
        target: 'drawingData.freqB',
        inputType: 'range',
        min: LISSAJOUS_LIMITS.freqB.min,
        max: LISSAJOUS_LIMITS.freqB.max,
        step: 1,
        default: LISSAJOUS_LIMITS.freqB.default,
        description: 'Frequency along the Y axis (controls vertical lobes)'
    },
    {
        id: 'phase',
        label: 'Phase Offset',
        target: 'drawingData.phase',
        inputType: 'range',
        min: LISSAJOUS_LIMITS.phase.min,
        max: LISSAJOUS_LIMITS.phase.max,
        step: 0.01,
        default: LISSAJOUS_LIMITS.phase.default,
        description: 'Phase offset between X/Y oscillations'
    },
    {
        id: 'amplitude',
        label: 'Amplitude',
        target: 'drawingData.amplitude',
        inputType: 'range',
        min: LISSAJOUS_LIMITS.amplitude.min,
        max: LISSAJOUS_LIMITS.amplitude.max,
        step: 0.05,
        default: LISSAJOUS_LIMITS.amplitude.default,
        description: 'Overall scale factor (relative to paper bounds)'
    },
    {
        id: 'samples',
        label: 'Resolution',
        target: 'drawingData.samples',
        inputType: 'range',
        min: LISSAJOUS_LIMITS.samples.min,
        max: LISSAJOUS_LIMITS.samples.max,
        step: 100,
        default: LISSAJOUS_LIMITS.samples.default,
        description: 'Number of samples used to trace the curve'
    },
    {
        id: 'layerCount',
        label: 'Layer Count',
        target: 'drawingData.layerCount',
        inputType: 'range',
        min: LISSAJOUS_LIMITS.layerCount.min,
        max: LISSAJOUS_LIMITS.layerCount.max,
        step: 1,
        default: LISSAJOUS_LIMITS.layerCount.default,
        description: 'How many phased layers to draw'
    },
    {
        id: 'phaseDrift',
        label: 'Phase Drift',
        target: 'drawingData.phaseDrift',
        inputType: 'range',
        min: LISSAJOUS_LIMITS.phaseDrift.min,
        max: LISSAJOUS_LIMITS.phaseDrift.max,
        step: 0.01,
        default: LISSAJOUS_LIMITS.phaseDrift.default,
        description: 'Phase offset applied per layer'
    },
    {
        id: 'frequencyDrift',
        label: 'Frequency Drift',
        target: 'drawingData.frequencyDrift',
        inputType: 'range',
        min: LISSAJOUS_LIMITS.frequencyDrift.min,
        max: LISSAJOUS_LIMITS.frequencyDrift.max,
        step: 0.05,
        default: LISSAJOUS_LIMITS.frequencyDrift.default,
        description: 'Multiplier nudging frequencies per layer'
    }
];

const lissajousDefinition = attachControls(defineDrawing({
    id: 'lissajous',
    name: 'Lissajous Curves',
    configClass: LissajousConfig,
    drawFunction: drawLissajous,
    presets: [
        {
            key: 'lissajousClassic',
            name: 'Classic Lissajous',
            params: {
                type: 'lissajous',
                width: 250,
                height: 250,
                freqA: 7,
                freqB: 5,
                phase: 0.25,
                amplitude: 0.9,
                samples: 3200,
                layerCount: 2,
                phaseDrift: 0.18,
                frequencyDrift: 0.4,
                line: {
                    strokeWidth: 0.35
                },
                colorPalette: colorPalettes.sakuraPalette
            }
        }
    ]
}), lissajousControls);

export const lissajousDrawing = lissajousDefinition;
export default lissajousDefinition;
