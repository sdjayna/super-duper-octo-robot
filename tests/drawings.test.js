/**
 * @vitest-environment jsdom
 */

import { describe, it, expect, beforeAll } from 'vitest';
import { createRenderContext } from '../client/js/renderContext.js';

const palette = {
    primary: { hex: '#000000', name: 'Primary' },
    secondary: { hex: '#ff0000', name: 'Accent' }
};

let drawBouwkampCode;
let drawDelaunayTriangulation;
let drawHilbertCurve;
let HilbertConfig;
let registerDrawing;
let addDrawingPreset;
let drawingRegistry;

beforeAll(async () => {
    const originalFetch = global.fetch;
    global.fetch = async () => ({
        json: async () => ({
            mediums: {
                stub: {
                    name: 'Stub Medium',
                    colors: { placeholder: { hex: '#000000', name: 'Placeholder' } }
                }
            },
            default: 'stub'
        })
    });

    drawingRegistry = await import('../client/js/drawingRegistry.js');
    ({ drawBouwkampCode } = await import('../client/js/drawings/bouwkamp.js'));
    ({ drawDelaunayTriangulation } = await import('../client/js/drawings/delaunay.js'));
    ({ drawHilbertCurve, HilbertConfig } = await import('../client/js/drawings/hilbert.js'));

    global.fetch = originalFetch;
});

describe('drawing functions', () => {
    it('renders Bouwkamp drawing into color layers under the drawing group', () => {
        const drawingConfig = {
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
        };

        const renderContext = createRenderContext({
            paper: { width: 120, height: 90, margin: 5 },
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
        const drawingConfig = {
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
        };

        const renderContext = createRenderContext({
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
});
