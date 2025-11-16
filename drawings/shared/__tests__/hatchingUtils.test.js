import { describe, it, expect } from 'vitest';
import { generatePolygonScanlineHatch, generatePolygonSerpentineHatch, rectToPolygon } from '../utils/hatchingUtils.js';

describe('generatePolygonScanlineHatch', () => {
    it('returns empty for invalid polygons', () => {
        expect(generatePolygonScanlineHatch([], 2)).toEqual([]);
        expect(generatePolygonScanlineHatch([{ x: 0, y: 0 }], 2)).toEqual([]);
    });

    it('fills a rectangle with a continuous path', () => {
        const polygon = rectToPolygon({ x: 0, y: 0, width: 10, height: 6 });
        const path = generatePolygonScanlineHatch(polygon, 2);
        expect(path.length).toBeGreaterThan(0);
        expect(path[0]).toEqual({ x: 1, y: 1 });
        expect(path[path.length - 1].y).toBeGreaterThanOrEqual(0);
    });

    it('supports serpentine orientation by rotating the polygon', () => {
        const polygon = rectToPolygon({ x: 0, y: 0, width: 8, height: 4 });
        const scanlinePath = generatePolygonScanlineHatch(polygon, 1);
        const serpentinePath = generatePolygonSerpentineHatch(polygon, 1);
        expect(serpentinePath.length).toBeGreaterThan(0);
        expect(scanlinePath.length).toBeGreaterThan(0);
        expect(serpentinePath).not.toEqual(scanlinePath);
    });
});
