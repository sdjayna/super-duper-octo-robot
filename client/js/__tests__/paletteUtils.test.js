import { describe, it, expect } from 'vitest';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { filterPaletteByDisabledColors, loadDisabledColorPrefs, saveDisabledColorPrefs } from '../utils/paletteUtils.js';

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

describe('disabled color persistence helpers', () => {
    let storageMock;

    beforeEach(() => {
        storageMock = {
            data: {},
            getItem: vi.fn(function (key) { return this.data[key] ?? null; }),
            setItem: vi.fn(function (key, value) { this.data[key] = value; }),
            removeItem: vi.fn(function (key) { delete this.data[key]; })
        };
    });

    it('loads map from storage payload', () => {
        storageMock.data = {
            mediumDisabledColorMap: JSON.stringify({
                sakura: ['black', 'red'],
                molotow: ['blue']
            })
        };
        const map = loadDisabledColorPrefs(storageMock);
        expect(map.size).toBe(2);
        expect(map.get('sakura')).toEqual(new Set(['black', 'red']));
        expect(map.get('molotow')).toEqual(new Set(['blue']));
    });

    it('saves map to storage and removes when empty', () => {
        const disabledMap = new Map();
        disabledMap.set('sakura', new Set(['red']));
        saveDisabledColorPrefs(disabledMap, storageMock);
        expect(storageMock.setItem).toHaveBeenCalledWith(
            'mediumDisabledColorMap',
            JSON.stringify({ sakura: ['red'] })
        );
        disabledMap.clear();
        saveDisabledColorPrefs(disabledMap, storageMock);
        expect(storageMock.removeItem).toHaveBeenCalledWith('mediumDisabledColorMap');
    });
});
