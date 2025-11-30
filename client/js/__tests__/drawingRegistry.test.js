import { describe, it, expect, vi, beforeEach } from 'vitest';
import { drawingTypes, registerDrawing, addDrawingPreset, DrawingConfig, drawings } from '../drawingRegistry.js';

class StubConfig {
    constructor(params) {
        this.value = params.value || 0;
    }
}

function resetRegistry() {
    Object.keys(drawingTypes).forEach(key => delete drawingTypes[key]);
    Object.keys(drawings).forEach(key => delete drawings[key]);
}

vi.mock('../paperConfig.js', () => ({
    loadPaperConfig: () => Promise.resolve({ default: { width: 210, height: 297, margin: 10 } })
}));

describe('drawing registry', () => {
    beforeEach(() => {
        resetRegistry();
    });

    it('registers a drawing type and prevents duplicates', () => {
        registerDrawing({ id: 'stub', name: 'Stub', configClass: StubConfig, drawFunction: () => {} });
        expect(drawingTypes.stub.name).toBe('Stub');
        expect(() => registerDrawing({ id: 'stub', name: 'Other', configClass: StubConfig, drawFunction: () => {} }))
            .toThrow(/already registered/);
    });

    it('creates presets using DrawingConfig', () => {
        registerDrawing({ id: 'stub', name: 'Stub', configClass: StubConfig, drawFunction: () => {} });
        const preset = addDrawingPreset('example', 'Example', { type: 'stub', line: { strokeWidth: 0.5 }, colorPalette: {} });
        expect(drawings.example).toBeInstanceOf(DrawingConfig);
        expect(preset.name).toBe('Example');
        expect(preset.line.strokeWidth).toBe(0.5);
    });

    it('fills in default paper when missing', async () => {
        registerDrawing({ id: 'stub', name: 'Stub', configClass: StubConfig, drawFunction: () => {} });
        const config = await DrawingConfig.create('Async Example', { type: 'stub', line: {}, colorPalette: {} });
        expect(config.paper.width).toBe(210);
        expect(config.paper.margin).toBe(10);
    });

    it('propagates feature flags to registry entries and presets', () => {
        registerDrawing({
            id: 'lineOnly',
            name: 'Line Only',
            configClass: StubConfig,
            drawFunction: () => {},
            features: { supportsHatching: false }
        });
        const preset = addDrawingPreset('lineOnlyPreset', 'Line Only Preset', { type: 'lineOnly', line: {}, colorPalette: {} });
        expect(drawingTypes.lineOnly.features.supportsHatching).toBe(false);
        expect(preset.features.supportsHatching).toBe(false);
    });
});
