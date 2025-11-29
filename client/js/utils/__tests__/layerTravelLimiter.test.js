/**
 * @vitest-environment jsdom
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { applyLayerTravelLimit } from '../layerTravelLimiter.js';

const SVG_NS = 'http://www.w3.org/2000/svg';

function createSvg() {
    const svg = document.createElementNS(SVG_NS, 'svg');
    const drawingLayer = document.createElementNS(SVG_NS, 'g');
    drawingLayer.setAttribute('data-role', 'drawing-content');
    svg.appendChild(drawingLayer);
    return { svg, drawingLayer };
}

function createLayer(label) {
    const layer = document.createElementNS(SVG_NS, 'g');
    layer.setAttribute('inkscape:groupmode', 'layer');
    layer.setAttribute('inkscape:label', label);
    layer.setAttribute('stroke', '#000000');
    return layer;
}

function createPath(d) {
    const path = document.createElementNS(SVG_NS, 'path');
    path.setAttribute('d', d);
    path.setAttribute('fill', 'none');
    return path;
}

describe('applyLayerTravelLimit', () => {
    let svg;
    let drawingLayer;

    beforeEach(() => {
        ({ svg, drawingLayer } = createSvg());
    });

    it('returns null when no valid limit is provided', () => {
        const layer = createLayer('0-Test');
        drawingLayer.appendChild(layer);
        const result = applyLayerTravelLimit(svg, { maxTravelPerLayerMeters: null });
        expect(result).toBeNull();
        expect(drawingLayer.children).toHaveLength(1);
    });

    it('splits a long layer into multiple passes that respect the limit', () => {
        const layer = createLayer('0-Test');
        const path = createPath('M 0 0 L 0 6000');
        layer.appendChild(path);
        drawingLayer.appendChild(layer);

        const summary = applyLayerTravelLimit(svg, { maxTravelPerLayerMeters: 2 });

        expect(summary).toMatchObject({
            splitLayers: 1,
            totalLayers: 3
        });
        const labels = Array.from(drawingLayer.children)
            .map(node => node.getAttribute('inkscape:label'));
        expect(labels).toEqual([
            '0-Test (pass 1/3)',
            '1-Test (pass 2/3)',
            '2-Test (pass 3/3)'
        ]);
    });

    it('chunks paths when a single segment exceeds the limit', () => {
        const layer = createLayer('0-Long');
        const path = createPath('M 0 0 L 0 4500');
        layer.appendChild(path);
        drawingLayer.appendChild(layer);

        const summary = applyLayerTravelLimit(svg, { maxTravelPerLayerMeters: 1.5 });
        expect(summary.totalLayers).toBe(3);

        const lengths = Array.from(drawingLayer.children).map(node => Number(node.getAttribute('data-travel-mm')));
        expect(lengths.every(length => length <= 1500 + 1e-3)).toBe(true);
    });

    it('leaves layers untouched when below the limit but still renumbers sequentially', () => {
        const first = createLayer('0-Alpha');
        first.appendChild(createPath('M 0 0 L 0 500'));
        const second = createLayer('1-Beta');
        second.appendChild(createPath('M 0 0 L 0 250'));
        drawingLayer.appendChild(first);
        drawingLayer.appendChild(second);

        const summary = applyLayerTravelLimit(svg, { maxTravelPerLayerMeters: 10 });
        expect(summary.splitLayers).toBe(0);
        const labels = Array.from(drawingLayer.children)
            .map(node => node.getAttribute('inkscape:label'));
        expect(labels).toEqual(['0-Alpha', '1-Beta']);
    });

    it('keeps split passes grouped by their original base order', () => {
        const first = createLayer('0-Primary');
        first.appendChild(createPath('M 0 0 L 0 6000'));
        const second = createLayer('1-Secondary');
        second.appendChild(createPath('M 0 0 L 0 500'));
        drawingLayer.appendChild(first);
        drawingLayer.appendChild(second);

        applyLayerTravelLimit(svg, { maxTravelPerLayerMeters: 2 });
        const labels = Array.from(drawingLayer.children).map(layer => layer.getAttribute('inkscape:label'));
        expect(labels).toEqual([
            '0-Primary (pass 1/3)',
            '1-Primary (pass 2/3)',
            '2-Primary (pass 3/3)',
            '3-Secondary'
        ]);
    });
});
