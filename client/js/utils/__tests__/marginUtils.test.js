import { describe, it, expect } from 'vitest';
import { DEFAULT_MARGIN, getMaxMargin, clampMargin, resolveMargin } from '../marginUtils.js';

describe('margin utils', () => {
    const paper = { width: 200, height: 150 };

    it('computes maximum margin as half of shortest side', () => {
        expect(getMaxMargin(paper)).toBe(75);
        expect(getMaxMargin({ width: 50, height: 50 })).toBe(25);
    });

    it('clamps margin inputs to valid range', () => {
        expect(clampMargin(paper, 10)).toBe(10);
        expect(clampMargin(paper, 1000)).toBe(75);
        expect(clampMargin(paper, -5)).toBe(0);
        expect(clampMargin(paper, 'not-a-number')).toBe(DEFAULT_MARGIN);
    });

    it('resolves margin using current value or paper defaults', () => {
        expect(resolveMargin(paper, undefined)).toBe(DEFAULT_MARGIN);
        expect(resolveMargin({ ...paper, margin: 5 }, undefined)).toBe(5);
        expect(resolveMargin(paper, 200)).toBe(75);
    });
});
