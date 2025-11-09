/**
 * @vitest-environment jsdom
 */

import { describe, it, expect } from 'vitest';
import { createSVG, createColorGroups, getDrawingLayer } from '../client/js/utils/svgUtils.js';

const renderContext = {
    paperWidth: 200,
    paperHeight: 150,
    margin: 10,
    orientation: 'landscape'
};

describe('svg utils', () => {
    it('creates an SVG sized to the paper with guides and drawing layer', () => {
        const svg = createSVG(renderContext);

        expect(svg.getAttribute('width')).toBe('200mm');
        expect(svg.getAttribute('height')).toBe('150mm');
        expect(svg.dataset.orientation).toBe('landscape');

        const drawingLayer = getDrawingLayer(svg);
        expect(drawingLayer).toBeTruthy();

        const marginRect = svg.querySelector('[data-debug="margin-rect"]');
        expect(marginRect).toBeTruthy();
        expect(marginRect.getAttribute('width')).toBe(String(renderContext.paperWidth - 20));

        const rulers = svg.querySelectorAll('g.preview-only');
        expect(rulers.length).toBeGreaterThan(0);
    });

    it('appends color groups inside the drawing layer', () => {
        const svg = createSVG(renderContext);
        const palette = {
            primary: { hex: '#111111', name: 'Primary' },
            secondary: { hex: '#222222', name: 'Secondary' }
        };

        const groups = createColorGroups(svg, palette);
        const drawingLayer = getDrawingLayer(svg);

        expect(Object.keys(groups)).toHaveLength(2);
        expect(drawingLayer.children).toHaveLength(2);
        expect(drawingLayer.children[0].getAttribute('stroke')).toBe('#111111');
    });
});
