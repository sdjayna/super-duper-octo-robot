import { describe, it, expect } from 'vitest';
import {
    normalizePaperColor,
    getPaperColor,
    getPaperTextureClass,
    getOrientedDimensions,
    computePlotterWarning
} from '../paperUtils.js';

describe('paperUtils', () => {
    it('normalizes hex colours and expands shorthand', () => {
        expect(normalizePaperColor('#fff')).toBe('#ffffff');
        expect(normalizePaperColor('#a1b2c3')).toBe('#a1b2c3');
        expect(normalizePaperColor('not-a-color')).toBe('#ffffff');
    });

    it('derives paper colours with fallbacks', () => {
        expect(getPaperColor({ previewColor: '#123456' })).toBe('#123456');
        expect(getPaperColor({ color: '#654321' })).toBe('#654321');
        expect(getPaperColor(null)).toBe('#ffffff');
    });

    it('maps textures to CSS classes', () => {
        expect(getPaperTextureClass({ texture: 'grain' })).toBe('texture-grain');
        expect(getPaperTextureClass({})).toBe('texture-smooth');
    });

    it('orients dimensions per orientation', () => {
        expect(getOrientedDimensions({ width: 300, height: 200 }, 'landscape')).toEqual({ width: 300, height: 200 });
        expect(getOrientedDimensions({ width: 300, height: 200 }, 'portrait')).toEqual({ width: 200, height: 300 });
    });

    it('returns null warning when paper fits plotter travel', () => {
        const result = computePlotterWarning({
            paper: { width: 297, height: 420, name: 'A3' },
            plotterSpecs: { paper: { width: 430, height: 297 } },
            orientation: 'landscape',
            margin: 10
        });
        expect(result).toBeNull();
    });

    it('warns when paper exceeds plotter but margins keep drawing within reach', () => {
        const warning = computePlotterWarning({
            paper: { width: 432, height: 279, name: 'Strathmore Vellum' },
            plotterSpecs: { paper: { width: 430, height: 297 }, name: 'AxiDraw SE/A3' },
            orientation: 'landscape',
            margin: 25
        });
        expect(warning?.severity).toBe('warning');
        expect(warning?.message).toContain('AxiDraw SE/A3 travel');
    });

    it('errors when even the drawable region exceeds travel', () => {
        const warning = computePlotterWarning({
            paper: { width: 500, height: 279, name: 'Oversize' },
            plotterSpecs: { paper: { width: 430, height: 297 }, name: 'AxiDraw SE/A3' },
            orientation: 'landscape',
            margin: 5
        });
        expect(warning?.severity).toBe('error');
        expect(warning?.message).toContain('smaller than Oversize');
    });
});
