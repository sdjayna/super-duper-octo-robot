import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';

let createDrawingBuilder;

beforeAll(async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
            mediums: {
                stub: {
                    name: 'Stub',
                    colors: {
                        '#111111': { hex: '#111111', name: 'Ink' }
                    }
                }
            },
            default: 'stub'
        })
    }));
    ({ createDrawingBuilder } = await import('../dataAdapters.js'));
});

afterAll(() => {
    vi.unstubAllGlobals();
});

function createBuilder(overrides = {}) {
    const svg = { layers: [] };
    const drawingConfig = {
        colorPalette: {
            '#111111': { hex: '#111111', name: 'Ink' }
        },
        line: { strokeWidth: 0.4 },
        ...overrides.drawingConfig
    };
    return createDrawingBuilder({
        svg,
        drawingConfig,
        renderContext: overrides.renderContext,
        abortSignal: overrides.abortSignal
    });
}

describe('dataAdapters createDrawingBuilder', () => {
    it('delegates projectPoints/projectRect to provided renderContext', () => {
        const renderContext = {
            projectPoints: vi.fn(points => points.map(point => ({
                x: point.x + 10,
                y: point.y + 5
            }))),
            projectRect: vi.fn(rect => ({
                x: rect.x + 3,
                y: rect.y + 4,
                width: rect.width * 2,
                height: rect.height * 2
            }))
        };
        const builder = createBuilder({ renderContext });
        const points = [{ x: 1, y: 2 }];
        const rect = { x: 5, y: 6, width: 7, height: 8 };

        const projectedPoints = builder.projectPoints(points);
        const projectedRect = builder.projectRect(rect);

        expect(renderContext.projectPoints).toHaveBeenCalledWith(points);
        expect(renderContext.projectRect).toHaveBeenCalledWith(rect);
        expect(projectedPoints).toEqual([{ x: 11, y: 7 }]);
        expect(projectedRect).toEqual({ x: 8, y: 10, width: 14, height: 16 });
    });

    it('falls back to raw numeric projection when renderContext missing', () => {
        const builder = createBuilder();
        const points = builder.projectPoints([{ x: '3', y: '4' }]);
        const rect = builder.projectRect({ x: '5', y: '6', width: '7', height: '8' });

        expect(points).toEqual([{ x: 3, y: 4 }]);
        expect(rect).toEqual({ x: 5, y: 6, width: 7, height: 8 });
    });
});
