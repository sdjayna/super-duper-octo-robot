import { describe, it, expect, beforeAll, afterAll } from 'vitest';

let originalFetch;

beforeAll(() => {
    originalFetch = global.fetch;
    global.fetch = async (resource) => {
        const url = typeof resource === 'string' ? resource : '';
        if (url.includes('plotters')) {
            return {
                ok: true,
                json: async () => ({
                    default: 'axidraw',
                    plotters: {
                        axidraw: {
                            specs: { repeatability_mm: 0.1, cautionSpacing_mm: 0.2, micro_spacing_mm: 0.15 }
                        }
                    }
                })
            };
        }
        return {
            ok: true,
            json: async () => ({
                mediums: {
                    stub: {
                        name: 'Stub Medium',
                        colors: { placeholder: { hex: '#000000', name: 'Placeholder' } }
                    }
                },
                default: 'stub'
            })
        };
    };
});

afterAll(() => {
    global.fetch = originalFetch;
});

const drawingCases = [
    {
        name: 'Lissajous',
        loadConfigClass: async () => (await import('../core/lissajous.js')).lissajousDrawing.configClass,
        params: { freqA: 30, freqB: -5, phase: -1, amplitude: 2, samples: 100 },
        assertions: (config) => {
            expect(config.freqA).toBe(15);
            expect(config.freqB).toBe(2);
            expect(config.phase).toBeCloseTo(0);
            expect(config.amplitude).toBe(1);
            expect(config.samples).toBe(2000);
        }
    },
    {
        name: 'Superformula',
        loadConfigClass: async () => (await import('../core/superformula.js')).superformulaDrawing.configClass,
        params: { m: 50, n1: 0.01, n2: 50, n3: -3, scale: 5, rotation: 40, samples: 1 },
        assertions: (config) => {
            expect(config.m).toBe(12);
            expect(config.n1).toBeCloseTo(0.3);
            expect(config.n2).toBe(8);
            expect(config.n3).toBeCloseTo(0.3);
            expect(config.scale).toBe(1.2);
            expect(config.rotation).toBeCloseTo(Math.PI * 2);
            expect(config.samples).toBe(2000);
        }
    },
    {
        name: 'Clifford',
        loadConfigClass: async () => (await import('../core/clifford.js')).cliffordDrawing.configClass,
        params: { a: 10, b: -10, c: 0, d: 10, iterations: 10000, noise: -10 },
        assertions: (config) => {
            expect(config.a).toBeCloseTo(2.1);
            expect(config.b).toBeCloseTo(1.8);
            expect(config.c).toBeCloseTo(0.1);
            expect(config.d).toBeCloseTo(1.2);
            expect(config.iterations).toBe(150000);
            expect(config.noise).toBe(0);
        }
    },
    {
        name: 'Hilbert',
        loadConfigClass: async () => (await import('../community/hilbert.js')).HilbertConfig,
        params: { level: 20, wavyAmplitude: -1, wavyFrequency: 5, segmentSize: 0 },
        assertions: (config) => {
            expect(config.level).toBe(8);
            expect(config.wavyAmplitude).toBe(0);
            expect(config.wavyFrequency).toBe(2);
            expect(config.segmentSize).toBe(1);
        }
    },
    {
        name: 'Turing',
        loadConfigClass: async () => (await import('../core/turing.js')).turingDrawing.configClass,
        params: {
            feed: 0,
            kill: 1,
            diffusionU: 0.05,
            diffusionV: 0.5,
            steps: 10,
            resolution: 50,
            threshold: 0.9
        },
        assertions: (config) => {
            expect(config.feed).toBeCloseTo(0.02);
            expect(config.kill).toBeCloseTo(0.07);
            expect(config.diffusionU).toBeCloseTo(0.1);
            expect(config.diffusionV).toBeCloseTo(0.15);
            expect(config.steps).toBe(200);
            expect(config.resolution).toBe(200);
            expect(config.threshold).toBeCloseTo(0.35);
        }
    },
    {
        name: 'Phyllotaxis',
        loadConfigClass: async () => (await import('../core/phyllotaxis.js')).phyllotaxisDrawing.configClass,
        params: { divergence: 500, radialStep: 0, pointCount: 10, jitter: -5, rotation: 720 },
        assertions: (config) => {
            expect(config.divergence).toBeCloseTo(150);
            expect(config.radialStep).toBe(3);
            expect(config.pointCount).toBe(600);
            expect(config.jitter).toBe(0);
            expect(config.rotation).toBe(360);
        }
    },
    {
        name: 'Spirograph',
        loadConfigClass: async () => (await import('../core/spirograph.js')).spirographDrawing.configClass,
        params: { R: 1000, r: -10, d: 200, samples: 1, layers: 80, layerOffset: 1 },
        assertions: (config) => {
            expect(config.R).toBe(140);
            expect(config.r).toBe(20);
            expect(config.d).toBe(50);
            expect(config.samples).toBe(4000);
            expect(config.layers).toBe(5);
            expect(config.layerOffset).toBeCloseTo((12 * Math.PI) / 180, 5);
        }
    },
    {
        name: 'Voronoi',
        loadConfigClass: async () => (await import('../core/voronoi.js')).voronoiDrawing.configClass,
        params: { pointCount: 10, relaxationPasses: 99, neighbors: 99, jitter: 5, seed: 0 },
        assertions: (config) => {
            expect(config.pointCount).toBe(150);
            expect(config.relaxationPasses).toBe(3);
            expect(config.neighbors).toBe(5);
            expect(config.jitter).toBe(1);
            expect(config.seed).toBe(1);
        }
    },
    {
        name: 'Flow Field',
        loadConfigClass: async () => (await import('../core/flowField.js')).flowFieldDrawing.configClass,
        params: { noiseScale: 0, stepLength: 10, particleCount: 10, steps: 10000, lineJitter: -2, noiseSeed: 0 },
        assertions: (config) => {
            expect(config.noiseScale).toBeCloseTo(0.01);
            expect(config.stepLength).toBeCloseTo(2);
            expect(config.particleCount).toBe(2000);
            expect(config.steps).toBe(800);
            expect(config.lineJitter).toBe(0);
            expect(config.noiseSeed).toBe(1);
        }
    },
    {
        name: 'Lorenz Attractor',
        loadConfigClass: async () => (await import('../core/lorenz.js')).lorenzDrawing.configClass,
        params: { steps: 1000000, dt: 0, sigma: 1, rho: 100, beta: 0, smoothing: 2 },
        assertions: (config) => {
            expect(config.steps).toBe(400000);
            expect(config.dt).toBeCloseTo(0.002);
            expect(config.sigma).toBe(5);
            expect(config.rho).toBe(35);
            expect(config.beta).toBeCloseTo(2.4);
            expect(config.smoothing).toBe(0.5);
        }
    },
    {
        name: 'Ikeda Attractor',
        loadConfigClass: async () => (await import('../core/ikeda.js')).ikedaDrawing.configClass,
        params: { steps: 1000000, u: 0, smoothing: 1 },
        assertions: (config) => {
            expect(config.steps).toBe(300000);
            expect(config.u).toBeCloseTo(0.7);
            expect(config.smoothing).toBe(0.5);
        }
    },
    {
        name: 'Peter de Jong Attractor',
        loadConfigClass: async () => (await import('../core/dejong.js')).deJongDrawing.configClass,
        params: { steps: 1000000, a: -10, b: 10, c: 0, d: -10, smoothing: 1 },
        assertions: (config) => {
            expect(config.steps).toBe(400000);
            expect(config.a).toBe(-3);
            expect(config.b).toBe(3);
            expect(config.c).toBe(0);
            expect(config.d).toBe(-3);
            expect(config.smoothing).toBe(0.5);
        }
    },
    {
        name: 'Contour Map',
        loadConfigClass: async () => (await import('../core/contour.js')).contourDrawing.configClass,
        params: { frequency: 0.0001, octaves: 50, thresholdSpacing: 5, thresholdCount: 20, rotation: 20, seed: 0 },
        assertions: (config) => {
            expect(config.frequency).toBeCloseTo(0.003);
            expect(config.octaves).toBe(5);
            expect(config.thresholdSpacing).toBeCloseTo(0.6);
            expect(config.thresholdCount).toBe(6);
            expect(config.rotation).toBeCloseTo(Math.PI * 2);
            expect(config.seed).toBe(1);
        }
    },
    {
        name: 'Wave Interference',
        loadConfigClass: async () => (await import('../core/waveInterference.js')).waveInterferenceDrawing.configClass,
        params: { emitterCount: 1, wavelength: 10, thresholdSpacing: 1, thresholdCount: 40, seed: -5 },
        assertions: (config) => {
            expect(config.emitterCount).toBe(3);
            expect(config.wavelength).toBe(60);
            expect(config.thresholdSpacing).toBeCloseTo(0.35);
            expect(config.thresholdCount).toBe(6);
            expect(config.seed).toBe(1);
        }
    },
    {
        name: 'Circle Packing',
        loadConfigClass: async () => (await import('../core/circlePacking.js')).circlePackingDrawing.configClass,
        params: { minRadius: 0, maxRadius: 100, circleCount: 10, spacingFactor: 2, seed: 0 },
        assertions: (config) => {
            expect(config.minRadius).toBe(3);
            expect(config.maxRadius).toBe(18);
            expect(config.circleCount).toBe(200);
            expect(config.spacingFactor).toBeCloseTo(1.2);
            expect(config.seed).toBe(1);
        }
    },
    {
        name: 'DLA',
        loadConfigClass: async () => (await import('../core/dla.js')).dlaDrawing.configClass,
        params: { stickiness: 2, bias: 0, particleCount: 100000, maxRadius: 10, seed: 0 },
        assertions: (config) => {
            expect(config.stickiness).toBeCloseTo(0.9);
            expect(config.bias).toBeCloseTo(0.01);
            expect(config.particleCount).toBe(3500);
            expect(config.maxRadius).toBe(120);
            expect(config.seed).toBe(1);
        }
    },
    {
        name: 'Truchet Tiles',
        loadConfigClass: async () => (await import('../core/truchet.js')).truchetDrawing.configClass,
        params: { columns: 1, rows: 1, motifCount: 80, rotationBias: 0, seed: 0 },
        assertions: (config) => {
            expect(config.columns).toBe(20);
            expect(config.rows).toBe(30);
            expect(config.motifCount).toBe(3);
            expect(config.rotationBias).toBeCloseTo(0.5);
            expect(config.seed).toBe(1);
        }
    },
    {
        name: 'Sorting Arcs',
        loadConfigClass: async () => (await import('../core/sortingArcs.js')).sortingArcsDrawing.configClass,
        params: { arraySize: 10, shuffleStrength: 1, arcHeight: 500, lineWidth: 10, seed: 0 },
        assertions: (config) => {
            expect(config.arraySize).toBe(80);
            expect(config.shuffleStrength).toBeCloseTo(0.4);
            expect(config.arcHeight).toBe(70);
            expect(config.lineWidth).toBeCloseTo(0.3);
            expect(config.seed).toBe(1);
        }
    }
];

describe('drawing config clamps', () => {
    drawingCases.forEach(({ name, loadConfigClass, params, assertions }) => {
        it(`clamps ${name} ranges`, async () => {
            const ConfigClass = await loadConfigClass();
            const config = new ConfigClass(params);
            assertions(config);
        });
    });
});
