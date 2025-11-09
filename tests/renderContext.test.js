import { describe, it, expect } from 'vitest';
import { createRenderContext } from '../client/js/renderContext.js';

describe('createRenderContext', () => {
    const paper = { width: 210, height: 297, margin: 5 };

    it('computes landscape metrics by default', () => {
        const ctx = createRenderContext({
            paper,
            drawingWidth: 100,
            drawingHeight: 50
        });

        expect(ctx.orientation).toBe('landscape');
        expect(ctx.isPortrait).toBe(false);
        expect(ctx.paperWidth).toBe(297);
        expect(ctx.paperHeight).toBe(210);
        expect(ctx.scale).toBeCloseTo(2.87, 5);
        expect(ctx.offsetX).toBeCloseTo(5, 5);
        expect(ctx.offsetY).toBeCloseTo(33.25, 5);

        const projected = ctx.projectPoint({ x: 10, y: 5 });
        expect(projected.x).toBeCloseTo(33.7, 5);
        expect(projected.y).toBeCloseTo(47.6, 5);
    });

    it('swaps paper axes for portrait orientation and projects rectangles', () => {
        const ctx = createRenderContext({
            paper,
            drawingWidth: 150,
            drawingHeight: 100,
            orientation: 'portrait'
        });

        expect(ctx.orientation).toBe('portrait');
        expect(ctx.isPortrait).toBe(true);
        expect(ctx.paperWidth).toBe(210);
        expect(ctx.paperHeight).toBe(297);
        expect(ctx.scale).toBeCloseTo(1.3333, 4);

        const rect = ctx.projectRect({ x: 10, y: 20, width: 50, height: 30 });
        expect(rect.x).toBeCloseTo(18.333, 3);
        expect(rect.y).toBeCloseTo(108.5, 1);
        expect(rect.width).toBeCloseTo(66.666, 2);
        expect(rect.height).toBeCloseTo(40, 2);
    });

    it('offsets projections when bounds include non-zero origin', () => {
        const ctx = createRenderContext({
            paper,
            drawingWidth: 80,
            drawingHeight: 60,
            bounds: { minX: 50, minY: -20, width: 80, height: 60 }
        });

        const projected = ctx.projectPoint({ x: 90, y: -5 });
        expect(projected.x).toBeCloseTo(ctx.offsetX + (40 * ctx.scale), 5);
        expect(projected.y).toBeCloseTo(ctx.offsetY + (15 * ctx.scale), 5);
    });

    it('rejects invalid configuration', () => {
        expect(() => createRenderContext({ paper, drawingWidth: 0, drawingHeight: 0 }))
            .toThrow(/Drawing dimensions/);
        expect(() => createRenderContext({ drawingWidth: 100, drawingHeight: 100 }))
            .toThrow(/Paper configuration/);
    });
});
