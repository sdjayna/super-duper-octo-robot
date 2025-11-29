import { describe, it, expect } from 'vitest';
import { __layerOrderingInternals } from '../../modules/preview.js';

const {
    limitSamplePoints,
    getRepresentativePoints,
    orderLayersByDistance,
    MAX_REPRESENTATIVE_POINTS
} = __layerOrderingInternals;

describe('preview layer ordering helpers', () => {
    it('limits sampled points while preserving endpoints', () => {
        const points = Array.from({ length: 100 }, (_, idx) => ({ x: idx, y: idx * 2 }));
        const limited = limitSamplePoints(points, 5);
        expect(limited).toHaveLength(5);
        expect(limited[0]).toBe(points[0]);
        expect(limited[4]).toBe(points[99]);
    });

    it('caches representative points for repeated lookups', () => {
        const entry = {
            points: [
                { x: 0, y: 0 },
                { x: 10, y: 0 },
                { x: 5, y: 5 }
            ]
        };
        const first = getRepresentativePoints(entry);
        const second = getRepresentativePoints(entry);
        expect(second).toBe(first);
        expect(first).toHaveLength(entry.points.length);
    });

    it('orders layers even when raw point counts are large', () => {
        const makeEntry = (label, offset) => ({
            index: label,
            label: `Layer ${label}`,
            centroid: { x: offset, y: 0 },
            points: Array.from({ length: 400 }, (_, idx) => ({
                x: offset + idx * 0.01,
                y: idx * 0.02
            }))
        });
        const layers = [
            makeEntry('A', -80),
            makeEntry('B', 0),
            makeEntry('C', 90)
        ];
        const ordered = orderLayersByDistance(layers);
        expect(ordered).toHaveLength(3);
        expect(ordered.optimized).toBe(true);
        ordered.forEach(entry => {
            const points = getRepresentativePoints(entry);
            expect(points.length).toBeLessThanOrEqual(MAX_REPRESENTATIVE_POINTS);
        });
    });
});
