/**
 * @vitest-environment jsdom
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { extractLayerColorName, collectLayerColorNames, applyColorUsageHighlight } from '../layerColorUsage.js';

describe('layerColorUsage helpers', () => {
    let layerSelect;
    let mediumList;

    beforeEach(() => {
        document.body.innerHTML = `
            <select id="layerSelect">
                <option value="all">Show All Layers</option>
                <option value="0">000 - Black - (1/2)</option>
                <option value="1">001 - Black - (2/2)</option>
                <option value="2">002 - Cyan</option>
            </select>
            <div id="mediumColorList">
                <label data-color-name="Black"></label>
                <label data-color-name="Cyan"></label>
                <label data-color-name="Magenta"></label>
            </div>
        `;
        layerSelect = document.getElementById('layerSelect');
        mediumList = document.getElementById('mediumColorList');
    });

    it('extracts color names from padded labels', () => {
        expect(extractLayerColorName('012 - Burgundy - (2/5)')).toBe('Burgundy');
        expect(extractLayerColorName('5-Teal (pass 1/2)')).toBe('Teal');
        expect(extractLayerColorName('Amber')).toBe('Amber');
    });

    it('highlights medium colors that are currently active', () => {
        const names = collectLayerColorNames(layerSelect);
        expect(Array.from(names)).toEqual(['Black', 'Cyan']);

        applyColorUsageHighlight(mediumList, names, { disabled: false });
        const labels = mediumList.querySelectorAll('label');
        expect(labels[0].classList.contains('is-active')).toBe(true);
        expect(labels[1].classList.contains('is-active')).toBe(true);
        expect(labels[2].classList.contains('is-active')).toBe(false);
    });

    it('removes highlights when list is disabled', () => {
        const names = new Set(['Black']);
        applyColorUsageHighlight(mediumList, names, { disabled: true });
        expect(mediumList.querySelector('label').classList.contains('is-active')).toBe(false);
    });
});
