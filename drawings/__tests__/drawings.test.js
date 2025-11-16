/**
 * @vitest-environment jsdom
 */

import { describe, it, expect, beforeAll } from 'vitest';
import { createRenderContext } from '../../client/js/renderContext.js';
import { createTestPalette, createTestRenderContext, createTestDrawingConfig } from '../../client/js/__tests__/helpers/drawingTestUtils.js';

const palette = createTestPalette();

let drawBouwkampCode;
let drawHilbertCurve;
let HilbertConfig;
let drawCalibrationPatterns;
let CalibrationConfig;
let drawLissajous;
let drawSuperformula;
let drawClifford;
let drawTuringPatterns;
let drawPhyllotaxis;
let drawSpirograph;
let drawVoronoiSketch;
let VoronoiConfig;
let drawFlowField;
let drawLorenzAttractor;
let drawIkedaAttractor;
let drawDeJongAttractor;
let drawContourMap;
let drawWaveInterference;
let drawCirclePacking;
let drawTruchetTiles;
let drawSortingArcs;
let registerDrawing;
let addDrawingPreset;
let drawingRegistry;

beforeAll(async () => {
    const originalFetch = global.fetch;
    global.fetch = async (resource) => {
        const url = typeof resource === 'string' ? resource : '';
        if (url.includes('plotters')) {
            return {
                ok: true,
                json: async () => ({
                    default: 'axidraw',
                    plotters: {
                        axidraw: {
                            specs: {
                                repeatability_mm: 0.1,
                                cautionSpacing_mm: 0.2,
                                micro_spacing_mm: 0.15
                            }
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
                        colors: {
                            placeholder: { hex: '#000000', name: 'Placeholder' },
                            accent: { hex: '#ff0000', name: 'Accent' },
                            highlight: { hex: '#00ff00', name: 'Highlight' },
                            shadow: { hex: '#0000ff', name: 'Shadow' },
                            outline: { hex: '#888888', name: 'Outline' }
                        }
                    }
                },
                default: 'stub'
            })
        };
    };

    drawingRegistry = await import('../../client/js/drawingRegistry.js');
    ({ drawBouwkampCode } = await import('../core/bouwkamp.js'));
    ({ drawHilbertCurve, HilbertConfig } = await import('../community/hilbert.js'));
    ({ drawCalibrationPatterns, CalibrationConfig } = await import('../core/calibration.js'));
    ({ drawLissajous } = await import('../core/lissajous.js'));
    ({ drawSuperformula } = await import('../core/superformula.js'));
    ({ drawClifford } = await import('../core/clifford.js'));
    ({ drawTuringPatterns } = await import('../core/turing.js'));
    ({ drawPhyllotaxis } = await import('../core/phyllotaxis.js'));
    ({ drawSpirograph } = await import('../core/spirograph.js'));
    ({ drawVoronoiSketch, VoronoiConfig } = await import('../core/voronoi.js'));
    ({ drawFlowField } = await import('../core/flowField.js'));
    ({ drawLorenzAttractor } = await import('../core/lorenz.js'));
    ({ drawIkedaAttractor } = await import('../core/ikeda.js'));
    ({ drawDeJongAttractor } = await import('../core/dejong.js'));
    ({ drawContourMap } = await import('../core/contour.js'));
    ({ drawWaveInterference } = await import('../core/waveInterference.js'));
    ({ drawCirclePacking } = await import('../core/circlePacking.js'));
    ({ drawTruchetTiles } = await import('../core/truchet.js'));
    ({ drawSortingArcs } = await import('../core/sortingArcs.js'));

    global.fetch = originalFetch;
});

describe('drawing functions', () => {
    it('renders Bouwkamp drawing with selectable hatch styles', () => {
        const buildConfig = (overrides = {}) => createTestDrawingConfig({
            drawingData: {
                order: 1,
                width: 40,
                height: 40,
                squares: [40]
            },
            line: {
                spacing: 2,
                strokeWidth: 0.4,
                vertexGap: 0.5,
                hatchStyle: overrides.hatchStyle
            },
            colorPalette: palette
        });

        const renderContext = createTestRenderContext({
            drawingWidth: 40,
            drawingHeight: 40
        });

        const serpentineSvg = drawBouwkampCode(buildConfig({ hatchStyle: 'serpentine' }), renderContext);
        const scanlineSvg = drawBouwkampCode(buildConfig({ hatchStyle: 'scanline' }), renderContext);
        const outlineSvg = drawBouwkampCode(buildConfig({ hatchStyle: 'none' }), renderContext);

        const serpentinePathData = serpentineSvg.querySelectorAll('path')[0].getAttribute('d');
        const scanlinePathData = scanlineSvg.querySelectorAll('path')[0].getAttribute('d');
        const outlinePathData = outlineSvg.querySelectorAll('path')[0].getAttribute('d');

        expect(serpentinePathData).toBeTruthy();
        expect(scanlinePathData).toBeTruthy();
        expect(outlinePathData).toBeTruthy();
        expect(serpentinePathData).not.toBe(scanlinePathData);
    });

    it('aligns Voronoi bounds with the paper aspect ratio', () => {
        const config = new VoronoiConfig({ width: 200, height: 180 });
        const paper = { width: 297, height: 210 };
        const landscapeBounds = config.getBounds({ paper, orientation: 'landscape' });
        const portraitBounds = config.getBounds({ paper, orientation: 'portrait' });
        expect(landscapeBounds.width / landscapeBounds.height).toBeCloseTo(297 / 210, 3);
        expect(portraitBounds.width / portraitBounds.height).toBeCloseTo(210 / 297, 3);
    });

    it('applies hatch styles to Voronoi cells', () => {
        const buildConfig = (style, showEdges = true, cellInset = 0) => createTestDrawingConfig({
            drawingData: {
                pointCount: 12,
                relaxationPasses: 1,
                neighbors: 3,
                boundary: 'rect',
                jitter: 0,
                seed: 21,
                showEdges,
                cellInset
            },
            line: {
                spacing: 1.2,
                hatchStyle: style,
                hatchInset: 0.4,
                includeBoundary: true
            },
            colorPalette: palette
        });

        const renderContext = createTestRenderContext({
            drawingWidth: 60,
            drawingHeight: 40
        });

        const scanlineSvg = drawVoronoiSketch(buildConfig('scanline'), renderContext);
        const serpentineSvg = drawVoronoiSketch(buildConfig('serpentine'), renderContext);
        const outlineSvg = drawVoronoiSketch(buildConfig('none'), renderContext);
        const scanlineNoEdgesSvg = drawVoronoiSketch(buildConfig('scanline', false), renderContext);
        const scanlineInsetSvg = drawVoronoiSketch(buildConfig('scanline', true, 2), renderContext);

        const scanlinePathData = scanlineSvg.querySelector('path')?.getAttribute('d');
        const serpentinePathData = serpentineSvg.querySelector('path')?.getAttribute('d');
        const outlinePathData = outlineSvg.querySelector('path')?.getAttribute('d');
        const pathCountWithEdges = scanlineSvg.querySelectorAll('path').length;
        const pathCountWithoutEdges = scanlineNoEdgesSvg.querySelectorAll('path').length;
        const insetPathData = scanlineInsetSvg.querySelector('path')?.getAttribute('d');

        expect(scanlinePathData).toBeTruthy();
        expect(serpentinePathData).toBeTruthy();
        expect(outlinePathData).toMatch(/^M/);
        expect(scanlinePathData).not.toBe(serpentinePathData);
        expect(pathCountWithEdges).toBeGreaterThan(pathCountWithoutEdges);
        expect(insetPathData).toBeTruthy();
        expect(insetPathData).not.toBe(scanlinePathData);
    });

    it('renders a Hilbert curve centered on the paper', () => {
        const paper = { width: 100, height: 80, margin: 5 };
        const hilbertData = new HilbertConfig({ level: 2, paper });
        const drawingConfig = {
            drawingData: hilbertData,
            paper,
            line: { strokeWidth: 0.2 },
            colorPalette: palette
        };

        const renderContext = createRenderContext({
            paper,
            drawingWidth: hilbertData.bounds.width,
            drawingHeight: hilbertData.bounds.height
        });

        const svg = drawHilbertCurve(drawingConfig, renderContext);
        expect(svg.querySelectorAll('path').length).toBeGreaterThan(0);
    });

    it('computes Hilbert bounds per orientation', () => {
        const config = new HilbertConfig({ width: 50, height: 30 });
        const landscape = config.getBounds({ paper: { width: 140, height: 100 }, orientation: 'landscape' });
        const portrait = config.getBounds({ paper: { width: 140, height: 100 }, orientation: 'portrait' });

        expect(landscape.width).toBe(140);
        expect(landscape.height).toBe(100);
        expect(portrait.width).toBe(100);
        expect(portrait.height).toBe(140);
    });

    it('renders calibration patterns with multiple spacing rows', () => {
        const paper = { width: 200, height: 200, margin: 10 };
        const calibrationData = new CalibrationConfig({
            minSpacing: 0.2,
            maxSpacing: 1,
            samples: 3,
            tilePadding: 2,
            patternScale: 1,
            width: 180,
            height: 180
        });
        const drawingConfig = {
            drawingData: calibrationData,
            paper,
            line: { strokeWidth: 0.3 },
            colorPalette: palette
        };
        const renderContext = createRenderContext({
            paper,
            drawingWidth: calibrationData.bounds.width,
            drawingHeight: calibrationData.bounds.height
        });
        const svg = drawCalibrationPatterns(drawingConfig, renderContext);
        expect(svg.querySelectorAll('path').length).toBeGreaterThan(0);
        expect(svg.querySelectorAll('text').length).toBeGreaterThan(0);
    });

    it('renders Lissajous curves', () => {
        const drawingConfig = createTestDrawingConfig({
            drawingData: {
                freqA: 3,
                freqB: 2,
                phase: Math.PI / 2,
                amplitude: 0.9,
                samples: 600
            },
            line: { strokeWidth: 0.3 },
            colorPalette: palette
        });
        const renderContext = createTestRenderContext({ drawingWidth: 200, drawingHeight: 200 });
        const svg = drawLissajous(drawingConfig, renderContext);
        expect(svg.querySelectorAll('path').length).toBeGreaterThan(0);
    });

    it('renders Superformula shapes', () => {
        const drawingConfig = createTestDrawingConfig({
            drawingData: {
                m: 7,
                n1: 0.2,
                n2: 1.7,
                n3: 1.7,
                a: 1,
                b: 1,
                samples: 600,
                scale: 0.9
            },
            line: { strokeWidth: 0.35 },
            colorPalette: palette
        });
        const renderContext = createTestRenderContext({ drawingWidth: 200, drawingHeight: 200 });
        const svg = drawSuperformula(drawingConfig, renderContext);
        expect(svg.querySelectorAll('path').length).toBeGreaterThan(0);
    });

    it('renders Clifford attractors', () => {
        const drawingConfig = createTestDrawingConfig({
            drawingData: {
                a: -1.4,
                b: 1.6,
                c: 1.0,
                d: 0.7,
                iterations: 5000,
                noise: 0
            },
            line: { strokeWidth: 0.2 },
            colorPalette: palette
        });
        const renderContext = createTestRenderContext({ drawingWidth: 200, drawingHeight: 200 });
        const svg = drawClifford(drawingConfig, renderContext);
        expect(svg.querySelectorAll('path').length).toBeGreaterThan(0);
    });

    it('renders Turing patterns', () => {
        const drawingConfig = createTestDrawingConfig({
            drawingData: {
                feed: 0.034,
                kill: 0.063,
                diffusionU: 0.16,
                diffusionV: 0.08,
                steps: 50,
                resolution: 28,
                threshold: 0.2
            },
            line: { strokeWidth: 0.15 },
            colorPalette: palette
        });
        const renderContext = createTestRenderContext({ drawingWidth: 100, drawingHeight: 100 });
        const svg = drawTuringPatterns(drawingConfig, renderContext);
        expect(svg.querySelectorAll('path').length).toBeGreaterThan(0);
    });

    it('renders phyllotaxis spirals', () => {
        const drawingConfig = createTestDrawingConfig({
            drawingData: {
                divergence: 137.5,
                radialStep: 4,
                pointCount: 200,
                jitter: 0.1,
                connect: false
            },
            line: { strokeWidth: 0.2 },
            colorPalette: palette
        });
        const renderContext = createTestRenderContext({ drawingWidth: 200, drawingHeight: 200 });
        const svg = drawPhyllotaxis(drawingConfig, renderContext);
        expect(svg.querySelectorAll('path').length).toBeGreaterThan(0);
    });

    it('renders spirograph curves', () => {
        const drawingConfig = createTestDrawingConfig({
            drawingData: {
                R: 80,
                r: 25,
                d: 65,
                samples: 600,
                layers: 2,
                layerOffset: Math.PI / 6,
                mode: 'hypotrochoid'
            },
            line: { strokeWidth: 0.3 },
            colorPalette: palette
        });
        const renderContext = createTestRenderContext({ drawingWidth: 220, drawingHeight: 220 });
        const svg = drawSpirograph(drawingConfig, renderContext);
        expect(svg.querySelectorAll('path').length).toBeGreaterThan(0);
    });

    it('renders Voronoi sketches', () => {
        const drawingConfig = createTestDrawingConfig({
            drawingData: {
                pointCount: 25,
                relaxationPasses: 1,
                neighbors: 3,
                boundary: 'rect',
                jitter: 0.2,
                seed: 5
            },
            line: { strokeWidth: 0.2 },
            colorPalette: palette
        });
        const renderContext = createTestRenderContext({ drawingWidth: 220, drawingHeight: 150 });
        const svg = drawVoronoiSketch(drawingConfig, renderContext);
        expect(svg.querySelectorAll('path').length).toBeGreaterThan(0);
    });

    it('renders flow fields', () => {
        const drawingConfig = createTestDrawingConfig({
            drawingData: {
                noiseScale: 0.01,
                stepLength: 2.5,
                particleCount: 80,
                steps: 60,
                lineJitter: 0.1,
                noiseSeed: 99
            },
            line: { strokeWidth: 0.2 },
            colorPalette: palette
        });
        const renderContext = createTestRenderContext({ drawingWidth: 200, drawingHeight: 120 });
        const svg = drawFlowField(drawingConfig, renderContext);
        expect(svg.querySelectorAll('path').length).toBeGreaterThan(0);
    });

    it('renders Lorenz attractors', () => {
        const drawingConfig = createTestDrawingConfig({
            drawingData: {
                sigma: 10,
                rho: 28,
                beta: 8 / 3,
                dt: 0.01,
                steps: 12000,
                smoothing: 0.05
            },
            line: { strokeWidth: 0.2 },
            colorPalette: palette
        });
        const renderContext = createTestRenderContext({ drawingWidth: 200, drawingHeight: 180 });
        const svg = drawLorenzAttractor(drawingConfig, renderContext);
        expect(svg.querySelectorAll('path').length).toBeGreaterThan(0);
    });

    it('renders Ikeda attractors', () => {
        const drawingConfig = createTestDrawingConfig({
            drawingData: {
                u: 0.918,
                steps: 15000,
                smoothing: 0.02
            },
            line: { strokeWidth: 0.2 },
            colorPalette: palette
        });
        const renderContext = createTestRenderContext({ drawingWidth: 200, drawingHeight: 180 });
        const svg = drawIkedaAttractor(drawingConfig, renderContext);
        expect(svg.querySelectorAll('path').length).toBeGreaterThan(0);
    });

    it('renders Peter de Jong attractors', () => {
        const drawingConfig = createTestDrawingConfig({
            drawingData: {
                a: -1.4,
                b: 1.6,
                c: -1.2,
                d: 0.7,
                steps: 20000,
                smoothing: 0.03
            },
            line: { strokeWidth: 0.2 },
            colorPalette: palette
        });
        const renderContext = createTestRenderContext({ drawingWidth: 200, drawingHeight: 180 });
        const svg = drawDeJongAttractor(drawingConfig, renderContext);
        expect(svg.querySelectorAll('path').length).toBeGreaterThan(0);
    });

    it('renders contour maps', () => {
        const drawingConfig = createTestDrawingConfig({
            drawingData: {
                frequency: 0.01,
                octaves: 3,
                thresholdSpacing: 0.2,
                thresholdCount: 5,
                seed: 50
            },
            line: { strokeWidth: 0.2 },
            colorPalette: palette
        });
        const renderContext = createTestRenderContext({ drawingWidth: 300, drawingHeight: 200 });
        const svg = drawContourMap(drawingConfig, renderContext);
        expect(svg.querySelectorAll('path').length).toBeGreaterThan(0);
    });

    it('renders wave interference contours', () => {
        const drawingConfig = createTestDrawingConfig({
            drawingData: {
                emitterCount: 5,
                wavelength: 130,
                thresholdSpacing: 0.25,
                thresholdCount: 4,
                seed: 72
            },
            line: { strokeWidth: 0.2 },
            colorPalette: palette
        });
        const renderContext = createTestRenderContext({ drawingWidth: 380, drawingHeight: 260 });
        const svg = drawWaveInterference(drawingConfig, renderContext);
        expect(svg.querySelectorAll('path').length).toBeGreaterThan(0);
    });

    it('renders circle packing', () => {
        const drawingConfig = createTestDrawingConfig({
            drawingData: {
                minRadius: 4,
                maxRadius: 16,
                circleCount: 200,
                spacingFactor: 1.1,
                seed: 33
            },
            line: { strokeWidth: 0.2 },
            colorPalette: palette
        });
        const renderContext = createTestRenderContext({ drawingWidth: 300, drawingHeight: 220 });
        const svg = drawCirclePacking(drawingConfig, renderContext);
        expect(svg.querySelectorAll('path').length).toBeGreaterThan(0);
    });

    it('renders Truchet tiles', () => {
        const drawingConfig = createTestDrawingConfig({
            drawingData: {
                columns: 20,
                rows: 30,
                motifCount: 2,
                rotationBias: 0.8,
                seed: 5
            },
            line: { strokeWidth: 0.2 },
            colorPalette: palette
        });
        const renderContext = createTestRenderContext({ drawingWidth: 300, drawingHeight: 200 });
        const svg = drawTruchetTiles(drawingConfig, renderContext);
        expect(svg.querySelectorAll('path').length).toBeGreaterThan(0);
    });

    it('renders sorting arcs', () => {
        const drawingConfig = createTestDrawingConfig({
            drawingData: {
                arraySize: 80,
                algorithm: 'bubble',
                shuffleStrength: 0.2,
                arcHeight: 40,
                lineWidth: 0.18,
                seed: 21
            },
            line: { strokeWidth: 0.18 },
            colorPalette: palette
        });
        const renderContext = createTestRenderContext({ drawingWidth: 320, drawingHeight: 200 });
        const svg = drawSortingArcs(drawingConfig, renderContext);
        expect(svg.querySelectorAll('path').length).toBeGreaterThan(0);
    });
});
