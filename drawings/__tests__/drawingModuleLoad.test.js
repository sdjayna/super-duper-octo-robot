import { describe, it, beforeAll, afterAll, expect } from 'vitest';
import fs from 'node:fs';

const manifestUrl = new URL('../manifest.json', import.meta.url);
const manifest = JSON.parse(fs.readFileSync(manifestUrl, 'utf8'));
const drawingEntries = manifest.drawings ?? [];

let originalFetch;

beforeAll(() => {
    originalFetch = global.fetch;
    global.fetch = async (resource) => {
        const url = typeof resource === 'string' ? resource : '';
        if (url.includes('plotters')) {
            return {
                ok: true,
                json: async () => ({
                    default: 'axidraw',
                    plotters: {
                        axidraw: {
                            specs: { repeatability_mm: 0.1, cautionSpacing_mm: 0.2, micro_spacing_mm: 0.15 }
                        }
                    }
                })
            };
        }
        return {
            ok: true,
            json: async () => ({
                mediums: {
                    stub: {
                        name: 'Stub Medium',
                        colors: {
                            placeholder: { hex: '#000000', name: 'Placeholder' },
                            accent: { hex: '#ff0000', name: 'Accent' },
                            highlight: { hex: '#00ff00', name: 'Highlight' },
                            shadow: { hex: '#0000ff', name: 'Shadow' },
                            outline: { hex: '#888888', name: 'Outline' }
                        }
                    }
                },
                default: 'stub'
            })
        };
    };
});

afterAll(() => {
    global.fetch = originalFetch;
});

describe('drawing module loader', () => {
    it('tracks manifest entries', () => {
        expect(drawingEntries.length).toBeGreaterThan(0);
    });

drawingEntries.forEach(entry => {
        const specifier = entry.path.replace(/^\/drawings\//, '../');
        it(`imports ${entry.path}`, async () => {
            const module = await import(specifier);
            expect(module).toBeTruthy();
        });
    });
});
