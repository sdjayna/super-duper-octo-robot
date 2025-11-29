import {
    defineDrawing,
    SizedDrawingConfig,
    createDrawingRuntime,
    colorPalettes
} from '../shared/kit.js';
import { attachControls } from '../shared/controlsUtils.js';
import { clampInteger, clampNumber } from '../shared/utils/paramMath.js';

const HILBERT_LIMITS = {
    level: { min: 1, max: 8, default: 6 },
    amplitude: { min: 0, max: 5, default: 1 },
    frequency: { min: 0, max: 2, default: 0.5 },
    segmentSize: { min: 1, max: 10000, default: 3 }
};

export class HilbertConfig extends SizedDrawingConfig {
    constructor(params = {}) {
        super({
            ...params,
            width: params.width ?? 260,
            height: params.height ?? 260
        });
        this.level = clampInteger(params.level, HILBERT_LIMITS.level.min, HILBERT_LIMITS.level.max, HILBERT_LIMITS.level.default);
        this.wavyAmplitude = clampNumber(params.wavyAmplitude, HILBERT_LIMITS.amplitude.min, HILBERT_LIMITS.amplitude.max, HILBERT_LIMITS.amplitude.default);
        this.wavyFrequency = clampNumber(params.wavyFrequency, HILBERT_LIMITS.frequency.min, HILBERT_LIMITS.frequency.max, HILBERT_LIMITS.frequency.default);
        this.segmentSize = clampInteger(params.segmentSize, HILBERT_LIMITS.segmentSize.min, HILBERT_LIMITS.segmentSize.max, HILBERT_LIMITS.segmentSize.default);
    }

    toArray() {
        return [this.level];
    }
}

function generateHilbertPoints(order, width, height) {
    let n = Math.max(0, Math.floor(order));
    if (n > 10) {
        console.warn(`Clamping Hilbert level ${n} to 10 for performance reasons.`);
        n = 10;
    }
    const gridSize = 1 << n;
    const totalPoints = gridSize * gridSize;
    const maxCoord = Math.max(gridSize - 1, 1);
    const scaleX = width / maxCoord;
    const scaleY = height / maxCoord;
    const points = new Array(totalPoints);

    for (let index = 0; index < totalPoints; index++) {
        const { x, y } = hilbertIndexToXY(index, n);
        points[index] = {
            x: x * scaleX,
            y: y * scaleY
        };
    }
    return points;
}

function hilbertIndexToXY(index, order) {
    let x = 0;
    let y = 0;
    let t = index;
    for (let s = 1; s < (1 << order); s <<= 1) {
        const rx = 1 & (t >> 1);
        const ry = 1 & (t ^ rx);
        [x, y] = hilbertRotate(s, x, y, rx, ry);
        x += s * rx;
        y += s * ry;
        t >>= 2;
    }
    return { x, y };
}

function hilbertRotate(n, x, y, rx, ry) {
    if (ry === 0) {
        if (rx === 1) {
            x = n - 1 - x;
            y = n - 1 - y;
        }
        return [y, x];
    }
    return [x, y];
}

function addWavyEffect(points, amplitude, frequency) {
    return points.map((point, index) => {
        const angle = frequency * index;
        const dx = amplitude * Math.sin(angle);
        const dy = amplitude * Math.cos(angle);
        return {
            x: point.x + dx,
            y: point.y + dy,
        };
    });
}

export function drawHilbertCurve(drawingConfig, renderContext) {
    const hilbert = drawingConfig.drawingData;
    const { svg, builder } = createDrawingRuntime({ drawingConfig, renderContext });

    const bounds = renderContext.bounds;
    const rawPoints = generateHilbertPoints(hilbert.level, bounds.width, bounds.height);
    const points = builder.projectPoints(rawPoints);
    const segmentSize = Math.max(2, Math.floor(hilbert.segmentSize) || 3);
    const amplitude = typeof hilbert.wavyAmplitude === 'number' ? hilbert.wavyAmplitude : 1;
    const frequency = typeof hilbert.wavyFrequency === 'number' ? hilbert.wavyFrequency : 0.5;

    for (let i = 0; i < points.length - 1; i += segmentSize) {
        const start = i;
        const end = Math.min(i + segmentSize, points.length);
        
        const segmentPoints = points.slice(start, end);
        const wavyPoints = addWavyEffect(segmentPoints, amplitude, frequency);
        
        builder.appendPath(wavyPoints, {
            geometry: {
                x: wavyPoints[0].x,
                y: wavyPoints[0].y,
                width: 1,
                height: 1
            }
        });
    }

    return svg;
}

const hilbertControls = [
        {
            id: 'level',
            label: 'Hilbert Level',
            target: 'drawingData.level',
            inputType: 'range',
            min: HILBERT_LIMITS.level.min,
            max: HILBERT_LIMITS.level.max,
            step: 1,
            default: HILBERT_LIMITS.level.default,
            valueType: 'number',
            description: 'Recursion depth (higher levels add exponentially more segments and finer detail)'
        },
        {
            id: 'wavyAmplitude',
            label: 'Wavy Amplitude',
            target: 'drawingData.wavyAmplitude',
            inputType: 'range',
            min: HILBERT_LIMITS.amplitude.min,
            max: HILBERT_LIMITS.amplitude.max,
            step: 0.1,
            default: HILBERT_LIMITS.amplitude.default,
            valueType: 'number',
            description: 'Amount of sinusoidal offset applied to each segment for organic “wobble”'
        },
        {
            id: 'wavyFrequency',
            label: 'Wavy Frequency',
            target: 'drawingData.wavyFrequency',
            inputType: 'range',
            min: HILBERT_LIMITS.frequency.min,
            max: HILBERT_LIMITS.frequency.max,
            step: 0.05,
            default: HILBERT_LIMITS.frequency.default,
            valueType: 'number',
            description: 'How fast the sinusoidal offset oscillates along the curve'
        },
        {
            id: 'segmentSize',
            label: 'Segment Size',
            target: 'drawingData.segmentSize',
            inputType: 'range',
            min: HILBERT_LIMITS.segmentSize.min,
            max: HILBERT_LIMITS.segmentSize.max,
            step: 1,
            default: HILBERT_LIMITS.segmentSize.default,
            valueType: 'number',
            description: 'How many Hilbert points are grouped into one path before the wavy offset is recalculated',
            inputMin: 0,
            inputMax: 1000,
            scale: 'log10',
            scalePrecision: 0,
            inputStep: 1
        }
];

const hilbertDefinition = attachControls(defineDrawing({
    id: 'hilbert',
    name: 'Hilbert Curve',
    configClass: HilbertConfig,
    drawFunction: drawHilbertCurve,
    presets: [
        {
            key: 'hilbertCurve',
            name: 'Hilbert Curve',
            params: {
                type: 'hilbert',
                level: 6,
                wavyAmplitude: 1,
                wavyFrequency: 0.5,
                segmentSize: 3,
                width: 260,
                height: 260,
                line: {
                    spacing: 1.5,
                    strokeWidth: 0.5,
                    vertexGap: 0
                },
                colorPalette: colorPalettes.sakuraPalette
            }
        }
    ]
}), hilbertControls);

export const hilbertDrawing = hilbertDefinition;
export default hilbertDefinition;
