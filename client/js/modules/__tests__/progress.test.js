import { describe, it, expect } from 'vitest';
import { normalizeProgressValue } from '../progress.js';

describe('normalizeProgressValue', () => {
    it('returns fraction as-is when already between 0 and 1', () => {
        expect(normalizeProgressValue(0.42)).toBeCloseTo(0.42);
    });

    it('converts numeric percentages over 1 into fractions', () => {
        expect(normalizeProgressValue(42)).toBeCloseTo(0.42);
    });

    it('parses numeric strings and trims percentage signs', () => {
        expect(normalizeProgressValue('58.5')).toBeCloseTo(0.585);
        expect(normalizeProgressValue('58.5%')).toBeCloseTo(0.585);
    });

    it('returns null for invalid inputs', () => {
        expect(normalizeProgressValue(undefined)).toBeNull();
        expect(normalizeProgressValue('abc')).toBeNull();
    });
});
