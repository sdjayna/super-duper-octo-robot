/**
 * @vitest-environment jsdom
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

const appendSpy = vi.fn();

vi.mock('../client/js/utils/colorUtils.js', () => ({
    ColorManager: class {
        getValidColor() { return '#000000'; }
        updateTracking() {}
    },
    colorPalettes: {},
    colorPalette: {}
}));

vi.mock('../client/js/utils/drawingContext.js', () => ({
    createDrawingContext: () => ({
        appendPath: appendSpy
    })
}));

import { createDrawingBuilder } from '../client/js/utils/drawingBuilder.js';

const baseRenderContext = {
    paperWidth: 100,
    paperHeight: 80,
    margin: 5,
    orientation: 'landscape',
    projectPoints: (points) => points.map(p => ({ x: p.x + 10, y: p.y + 5 })),
    projectRect: rect => ({ ...rect, x: rect.x + 10, y: rect.y + 5 })
};

beforeEach(() => {
    appendSpy.mockClear();
});

describe('drawing builder', () => {
    it('applies stroke defaults from drawing config', () => {
        const drawingConfig = {
            colorPalette: {},
            line: { strokeWidth: 0.5, lineCap: 'square', lineJoin: 'bevel' }
        };
        const builder = createDrawingBuilder({ svg: document.createElementNS('http://www.w3.org/2000/svg', 'svg'), drawingConfig, renderContext: baseRenderContext });
        builder.appendPath([{ x: 0, y: 0 }, { x: 10, y: 10 }], { geometry: { x: 0, y: 0, width: 10, height: 10 } });
        expect(appendSpy).toHaveBeenCalledWith({
            points: [{ x: 0, y: 0 }, { x: 10, y: 10 }],
            strokeWidth: 0.5,
            strokeLinecap: 'square',
            strokeLinejoin: 'bevel',
            geometry: { x: 0, y: 0, width: 10, height: 10 }
        });
    });

    it('projects points/rectangles via render context', () => {
        const drawingConfig = { colorPalette: {}, line: {} };
        const builder = createDrawingBuilder({ svg: document.createElementNS('http://www.w3.org/2000/svg', 'svg'), drawingConfig, renderContext: baseRenderContext });
        const projected = builder.projectPoints([{ x: 1, y: 1 }]);
        expect(projected[0]).toEqual({ x: 11, y: 6 });
        const projectedRect = builder.projectRect({ x: 0, y: 0, width: 5, height: 5 });
        expect(projectedRect.x).toBe(10);
        expect(projectedRect.y).toBe(5);
    });
});
