import { describe, it, expect } from 'vitest';
import { JSDOM } from 'jsdom';
import { applyPreviewEffects } from '../previewEffects.js';

const SVG_NS = 'http://www.w3.org/2000/svg';
const dom = new JSDOM('<!doctype html><html><body></body></html>');
globalThis.document = dom.window.document;

function createSvg() {
    return document.createElementNS(SVG_NS, 'svg');
}

describe('applyPreviewEffects', () => {
    it('creates preview filter and updates attributes based on profile', () => {
        const svg = createSvg();
        applyPreviewEffects(svg, { bleedRadius: 0.2, jitter: 0.05 });

        const filter = svg.querySelector('#previewInkFilter');
        expect(filter).toBeTruthy();

        const morphology = filter.querySelector('feMorphology');
        expect(morphology?.getAttribute('radius')).toBe(String(0.2 * 2));

        const blur = filter.querySelector('feGaussianBlur');
        expect(blur?.getAttribute('stdDeviation')).toBe('0.2');

        const displacement = filter.querySelector('feDisplacementMap');
        expect(displacement?.getAttribute('scale')).toBe(String(0.05 * 120));
        const defsCount = svg.querySelectorAll('defs').length;

        applyPreviewEffects(svg, { bleedRadius: 0.1, jitter: 0.01 });
        expect(svg.querySelectorAll('defs').length).toBe(defsCount);
        expect(morphology?.getAttribute('radius')).toBe(String(0.1 * 2));
        expect(blur?.getAttribute('stdDeviation')).toBe('0.1');
        expect(displacement?.getAttribute('scale')).toBe(String(0.01 * 120));
    });

    it('skips work when no profile supplied', () => {
        const svg = createSvg();
        applyPreviewEffects(svg);
        expect(svg.querySelector('defs')).toBeNull();
    });
});
