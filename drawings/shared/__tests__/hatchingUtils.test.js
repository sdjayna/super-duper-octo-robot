import { describe, it, expect } from 'vitest';
import {
    generatePolygonContourHatch,
    generatePolygonScanlineHatch,
    generatePolygonSerpentineHatch,
    generatePolygonSkeletonHatch,
    rectToPolygon
} from '../utils/hatchingUtils.js';

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

describe('generatePolygonSkeletonHatch', () => {
    it('creates a continuous path through the centroid', () => {
        const polygon = [
            { x: 0, y: 0 },
            { x: 6, y: 0 },
            { x: 1, y: 4 },
            { x: 0, y: 0 }
        ];
        const path = generatePolygonSkeletonHatch(polygon, { spacing: 1.5 });
        expect(path.length).toBeGreaterThan(4);
        expect(path[0]).toEqual(path[path.length - 1]);
        const centroidHit = path.some(point => Math.abs(point.x - 7 / 3) < 0.25 && Math.abs(point.y - 4 / 3) < 0.25);
        expect(centroidHit).toBe(true);
    });

    it('drives spokes deep into acute angles', () => {
        const polygon = [
            { x: 0, y: 0 },
            { x: 8, y: 0 },
            { x: 0.5, y: 7 },
            { x: 0, y: 0 }
        ];
        const path = generatePolygonSkeletonHatch(polygon, { spacing: 0.5 });
        expect(path.length).toBeGreaterThan(6);
        const apex = polygon[2];
        const apexCoverage = path.some(point => point.y > apex.y - 1 && Math.abs(point.x - apex.x) < 1);
        expect(apexCoverage).toBe(true);
    });

    it('optionally appends the polygon boundary', () => {
        const polygon = rectToPolygon({ x: 0, y: 0, width: 5, height: 3 });
        const withoutBoundary = generatePolygonSkeletonHatch(polygon, { spacing: 1 });
        const withBoundary = generatePolygonSkeletonHatch(polygon, { spacing: 1, includeBoundary: true });
        expect(withBoundary.length).toBeGreaterThan(withoutBoundary.length);
        const boundaryCorner = withBoundary.some(point => Math.abs(point.x) < 1e-6 && Math.abs(point.y) < 1e-6);
        expect(boundaryCorner).toBe(true);
    });
});

describe('generatePolygonContourHatch', () => {
    it('builds inset contour rings', () => {
        const polygon = rectToPolygon({ x: 0, y: 0, width: 20, height: 10 });
        const path = generatePolygonContourHatch(polygon, 2, { inset: 1, includeBoundary: false });
        expect(path.length).toBeGreaterThan(10);
        const minX = Math.min(...path.map(point => point.x));
        const maxX = Math.max(...path.map(point => point.x));
        expect(minX).toBeGreaterThan(0);
        expect(maxX).toBeLessThan(20);
    });

    it('optionally appends the boundary outline', () => {
        const polygon = rectToPolygon({ x: 0, y: 0, width: 8, height: 6 });
        const withoutBoundary = generatePolygonContourHatch(polygon, 1.5, { includeBoundary: false });
        const withBoundary = generatePolygonContourHatch(polygon, 1.5, { includeBoundary: true });
        expect(withBoundary.length).toBeGreaterThan(withoutBoundary.length);
        const hitsCorner = withBoundary.some(point => Math.abs(point.x) < 1e-6 && Math.abs(point.y) < 1e-6);
        expect(hitsCorner).toBe(true);
    });
});
