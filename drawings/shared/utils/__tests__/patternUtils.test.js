import { describe, it, expect } from 'vitest';
import { generateSingleSerpentineLine } from '../patternUtils.js';

describe('generateSingleSerpentineLine', () => {
    it('creates a serpentine path inside the rectangle', () => {
        const rect = { x: 0, y: 0, width: 20, height: 10 };
        const points = generateSingleSerpentineLine(rect, 2, 1);

        expect(points.length).toBeGreaterThan(5);
        expect(points[0]).toEqual({ x: 1.5, y: 1.5 });
        expect(points[1]).toEqual({ x: 1.5, y: 8.5 });

        const xs = points.map(point => point.x);
        const ys = points.map(point => point.y);
        expect(Math.min(...xs)).toBeGreaterThanOrEqual(0);
        expect(Math.max(...xs)).toBeLessThanOrEqual(20);
        expect(Math.min(...ys)).toBeGreaterThanOrEqual(0);
        expect(Math.max(...ys)).toBeLessThanOrEqual(10);
    });

    it('falls back to a minimal rectangle when the drawing area collapses', () => {
        const tinyRect = { x: 10, y: 5, width: 0.01, height: 0.01 };
        const points = generateSingleSerpentineLine(tinyRect, 2, 5);

        expect(points).toHaveLength(5);
        expect(points[0]).toEqual({ x: 10, y: 5 });
        expect(points[points.length - 1]).toEqual(points[0]);
        points.forEach(point => {
            expect(Number.isFinite(point.x)).toBe(true);
            expect(Number.isFinite(point.y)).toBe(true);
        });
    });
});
