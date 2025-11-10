import { createSVG, createDrawingBuilder, colorPalettes } from '../shared/clientAdapters.js';
import { SizedDrawingConfig, defineDrawing } from '../shared/index.js';

export class HilbertConfig extends SizedDrawingConfig {
    constructor(params = {}) {
        super(params);
        this.level = params.level || 7;
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

function addWavyEffect(points, amplitude = 1, frequency = 0.1) {
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
    const svg = createSVG(renderContext);
    const builder = createDrawingBuilder({ svg, drawingConfig, renderContext });

    const bounds = hilbert.getBounds({
        paper: {
            width: renderContext.paperWidth,
            height: renderContext.paperHeight
        },
        orientation: renderContext.orientation
    });
    const rawPoints = generateHilbertPoints(hilbert.level, bounds.width, bounds.height);
    const points = builder.projectPoints(rawPoints);

    for (let i = 0; i < points.length - 1; i += 3) {
        const start = i;
        const end = Math.min(i + 3, points.length);
        
        const segmentPoints = points.slice(start, end);
        const wavyPoints = addWavyEffect(segmentPoints, 1, 0.5);
        
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

export const hilbertDrawing = defineDrawing({
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
