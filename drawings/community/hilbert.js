import {
    defineDrawing,
    SizedDrawingConfig,
    createDrawingRuntime,
    colorPalettes
} from '../shared/kit.js';

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

function generateHilbertPoints(n, width, height) {
    const points = [];
    const size = Math.max(width, height);

    if (n < 0 || n > 10) {
        console.warn(`Invalid Hilbert level: ${n}. Using level 3.`);
        n = 3;
    }

    function hilbert(x0, y0, xi, xj, yi, yj, n) {
        if (n < 0) return;
        
        if (n <= 0) {
            points.push({ x: x0 + (xi + yi) / 2, y: y0 + (xj + yj) / 2 });
        } else {
            hilbert(x0, y0, yi / 2, yj / 2, xi / 2, xj / 2, n - 1);
            hilbert(x0 + xi / 2, y0 + xj / 2, xi / 2, xj / 2, yi / 2, yj / 2, n - 1);
            hilbert(x0 + xi / 2 + yi / 2, y0 + xj / 2 + yj / 2, xi / 2, xj / 2, yi / 2, yj / 2, n - 1);
            hilbert(x0 + xi / 2 + yi, y0 + xj / 2 + yj, -yi / 2, -yj / 2, -xi / 2, -xj / 2, n - 1);
        }
    }

    hilbert(0, 0, size, 0, 0, size, n);

    const scaleX = width / size;
    const scaleY = height / size;
    return points.map(({ x, y }) => ({
        x: x * scaleX,
        y: y * scaleY,
    }));
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
        description: 'Controls recursion depth'
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
        description: 'Offsets curve points for organic feel'
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
        description: 'Controls oscillation speed'
    },
    {
        id: 'segmentSize',
        label: 'Segment Size',
        target: 'drawingData.segmentSize',
        inputType: 'number',
        min: 2,
        max: 10,
        step: 1,
        default: 3,
        valueType: 'number',
        description: 'Number of Hilbert points per path segment'
    }
];

const hilbertDefinition = defineDrawing({
    id: 'hilbert',
    name: 'Hilbert Curve',
    configClass: HilbertConfig,
    drawFunction: drawHilbertCurve,
    controls: hilbertControls,
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
});

// Defensive: ensure controls remain attached even if cached clients pull an older helper.
if (!Array.isArray(hilbertDefinition.controls) || !hilbertDefinition.controls.length) {
    hilbertDefinition.controls = hilbertControls;
}

export const hilbertDrawing = hilbertDefinition;
export default hilbertDefinition;
