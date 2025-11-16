import {
    defineDrawing,
    SizedDrawingConfig,
    createDrawingRuntime,
    colorPalettes
} from '../shared/kit.js';
import { attachControls } from '../shared/controlsUtils.js';
import { clampInteger, clampNumber } from '../shared/utils/paramMath.js';
import { angleFromNoise, createSeededRandom, fractalValueNoise2D } from '../shared/utils/noiseUtils.js';

const ORBIT_LIMITS = {
    particleCount: { min: 300, max: 2000, default: 900 },
    orbitRadius: { min: 1, max: 10, default: 4.5 },
    orbitVariance: { min: 0, max: 0.6, default: 0.2 },
    stepsPerOrbit: { min: 40, max: 140, default: 80 },
    noiseScale: { min: 0.002, max: 0.015, default: 0.0065 },
    decay: { min: 0.9, max: 1.05, default: 0.97 },
    revolutions: { min: 1, max: 4, default: 2 },
    layerCount: { min: 1, max: 4, default: 3 },
    layerRadiusDrift: { min: -0.3, max: 0.4, default: 0.12 },
    jitter: { min: 0, max: 1.2, default: 0.35 },
    seed: { min: 1, max: 9999, default: 707 }
};

class StratifiedOrbitalFieldsConfig extends SizedDrawingConfig {
    constructor(params = {}) {
        super({
            ...params,
            width: params.width ?? 380,
            height: params.height ?? 260
        });
        this.particleCount = clampInteger(params.particleCount, ORBIT_LIMITS.particleCount.min, ORBIT_LIMITS.particleCount.max, ORBIT_LIMITS.particleCount.default);
        this.orbitRadius = clampNumber(params.orbitRadius, ORBIT_LIMITS.orbitRadius.min, ORBIT_LIMITS.orbitRadius.max, ORBIT_LIMITS.orbitRadius.default);
        this.orbitVariance = clampNumber(params.orbitVariance, ORBIT_LIMITS.orbitVariance.min, ORBIT_LIMITS.orbitVariance.max, ORBIT_LIMITS.orbitVariance.default);
        this.stepsPerOrbit = clampInteger(params.stepsPerOrbit, ORBIT_LIMITS.stepsPerOrbit.min, ORBIT_LIMITS.stepsPerOrbit.max, ORBIT_LIMITS.stepsPerOrbit.default);
        this.noiseScale = clampNumber(params.noiseScale, ORBIT_LIMITS.noiseScale.min, ORBIT_LIMITS.noiseScale.max, ORBIT_LIMITS.noiseScale.default);
        this.decay = clampNumber(params.decay, ORBIT_LIMITS.decay.min, ORBIT_LIMITS.decay.max, ORBIT_LIMITS.decay.default);
        this.revolutions = clampInteger(params.revolutions, ORBIT_LIMITS.revolutions.min, ORBIT_LIMITS.revolutions.max, ORBIT_LIMITS.revolutions.default);
        this.layerCount = clampInteger(params.layerCount, ORBIT_LIMITS.layerCount.min, ORBIT_LIMITS.layerCount.max, ORBIT_LIMITS.layerCount.default);
        this.layerRadiusDrift = clampNumber(params.layerRadiusDrift, ORBIT_LIMITS.layerRadiusDrift.min, ORBIT_LIMITS.layerRadiusDrift.max, ORBIT_LIMITS.layerRadiusDrift.default);
        this.jitter = clampNumber(params.jitter, ORBIT_LIMITS.jitter.min, ORBIT_LIMITS.jitter.max, ORBIT_LIMITS.jitter.default);
        this.seed = clampInteger(params.seed, ORBIT_LIMITS.seed.min, ORBIT_LIMITS.seed.max, ORBIT_LIMITS.seed.default);
    }
}

function orbitPath({ center, radius, orientation, config, seedOffset, width, height }) {
    const points = [];
    const rand = createSeededRandom(seedOffset);
    let majorRadius = radius;

    for (let rev = 0; rev < config.revolutions; rev++) {
        const eccentricityNoise = fractalValueNoise2D(center.x * config.noiseScale, center.y * config.noiseScale + rev * 0.5, {
            seed: seedOffset + rev * 13,
            frequency: 1,
            octaves: 3
        });
        const eccentricity = 0.4 + 0.3 * ((eccentricityNoise + 1) / 2);
        const minorRadius = majorRadius * (1 - eccentricity * 0.5);
        for (let step = 0; step <= config.stepsPerOrbit; step++) {
            const t = (step / config.stepsPerOrbit) * Math.PI * 2;
            const localX = Math.cos(t) * majorRadius;
            const localY = Math.sin(t) * minorRadius;
            const rotatedX = localX * Math.cos(orientation) - localY * Math.sin(orientation);
            const rotatedY = localX * Math.sin(orientation) + localY * Math.cos(orientation);
            const jitterX = (rand() - 0.5) * config.jitter;
            const jitterY = (rand() - 0.5) * config.jitter;
            const px = clampNumber(center.x + rotatedX + jitterX, -width * 0.1, width * 1.1);
            const py = clampNumber(center.y + rotatedY + jitterY, -height * 0.1, height * 1.1);
            points.push({ x: px, y: py });
        }
        majorRadius *= config.decay;
    }
    return points;
}

export function drawStratifiedOrbitalFields(drawingConfig, renderContext) {
    const { svg, builder } = createDrawingRuntime({ drawingConfig, renderContext });
    const config = drawingConfig.drawingData;
    const width = renderContext.drawingWidth;
    const height = renderContext.drawingHeight;

    for (let layer = 0; layer < config.layerCount; layer++) {
        const layerSeed = config.seed + layer * 97;
        const rand = createSeededRandom(layerSeed);
        for (let i = 0; i < config.particleCount; i++) {
            const center = {
                x: rand() * width,
                y: rand() * height
            };
            const radiusMod = 1 + layer * config.layerRadiusDrift;
            const variance = 1 + (rand() - 0.5) * config.orbitVariance;
            const baseRadius = config.orbitRadius * radiusMod * variance;
            const orientation = angleFromNoise(center.x * config.noiseScale, center.y * config.noiseScale, {
                seed: layerSeed + i * 31,
                frequency: 1.3,
                octaves: 2,
                persistence: 0.7
            });

            const path = orbitPath({
                center,
                radius: baseRadius,
                orientation: orientation + layer * 0.1,
                config,
                seedOffset: layerSeed + i * 17,
                width,
                height
            });

            if (path.length > 3) {
                builder.appendPath(builder.projectPoints(path), {
                    geometry: {
                        x: center.x - baseRadius,
                        y: center.y - baseRadius,
                        width: baseRadius * 2,
                        height: baseRadius * 2
                    }
                });
            }
        }
    }

    return svg;
}

const stratifiedOrbitalControls = [
    {
        id: 'particleCount',
        label: 'Orbits Per Layer',
        target: 'drawingData.particleCount',
        inputType: 'range',
        min: ORBIT_LIMITS.particleCount.min,
        max: ORBIT_LIMITS.particleCount.max,
        step: 50,
        default: ORBIT_LIMITS.particleCount.default,
        description: 'Number of orbital strands to emit each layer'
    },
    {
        id: 'orbitRadius',
        label: 'Base Radius (mm)',
        target: 'drawingData.orbitRadius',
        inputType: 'range',
        min: ORBIT_LIMITS.orbitRadius.min,
        max: ORBIT_LIMITS.orbitRadius.max,
        step: 0.25,
        default: ORBIT_LIMITS.orbitRadius.default,
        description: 'Nominal orbital radius for A4 sheets'
    },
    {
        id: 'orbitVariance',
        label: 'Radius Variance',
        target: 'drawingData.orbitVariance',
        inputType: 'range',
        min: ORBIT_LIMITS.orbitVariance.min,
        max: ORBIT_LIMITS.orbitVariance.max,
        step: 0.01,
        default: ORBIT_LIMITS.orbitVariance.default,
        description: 'Random radius modifier per strand'
    },
    {
        id: 'stepsPerOrbit',
        label: 'Steps Per Orbit',
        target: 'drawingData.stepsPerOrbit',
        inputType: 'range',
        min: ORBIT_LIMITS.stepsPerOrbit.min,
        max: ORBIT_LIMITS.stepsPerOrbit.max,
        step: 5,
        default: ORBIT_LIMITS.stepsPerOrbit.default,
        description: 'Segments used to approximate each ellipse'
    },
    {
        id: 'noiseScale',
        label: 'Field Scale',
        target: 'drawingData.noiseScale',
        inputType: 'range',
        min: ORBIT_LIMITS.noiseScale.min,
        max: ORBIT_LIMITS.noiseScale.max,
        step: 0.0005,
        default: ORBIT_LIMITS.noiseScale.default,
        description: 'Controls how quickly the orbital field changes'
    },
    {
        id: 'decay',
        label: 'Radius Decay',
        target: 'drawingData.decay',
        inputType: 'range',
        min: ORBIT_LIMITS.decay.min,
        max: ORBIT_LIMITS.decay.max,
        step: 0.005,
        default: ORBIT_LIMITS.decay.default,
        description: 'Radius multiplier applied after each revolution'
    },
    {
        id: 'revolutions',
        label: 'Revolutions',
        target: 'drawingData.revolutions',
        inputType: 'range',
        min: ORBIT_LIMITS.revolutions.min,
        max: ORBIT_LIMITS.revolutions.max,
        step: 1,
        default: ORBIT_LIMITS.revolutions.default,
        description: 'Number of revolutions per orbital strand'
    },
    {
        id: 'layerCount',
        label: 'Layer Count',
        target: 'drawingData.layerCount',
        inputType: 'range',
        min: ORBIT_LIMITS.layerCount.min,
        max: ORBIT_LIMITS.layerCount.max,
        step: 1,
        default: ORBIT_LIMITS.layerCount.default,
        description: 'Number of seeded layers with slight drift'
    },
    {
        id: 'layerRadiusDrift',
        label: 'Radius Drift / Layer',
        target: 'drawingData.layerRadiusDrift',
        inputType: 'range',
        min: ORBIT_LIMITS.layerRadiusDrift.min,
        max: ORBIT_LIMITS.layerRadiusDrift.max,
        step: 0.01,
        default: ORBIT_LIMITS.layerRadiusDrift.default,
        description: 'Scale factor applied per-layer to orbit radius'
    },
    {
        id: 'jitter',
        label: 'Jitter',
        target: 'drawingData.jitter',
        inputType: 'range',
        min: ORBIT_LIMITS.jitter.min,
        max: ORBIT_LIMITS.jitter.max,
        step: 0.01,
        default: ORBIT_LIMITS.jitter.default,
        description: 'Random offset added every step for looseness'
    },
    {
        id: 'seed',
        label: 'Seed',
        target: 'drawingData.seed',
        inputType: 'number',
        min: ORBIT_LIMITS.seed.min,
        max: ORBIT_LIMITS.seed.max,
        step: 1,
        default: ORBIT_LIMITS.seed.default,
        description: 'Seed controlling field + orbit placement'
    }
];

const stratifiedOrbitalFieldsDefinition = attachControls(defineDrawing({
    id: 'stratifiedOrbitalFields',
    name: 'Stratified Orbital Fields',
    configClass: StratifiedOrbitalFieldsConfig,
    drawFunction: drawStratifiedOrbitalFields,
    presets: [
        {
            key: 'orbitalStrata',
            name: 'Orbital Strata',
            params: {
                type: 'stratifiedOrbitalFields',
                width: 380,
                height: 260,
                particleCount: 900,
                orbitRadius: 4,
                orbitVariance: 0.25,
                stepsPerOrbit: 88,
                noiseScale: 0.007,
                decay: 0.965,
                revolutions: 3,
                layerCount: 3,
                layerRadiusDrift: 0.08,
                jitter: 0.3,
                seed: 901,
                line: { strokeWidth: 0.18 },
                colorPalette: colorPalettes.sakuraPalette
            }
        }
    ]
}), stratifiedOrbitalControls);

export const stratifiedOrbitalFieldsDrawing = stratifiedOrbitalFieldsDefinition;
export default stratifiedOrbitalFieldsDefinition;
