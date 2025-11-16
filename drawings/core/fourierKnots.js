import {
    defineDrawing,
    SizedDrawingConfig,
    createDrawingRuntime,
    colorPalettes,
    ensureColorReachableLimit
} from '../shared/kit.js';
import { attachControls } from '../shared/controlsUtils.js';
import { clampInteger, clampNumber } from '../shared/utils/paramMath.js';
import { createSeededRandom } from '../shared/utils/noiseUtils.js';

const derivedLayerCountMax = ensureColorReachableLimit(4);

const FOURIER_LIMITS = {
    harmonics: { min: 2, max: 5, default: 3 },
    amplitude: { min: 5, max: 80, default: 30 },
    phaseSkew: { min: 0, max: Math.PI * 2, default: 0.3 },
    projectionAngle: { min: 0, max: Math.PI / 3, default: Math.PI / 8 },
    samples: { min: 1500, max: 6000, default: 3600 },
    layerCount: { min: 1, max: derivedLayerCountMax, default: 3 },
    layerRotation: { min: 0, max: 0.5, default: 0.15 },
    seed: { min: 1, max: 9999, default: 1201 }
};

class FourierKnotConfig extends SizedDrawingConfig {
    constructor(params = {}) {
        super({
            ...params,
            width: params.width ?? 360,
            height: params.height ?? 260
        });
        this.harmonics = clampInteger(params.harmonics, FOURIER_LIMITS.harmonics.min, FOURIER_LIMITS.harmonics.max, FOURIER_LIMITS.harmonics.default);
        this.amplitude = clampNumber(params.amplitude, FOURIER_LIMITS.amplitude.min, FOURIER_LIMITS.amplitude.max, FOURIER_LIMITS.amplitude.default);
        this.phaseSkew = clampNumber(params.phaseSkew, FOURIER_LIMITS.phaseSkew.min, FOURIER_LIMITS.phaseSkew.max, FOURIER_LIMITS.phaseSkew.default);
        this.projectionAngle = clampNumber(params.projectionAngle, FOURIER_LIMITS.projectionAngle.min, FOURIER_LIMITS.projectionAngle.max, FOURIER_LIMITS.projectionAngle.default);
        this.samples = clampInteger(params.samples, FOURIER_LIMITS.samples.min, FOURIER_LIMITS.samples.max, FOURIER_LIMITS.samples.default);
        this.layerCount = clampInteger(params.layerCount, FOURIER_LIMITS.layerCount.min, FOURIER_LIMITS.layerCount.max, FOURIER_LIMITS.layerCount.default);
        this.layerRotation = clampNumber(params.layerRotation, FOURIER_LIMITS.layerRotation.min, FOURIER_LIMITS.layerRotation.max, FOURIER_LIMITS.layerRotation.default);
        this.seed = clampInteger(params.seed, FOURIER_LIMITS.seed.min, FOURIER_LIMITS.seed.max, FOURIER_LIMITS.seed.default);
    }
}

function buildCoefficients(config) {
    const rand = createSeededRandom(config.seed);
    const coefficients = [];
    for (let i = 1; i <= config.harmonics; i++) {
        coefficients.push({
            index: i,
            ax: rand() * 2 - 1,
            ay: rand() * 2 - 1,
            az: rand() * 2 - 1,
            phaseX: rand() * Math.PI * 2,
            phaseY: rand() * Math.PI * 2,
            phaseZ: rand() * Math.PI * 2
        });
    }
    return coefficients;
}

function evaluateFourier(t, coefficients, amplitude, phaseSkew) {
    let x = 0;
    let y = 0;
    let z = 0;
    coefficients.forEach(coeff => {
        const freq = coeff.index;
        x += coeff.ax * Math.sin(freq * t + coeff.phaseX + phaseSkew);
        y += coeff.ay * Math.sin(freq * t + coeff.phaseY);
        z += coeff.az * Math.sin(freq * t + coeff.phaseZ - phaseSkew);
    });
    return {
        x: x * amplitude,
        y: y * amplitude,
        z: z * amplitude * 0.6
    };
}

function projectPoint(point, angle, tilt = 0.25) {
    const cosA = Math.cos(angle);
    const sinA = Math.sin(angle);
    const x = point.x * cosA - point.z * sinA;
    const y = point.y + point.x * sinA * tilt + point.z * cosA * 0.3;
    return { x, y };
}

function normalizePoints(points, width, height) {
    let minX = Infinity;
    let maxX = -Infinity;
    let minY = Infinity;
    let maxY = -Infinity;
    points.forEach(point => {
        if (point.x < minX) minX = point.x;
        if (point.x > maxX) maxX = point.x;
        if (point.y < minY) minY = point.y;
        if (point.y > maxY) maxY = point.y;
    });
    const spanX = Math.max(maxX - minX, 1e-3);
    const spanY = Math.max(maxY - minY, 1e-3);
    const scale = Math.min(width / spanX, height / spanY) * 0.9;
    const centerX = (minX + maxX) / 2;
    const centerY = (minY + maxY) / 2;
    return points.map(point => ({
        x: width / 2 + (point.x - centerX) * scale,
        y: height / 2 + (point.y - centerY) * scale
    }));
}

export function drawFourierKnotManifolds(drawingConfig, renderContext) {
    const { svg, builder } = createDrawingRuntime({ drawingConfig, renderContext });
    const config = drawingConfig.drawingData;
    const width = renderContext.drawingWidth;
    const height = renderContext.drawingHeight;
    const coefficients = buildCoefficients(config);

    for (let layer = 0; layer < config.layerCount; layer++) {
        const amplitude = config.amplitude * (1 + layer * 0.08);
        const phase = config.phaseSkew + layer * 0.25;
        const projection = config.projectionAngle + layer * config.layerRotation;
        const rawPoints = [];
        for (let i = 0; i <= config.samples; i++) {
            const t = (i / config.samples) * Math.PI * 2;
            const point = evaluateFourier(t, coefficients, amplitude, phase);
            rawPoints.push(projectPoint(point, projection));
        }
        const points = normalizePoints(rawPoints, width, height);
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

const fourierKnotControls = [
    {
        id: 'harmonics',
        label: 'Harmonics',
        target: 'drawingData.harmonics',
        inputType: 'range',
        min: FOURIER_LIMITS.harmonics.min,
        max: FOURIER_LIMITS.harmonics.max,
        step: 1,
        default: FOURIER_LIMITS.harmonics.default,
        description: 'Number of Fourier terms to include'
    },
    {
        id: 'amplitude',
        label: 'Amplitude (mm)',
        target: 'drawingData.amplitude',
        inputType: 'range',
        min: FOURIER_LIMITS.amplitude.min,
        max: FOURIER_LIMITS.amplitude.max,
        step: 1,
        default: FOURIER_LIMITS.amplitude.default,
        description: 'Base amplitude informing curve extent'
    },
    {
        id: 'phaseSkew',
        label: 'Phase Skew',
        target: 'drawingData.phaseSkew',
        inputType: 'range',
        min: FOURIER_LIMITS.phaseSkew.min,
        max: FOURIER_LIMITS.phaseSkew.max,
        step: 0.01,
        default: FOURIER_LIMITS.phaseSkew.default,
        description: 'Phase offset applied to X/Z components'
    },
    {
        id: 'projectionAngle',
        label: 'Projection Angle',
        target: 'drawingData.projectionAngle',
        inputType: 'range',
        min: FOURIER_LIMITS.projectionAngle.min,
        max: FOURIER_LIMITS.projectionAngle.max,
        step: 0.01,
        default: FOURIER_LIMITS.projectionAngle.default,
        description: 'Rotation angle for projecting the knot'
    },
    {
        id: 'samples',
        label: 'Samples',
        target: 'drawingData.samples',
        inputType: 'range',
        min: FOURIER_LIMITS.samples.min,
        max: FOURIER_LIMITS.samples.max,
        step: 100,
        default: FOURIER_LIMITS.samples.default,
        description: 'Poly-line resolution'
    },
    {
        id: 'layerCount',
        label: 'Layer Count',
        target: 'drawingData.layerCount',
        inputType: 'range',
        min: FOURIER_LIMITS.layerCount.min,
        max: FOURIER_LIMITS.layerCount.max,
        step: 1,
        default: FOURIER_LIMITS.layerCount.default,
        description: 'Number of projection layers'
    },
    {
        id: 'layerRotation',
        label: 'Layer Rotation',
        target: 'drawingData.layerRotation',
        inputType: 'range',
        min: FOURIER_LIMITS.layerRotation.min,
        max: FOURIER_LIMITS.layerRotation.max,
        step: 0.01,
        default: FOURIER_LIMITS.layerRotation.default,
        description: 'Additional projection angle per layer'
    },
    {
        id: 'seed',
        label: 'Seed',
        target: 'drawingData.seed',
        inputType: 'number',
        min: FOURIER_LIMITS.seed.min,
        max: FOURIER_LIMITS.seed.max,
        step: 1,
        default: FOURIER_LIMITS.seed.default,
        description: 'Seed controlling Fourier coefficients'
    }
];

const fourierKnotDefinition = attachControls(defineDrawing({
    id: 'fourierKnotManifolds',
    name: 'Fourier Knot Manifolds',
    configClass: FourierKnotConfig,
    drawFunction: drawFourierKnotManifolds,
    presets: [
        {
            key: 'fourierKnots',
            name: 'Fourier Knots',
            params: {
                type: 'fourierKnotManifolds',
                width: 360,
                height: 260,
                harmonics: 3,
                amplitude: 32,
                phaseSkew: 0.4,
                projectionAngle: Math.PI / 7,
                samples: 3600,
                layerCount: 3,
                layerRotation: 0.12,
                seed: 1201,
                line: { strokeWidth: 0.22 },
                colorPalette: colorPalettes.sakuraPalette
            }
        }
    ]
}), fourierKnotControls);

export const fourierKnotManifoldsDrawing = fourierKnotDefinition;
export default fourierKnotDefinition;
