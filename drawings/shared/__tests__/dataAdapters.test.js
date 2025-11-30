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
    const builder = createDrawingBuilder({
        svg,
        drawingConfig,
        renderContext: overrides.renderContext,
        abortSignal: overrides.abortSignal
    });
    return { builder, svg };
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
        const { builder } = createBuilder({ renderContext });
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
        const { builder } = createBuilder();
        const points = builder.projectPoints([{ x: '3', y: '4' }]);
        const rect = builder.projectRect({ x: '5', y: '6', width: '7', height: '8' });

        expect(points).toEqual([{ x: 3, y: 4 }]);
        expect(rect).toEqual({ x: 5, y: 6, width: 7, height: 8 });
    });

    it('orders paths within a layer to reduce travel distance', () => {
        const { builder, svg } = createBuilder();
        const strokeColor = '#111111';

        builder.appendPath([{ x: 90, y: 10 }, { x: 95, y: 15 }], { strokeColor });
        builder.appendPath([{ x: 50, y: 10 }, { x: 55, y: 15 }], { strokeColor });
        builder.appendPath([{ x: 5, y: 10 }, { x: 10, y: 15 }], { strokeColor });

        const layer = svg.layers[0];
        const order = layer.paths.map(path => path.points[0].x);
        expect(order).toEqual([5, 50, 90]);
    });

    it('reverses a path when necessary to shorten travel', () => {
        const { builder, svg } = createBuilder();
        const strokeColor = '#111111';

        builder.appendPath([{ x: 0, y: 0 }, { x: 2, y: 0 }], { strokeColor });
        builder.appendPath([{ x: 10, y: 0 }, { x: 4, y: 0 }], { strokeColor });

        const layer = svg.layers[0];
        expect(layer.paths[0].points).toEqual([{ x: 0, y: 0 }, { x: 2, y: 0 }]);
        expect(layer.paths[1].points).toEqual([{ x: 4, y: 0 }, { x: 10, y: 0 }]);
    });
});
