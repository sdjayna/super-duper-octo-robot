import { describe, it, expect } from 'vitest';
import { computeBoundsFromPoints, computeBoundsFromRects } from '../geometryUtils.js';

describe('geometry utils', () => {
    it('computes bounds from points', () => {
        const points = [
            { x: 10, y: 5 },
            { x: 25, y: 15 },
            { x: -5, y: 20 }
        ];
        const bounds = computeBoundsFromPoints(points);
        expect(bounds).toEqual({
            minX: -5,
            minY: 5,
            width: 30,
            height: 15
        });
    });

    it('computes bounds from rectangles', () => {
        const rects = [
            { x: 0, y: 0, width: 10, height: 5 },
            { x: 20, y: -5, width: 5, height: 10 }
        ];
        const bounds = computeBoundsFromRects(rects);
        expect(bounds).toEqual({
            minX: 0,
            minY: -5,
            width: 25,
            height: 10
        });
    });

    it('provides sane defaults when no geometry exists', () => {
        expect(computeBoundsFromPoints([])).toEqual({ minX: 0, minY: 0, width: 1, height: 1 });
        expect(computeBoundsFromRects([])).toEqual({ minX: 0, minY: 0, width: 1, height: 1 });
    });
});
