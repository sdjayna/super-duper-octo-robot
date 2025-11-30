/**
 * @vitest-environment jsdom
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { createTestPalette, createTestRenderContext, createTestDrawingConfig } from '../../client/js/__tests__/helpers/drawingTestUtils.js';

const palette = createTestPalette();

let drawBouwkampCode;
let drawVoronoiSketch;
let VoronoiConfig;
let drawPhotoTriangleMosaic;
let PhotoTriangleConfig;
let photoTriangleTestUtils;
let drawImplicitLineWalkers;
let originalFetch;

beforeAll(async () => {
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

    await import('../../client/js/drawingRegistry.js');
    ({ drawBouwkampCode } = await import('../core/bouwkamp.js'));
    ({ drawVoronoiSketch, VoronoiConfig } = await import('../core/voronoi.js'));
    ({ drawPhotoTriangleMosaic, PhotoTriangleConfig, __TEST_ONLY__: photoTriangleTestUtils } = await import('../core/photoTriangles.js'));
    ({ drawImplicitLineWalkers } = await import('../core/implicitLineWalkers.js'));
});

afterAll(() => {
    if (originalFetch) {
        global.fetch = originalFetch;
    }
});

describe('focused drawings', () => {
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
        const contourSvg = drawBouwkampCode(buildConfig({ hatchStyle: 'contour' }), renderContext);
        const outlineSvg = drawBouwkampCode(buildConfig({ hatchStyle: 'none' }), renderContext);

        const serpentinePathData = serpentineSvg.querySelectorAll('path')[0].getAttribute('d');
        const scanlinePathData = scanlineSvg.querySelectorAll('path')[0].getAttribute('d');
        const contourPathData = contourSvg.querySelectorAll('path')[0].getAttribute('d');
        const outlinePathData = outlineSvg.querySelectorAll('path')[0].getAttribute('d');

        expect(serpentinePathData).toBeTruthy();
        expect(scanlinePathData).toBeTruthy();
        expect(contourPathData).toBeTruthy();
        expect(outlinePathData).toBeTruthy();
        expect(serpentinePathData).not.toBe(scanlinePathData);
        expect(contourPathData).not.toBe(scanlinePathData);
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
        const baselinePaths = Array.from(scanlineSvg.querySelectorAll('path')).map(path => path.getAttribute('d'));
        const insetPaths = Array.from(scanlineInsetSvg.querySelectorAll('path')).map(path => path.getAttribute('d'));

        expect(scanlinePathData).toBeTruthy();
        expect(serpentinePathData).toBeTruthy();
        expect(outlinePathData).toMatch(/^M/);
        expect(scanlinePathData).not.toBe(serpentinePathData);
        expect(pathCountWithEdges).toBeGreaterThan(pathCountWithoutEdges);
        expect(insetPathData).toBeTruthy();
        expect(insetPaths.some(pathData => !baselinePaths.includes(pathData))).toBe(true);
    });

    it('renders a photo triangle mosaic with hatch-aware output', async () => {
        photoTriangleTestUtils.setImageSamplerFactory(async () => ({
            sample: () => ({ r: 120, g: 160, b: 200, brightness: 0.5 }),
            buildWeightTable: () => ({
                cumulative: Float64Array.from([1, 2, 3, 4]),
                width: 2,
                height: 2,
                totalWeight: 4,
                avgBrightness: 0.5,
                darkShare: 0.5
            })
        }));
        const baseParams = {
            width: 160,
            height: 120,
            triangleCount: 200,
            imageDataUrl: 'data:image/png;base64,test'
        };
        const scanlineConfig = new PhotoTriangleConfig(baseParams);
        const outlineConfig = new PhotoTriangleConfig(baseParams);
        const skeletonConfig = new PhotoTriangleConfig(baseParams);
        const renderContext = createTestRenderContext({ drawingWidth: 160, drawingHeight: 120 });
        const scanlineDrawing = createTestDrawingConfig({
            drawingData: scanlineConfig,
            colorPalette: palette,
            line: { strokeWidth: 0.25, hatchStyle: 'scanline', spacing: 1.5, hatchInset: 0.2, includeBoundary: false }
        });
        const outlineDrawing = createTestDrawingConfig({
            drawingData: outlineConfig,
            colorPalette: palette,
            line: { strokeWidth: 0.25, hatchStyle: 'none' }
        });
        const skeletonDrawing = createTestDrawingConfig({
            drawingData: skeletonConfig,
            colorPalette: palette,
            line: { strokeWidth: 0.25, hatchStyle: 'skeleton' }
        });
        const scanlineSvg = await drawPhotoTriangleMosaic(scanlineDrawing, renderContext);
        const outlineSvg = await drawPhotoTriangleMosaic(outlineDrawing, renderContext);
        const skeletonSvg = await drawPhotoTriangleMosaic(skeletonDrawing, renderContext);
        expect(scanlineSvg.querySelectorAll('path').length).toBeGreaterThan(0);
        expect(outlineSvg.querySelectorAll('path').length).toBeGreaterThan(0);
        const scanlinePathData = scanlineSvg.querySelector('path')?.getAttribute('d');
        const outlinePathData = outlineSvg.querySelector('path')?.getAttribute('d');
        const skeletonPathData = skeletonSvg.querySelector('path')?.getAttribute('d');
        expect(scanlinePathData).toBeTruthy();
        expect(outlinePathData).toBeTruthy();
        expect(skeletonPathData).toBeTruthy();
        expect(scanlinePathData).not.toBe(outlinePathData);
        expect(skeletonPathData).not.toBe(scanlinePathData);
        photoTriangleTestUtils.resetImageSamplerFactory();
    });

    it('locks to the uploaded photo aspect ratio when enabled', () => {
        const config = new PhotoTriangleConfig({ width: 200, height: 150 });
        config.setImageMetadata({ aspectRatio: 16 / 9, width: 1600, height: 900, source: 'mock' });
        const bounds = config.getBounds({ paper: { width: 300, height: 200, margin: 5 }, orientation: 'landscape' });
        expect(bounds.width / bounds.height).toBeCloseTo(16 / 9, 3);
    });

    it('falls back to paper proportions when aspect locking is disabled', () => {
        const config = new PhotoTriangleConfig({ width: 200, height: 150, matchPhotoAspectRatio: false });
        config.setImageMetadata({ aspectRatio: 4 / 3, width: 800, height: 600, source: 'mock' });
        const paper = { width: 420, height: 297, margin: 10 };
        const bounds = config.getBounds({ paper, orientation: 'portrait' });
        const printableWidth = Math.max(paper.width - paper.margin * 2, 1);
        const printableHeight = Math.max(paper.height - paper.margin * 2, 1);
        const expectedRatio = Math.min(printableWidth, printableHeight) / Math.max(printableWidth, printableHeight);
        expect(bounds.width / bounds.height).toBeCloseTo(expectedRatio, 3);
    });

    it('renders implicit line walkers as pure linework', () => {
        const drawingConfig = createTestDrawingConfig({
            drawingData: {
                walkerCount: 200,
                stepSize: 0.8,
                stepsPerWalker: 80,
                curvatureLimit: 0.5,
                fieldFrequency: 0.01,
                thresholdDrift: 0.1,
                jitter: 0.05,
                layerCount: 2,
                seed: 123
            },
            line: { strokeWidth: 0.18, hatchStyle: 'scanline' },
            colorPalette: palette
        });
        const renderContext = createTestRenderContext({ drawingWidth: 200, drawingHeight: 140 });
        const svg = drawImplicitLineWalkers(drawingConfig, renderContext);
        expect(svg.querySelectorAll('path').length).toBeGreaterThan(0);
    });
});
