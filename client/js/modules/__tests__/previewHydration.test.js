/**
 * @vitest-environment jsdom
 */

import { describe, it, expect } from 'vitest';
import { __previewWorkerInternals } from '../preview.js';

const { hydrateRenderResult } = __previewWorkerInternals;

function buildRenderResult(pathLength) {
    return {
        svgInfo: {
            paperWidth: 100,
            paperHeight: 100,
            margin: 0,
            orientation: 'landscape'
        },
        passes: [
            {
                baseOrder: 0,
                baseLabel: 'Test Layer',
                label: 'Test Layer',
                stroke: '#000',
                paths: [
                    {
                        points: [
                            { x: 0, y: 0 },
                            { x: 0, y: pathLength }
                        ]
                    }
                ]
            }
        ]
    };
}

describe('hydrateRenderResult', () => {
    it('applies fallback layer splitting when worker limit is absent', () => {
        const renderResult = buildRenderResult(4000);
        const { svg, travelSummary } = hydrateRenderResult({
            renderResult,
            previewColor: '#fff',
            maxTravelLimit: 1
        });
        expect(travelSummary.limitMeters).toBe(1);
        expect(travelSummary.totalLayers).toBeGreaterThan(1);
        const drawingLayer = svg.querySelector('[data-role="drawing-content"]');
        expect(drawingLayer.children.length).toBe(travelSummary.totalLayers);
    });
});
