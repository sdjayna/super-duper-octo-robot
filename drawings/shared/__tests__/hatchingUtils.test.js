import { describe, it, expect } from 'vitest';
import { generatePolygonScanlineHatch, rectToPolygon } from '../utils/hatchingUtils.js';

describe('generatePolygonScanlineHatch', () => {
    it('returns empty for invalid polygons', () => {
        expect(generatePolygonScanlineHatch([], 2)).toEqual([]);
        expect(generatePolygonScanlineHatch([{ x: 0, y: 0 }], 2)).toEqual([]);
    });

    it('fills a rectangle with a continuous path', () => {
        const polygon = rectToPolygon({ x: 0, y: 0, width: 10, height: 6 });
        const path = generatePolygonScanlineHatch(polygon, 2);
        expect(path.length).toBeGreaterThan(0);
        expect(path[0]).toEqual({ x: 0, y: 0 });
        expect(path[path.length - 1].y).toBeGreaterThanOrEqual(4);
    });
});
