/**
 * @vitest-environment jsdom
 */

import { describe, it, expect, vi } from 'vitest';
import { appendColoredPath } from '../drawingUtils.js';

describe('drawing utils', () => {
    it('appends colored paths using fallback geometry', () => {
        const layer = document.createElementNS('http://www.w3.org/2000/svg', 'g');
        const colorGroups = { '#000': layer };
        const colorManager = {
            getValidColor: vi.fn(() => '#000'),
            updateTracking: vi.fn()
        };

        const result = appendColoredPath({
            points: [{ x: 0, y: 0 }, { x: 1, y: 1 }],
            strokeWidth: 0.5,
            colorGroups,
            colorManager
        });

        expect(result?.path).toBeTruthy();
        expect(result?.color).toBe('#000');
        expect(layer.children).toHaveLength(1);
        expect(result?.path?.getAttribute('stroke-width')).toBe('0.5');
        expect(colorManager.getValidColor).toHaveBeenCalled();
        expect(colorManager.updateTracking).toHaveBeenCalled();
    });
});
