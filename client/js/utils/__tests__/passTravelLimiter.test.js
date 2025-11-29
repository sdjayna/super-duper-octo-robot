import { describe, it, expect } from 'vitest';
import { splitPassesByTravel, polylineLength } from '../passTravelLimiter.js';

function buildPath(points) {
    return { points };
}

describe('splitPassesByTravel', () => {
    it('returns original passes when limit is not provided', () => {
        const passes = [{
            baseOrder: 0,
            baseLabel: 'Layer A',
            label: 'Layer A',
            stroke: '#000',
            paths: [buildPath([{ x: 0, y: 0 }, { x: 0, y: 1000 }])]
        }];
        const result = splitPassesByTravel(passes, null);
        expect(result.limitMeters).toBeNull();
        expect(result.splitLayers).toBe(0);
        expect(result.totalLayers).toBe(1);
        expect(result.passes).toHaveLength(1);
        expect(result.passes[0].paths[0].points).toEqual(passes[0].paths[0].points);
    });

    it('splits passes when travel exceeds the provided limit', () => {
        const passes = [{
            baseOrder: 0,
            baseLabel: 'Long Layer',
            label: 'Long Layer',
            stroke: '#111111',
            paths: [buildPath([{ x: 0, y: 0 }, { x: 0, y: 4000 }])]
        }];
        const result = splitPassesByTravel(passes, 1); // 1 meter
        expect(result.limitMeters).toBe(1);
        expect(result.splitLayers).toBe(1);
        expect(result.totalLayers).toBeGreaterThan(1);
        expect(result.passes.every(entry => polylineLength(entry.paths[0].points) <= 1000 + 1e-3)).toBe(true);
    });
});
