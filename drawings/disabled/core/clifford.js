import {
    defineDrawing,
    SizedDrawingConfig,
    createDrawingRuntime,
    colorPalettes
} from '../shared/kit.js';
import { attachControls } from '../shared/controlsUtils.js';
import { clampInteger, clampNumber } from '../shared/utils/paramMath.js';

const CLIFFORD_LIMITS = {
    a: { min: 1.6, max: 2.1, default: 1.8 },
    b: { min: 1.8, max: 2.1, default: 2.0 },
    c: { min: 0.1, max: 0.5, default: 0.3 },
    d: { min: 0.6, max: 1.2, default: 0.9 },
    iterations: { min: 150000, max: 400000, default: 220000 },
    noise: { min: 0, max: 0.12, default: 0.08 }
};

class CliffordConfig extends SizedDrawingConfig {
    constructor(params = {}) {
        super(params);
        this.a = clampNumber(params.a, CLIFFORD_LIMITS.a.min, CLIFFORD_LIMITS.a.max, CLIFFORD_LIMITS.a.default);
        this.b = clampNumber(params.b, CLIFFORD_LIMITS.b.min, CLIFFORD_LIMITS.b.max, CLIFFORD_LIMITS.b.default);
        this.c = clampNumber(params.c, CLIFFORD_LIMITS.c.min, CLIFFORD_LIMITS.c.max, CLIFFORD_LIMITS.c.default);
        this.d = clampNumber(params.d, CLIFFORD_LIMITS.d.min, CLIFFORD_LIMITS.d.max, CLIFFORD_LIMITS.d.default);
        this.iterations = clampInteger(params.iterations, CLIFFORD_LIMITS.iterations.min, CLIFFORD_LIMITS.iterations.max, CLIFFORD_LIMITS.iterations.default);
        this.noise = clampNumber(params.noise, CLIFFORD_LIMITS.noise.min, CLIFFORD_LIMITS.noise.max, CLIFFORD_LIMITS.noise.default);
    }
}

export function drawClifford(drawingConfig, renderContext) {
    const { svg, builder } = createDrawingRuntime({ drawingConfig, renderContext });
    const { a, b, c, d, iterations, noise } = drawingConfig.drawingData;
    const points = new Array(iterations);
    let x = 0.1;
    let y = 0.1;
    let minX = Infinity;
    let maxX = -Infinity;
    let minY = Infinity;
    let maxY = -Infinity;

    for (let i = 0; i < iterations; i++) {
        const newX = Math.sin(a * y) + c * Math.cos(a * x);
        const newY = Math.sin(b * x) + d * Math.cos(b * y);
        x = newX;
        y = newY;
        if (noise > 0) {
            x += (Math.random() - 0.5) * noise;
            y += (Math.random() - 0.5) * noise;
        }
        points[i] = { x, y };
        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;
    }

    const rangeX = Math.max(maxX - minX, 1e-5);
    const rangeY = Math.max(maxY - minY, 1e-5);
    const width = renderContext.drawingWidth;
    const height = renderContext.drawingHeight;
    const normalized = points.map(p => ({
        x: ((p.x - minX) / rangeX) * width,
        y: ((p.y - minY) / rangeY) * height
    }));

    builder.appendPath(builder.projectPoints(normalized), {
        geometry: {
            x: 0,
            y: 0,
            width,
            height
        }
    });

    return svg;
}

const cliffordControls = [
    {
        id: 'a',
        label: 'Parameter a',
        target: 'drawingData.a',
        inputType: 'range',
        min: CLIFFORD_LIMITS.a.min,
        max: CLIFFORD_LIMITS.a.max,
        step: 0.01,
        default: CLIFFORD_LIMITS.a.default,
        description: 'Clifford attractor parameter a'
    },
    {
        id: 'b',
        label: 'Parameter b',
        target: 'drawingData.b',
        inputType: 'range',
        min: CLIFFORD_LIMITS.b.min,
        max: CLIFFORD_LIMITS.b.max,
        step: 0.01,
        default: CLIFFORD_LIMITS.b.default,
        description: 'Clifford attractor parameter b'
    },
    {
        id: 'c',
        label: 'Parameter c',
        target: 'drawingData.c',
        inputType: 'range',
        min: CLIFFORD_LIMITS.c.min,
        max: CLIFFORD_LIMITS.c.max,
        step: 0.01,
        default: CLIFFORD_LIMITS.c.default,
        description: 'Clifford attractor parameter c'
    },
    {
        id: 'd',
        label: 'Parameter d',
        target: 'drawingData.d',
        inputType: 'range',
        min: CLIFFORD_LIMITS.d.min,
        max: CLIFFORD_LIMITS.d.max,
        step: 0.01,
        default: CLIFFORD_LIMITS.d.default,
        description: 'Clifford attractor parameter d'
    },
    {
        id: 'iterations',
        label: 'Iterations',
        target: 'drawingData.iterations',
        inputType: 'range',
        min: CLIFFORD_LIMITS.iterations.min,
        max: CLIFFORD_LIMITS.iterations.max,
        step: 5000,
        default: CLIFFORD_LIMITS.iterations.default,
        description: 'Number of iterations used to trace the attractor'
    },
    {
        id: 'noise',
        label: 'Noise',
        target: 'drawingData.noise',
        inputType: 'range',
        min: CLIFFORD_LIMITS.noise.min,
        max: CLIFFORD_LIMITS.noise.max,
        step: 0.005,
        default: CLIFFORD_LIMITS.noise.default,
        description: 'Random perturbation applied per step'
    }
];

const cliffordDefinition = attachControls(defineDrawing({
    id: 'clifford',
    name: 'Clifford Attractor',
    configClass: CliffordConfig,
    drawFunction: drawClifford,
    presets: [
        {
            key: 'cliffordClassic',
            name: 'Classic Clifford',
            params: {
                type: 'clifford',
                width: 250,
                height: 200,
                a: 1.8,
                b: 2.0,
                c: 0.3,
                d: 0.9,
                iterations: 200000,
                noise: 0.05,
                line: {
                    strokeWidth: 0.25
                },
                colorPalette: colorPalettes.yonoPalette || colorPalettes.sakuraPalette
            }
        }
    ]
}), cliffordControls);

export const cliffordDrawing = cliffordDefinition;
export default cliffordDefinition;
