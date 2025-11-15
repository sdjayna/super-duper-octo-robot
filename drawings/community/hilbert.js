import {
    defineDrawing,
    SizedDrawingConfig,
    createDrawingRuntime,
    colorPalettes
} from '../shared/kit.js';
import { attachControls } from '../shared/controlsUtils.js';

export class HilbertConfig extends SizedDrawingConfig {
    constructor(params = {}) {
        super(params);
        this.level = params.level || 7;
        this.wavyAmplitude = typeof params.wavyAmplitude === 'number' ? params.wavyAmplitude : 1;
        this.wavyFrequency = typeof params.wavyFrequency === 'number' ? params.wavyFrequency : 0.5;
        this.segmentSize = typeof params.segmentSize === 'number' ? params.segmentSize : 3;
    }

    getBounds({ paper, orientation } = {}) {
        const width = Number(paper?.width ?? this.bounds.width);
        const height = Number(paper?.height ?? this.bounds.height);
        const longer = Math.max(width, height);
        const shorter = Math.min(width, height);
        const isPortrait = orientation === 'portrait';
        return {
            minX: 0,
            minY: 0,
            width: isPortrait ? shorter : longer,
            height: isPortrait ? longer : shorter
        };
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

    const bounds = hilbert.getBounds({
        paper: {
            width: renderContext.paperWidth,
            height: renderContext.paperHeight
        },
        orientation: renderContext.orientation
    });
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
            min: 1,
            max: 10,
            step: 1,
            default: 7,
            valueType: 'number',
            description: 'Recursion depth (higher levels add exponentially more segments and finer detail)'
        },
        {
            id: 'wavyAmplitude',
            label: 'Wavy Amplitude',
            target: 'drawingData.wavyAmplitude',
            inputType: 'range',
            min: 0,
            max: 5,
            step: 0.1,
            default: 1,
            valueType: 'number',
            description: 'Amount of sinusoidal offset applied to each segment for organic “wobble”'
        },
        {
            id: 'wavyFrequency',
            label: 'Wavy Frequency',
            target: 'drawingData.wavyFrequency',
            inputType: 'range',
            min: 0,
            max: 2,
            step: 0.05,
            default: 0.5,
            valueType: 'number',
            description: 'How fast the sinusoidal offset oscillates along the curve'
        },
        {
            id: 'segmentSize',
            label: 'Segment Size',
            target: 'drawingData.segmentSize',
            inputType: 'range',
            min: 1,
            max: 10000,
            step: 1,
            default: 3,
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
                level: 7,
                wavyAmplitude: 1,
                wavyFrequency: 0.5,
                segmentSize: 3,
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
