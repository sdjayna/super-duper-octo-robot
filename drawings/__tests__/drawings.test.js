/**
 * @vitest-environment jsdom
 */

import { describe, it, expect, beforeAll } from 'vitest';
import { createRenderContext } from '../../client/js/renderContext.js';
import { createTestPalette, createTestRenderContext, createTestDrawingConfig } from '../../client/js/__tests__/helpers/drawingTestUtils.js';

const palette = createTestPalette();

let drawBouwkampCode;
let drawDelaunayTriangulation;
let drawHilbertCurve;
let HilbertConfig;
let drawCalibrationPatterns;
let CalibrationConfig;
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
                        colors: { placeholder: { hex: '#000000', name: 'Placeholder' } }
                    }
                },
                default: 'stub'
            })
        };
    };

    drawingRegistry = await import('../../client/js/drawingRegistry.js');
    ({ drawBouwkampCode } = await import('../core/bouwkamp.js'));
    ({ drawDelaunayTriangulation } = await import('../core/delaunay.js'));
    ({ drawHilbertCurve, HilbertConfig } = await import('../community/hilbert.js'));
    ({ drawCalibrationPatterns, CalibrationConfig } = await import('../core/calibration.js'));

    global.fetch = originalFetch;
});

describe('drawing functions', () => {
    it('renders Bouwkamp drawing into color layers under the drawing group', () => {
        const drawingConfig = createTestDrawingConfig({
            drawingData: {
                order: 1,
                width: 50,
                height: 50,
                squares: [50]
            },
            line: {
                spacing: 2,
                strokeWidth: 0.4,
                vertexGap: 0.5
            },
            colorPalette: palette
        });

        const renderContext = createTestRenderContext({
            drawingWidth: 50,
            drawingHeight: 50
        });

        const svg = drawBouwkampCode(drawingConfig, renderContext);
        const drawingLayer = svg.querySelector('[data-role="drawing-content"]');
        const layers = Array.from(drawingLayer.children)
            .filter(child => child.getAttribute('inkscape:groupmode') === 'layer');

        expect(layers.length).toBe(Object.keys(palette).length);
        expect(svg.querySelectorAll('path').length).toBeGreaterThan(0);
    });

    it('renders Delaunay drawing using projected points', () => {
        const drawingConfig = createTestDrawingConfig({
            drawingData: {
                points: [
                    { x: 0, y: 0 },
                    { x: 100, y: 0 },
                    { x: 100, y: 100 },
                    { x: 0, y: 100 }
                ],
                width: 100,
                height: 100
            },
            line: { strokeWidth: 0.3 },
            colorPalette: palette
        });

        const renderContext = createTestRenderContext({
            paper: { width: 150, height: 150, margin: 5 },
            drawingWidth: 100,
            drawingHeight: 100
        });

        const svg = drawDelaunayTriangulation(drawingConfig, renderContext);
        expect(svg.querySelectorAll('path').length).toBeGreaterThan(0);
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
});
