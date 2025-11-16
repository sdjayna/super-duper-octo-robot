import { describe, it, expect } from 'vitest';
import { filterPaletteByDisabledColors } from '../utils/paletteUtils.js';

const basePalette = {
    black: { hex: '#000000', name: 'Black' },
    red: { hex: '#ff0000', name: 'Red' },
    blue: { hex: '#0000ff', name: 'Blue' }
};

describe('filterPaletteByDisabledColors', () => {
    it('returns the original palette when no disabled colors are provided', () => {
        const result = filterPaletteByDisabledColors(basePalette, new Set());
        expect(result).toBe(basePalette);
    });

    it('filters out disabled colors when at least one color remains', () => {
        const result = filterPaletteByDisabledColors(basePalette, new Set(['red']));
        expect(result).not.toBe(basePalette);
        expect(result).toEqual({
            black: basePalette.black,
            blue: basePalette.blue
        });
    });

    it('falls back to the original palette when every color is disabled', () => {
        const result = filterPaletteByDisabledColors(basePalette, new Set(Object.keys(basePalette)));
        expect(result).toBe(basePalette);
    });
});
