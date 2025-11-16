import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

function createMockStorage() {
    const store = {};
    return {
        getItem: vi.fn((key) => (key in store ? store[key] : null)),
        setItem: vi.fn((key, value) => {
            store[key] = value;
        }),
        removeItem: vi.fn((key) => {
            delete store[key];
        }),
        clear: vi.fn(() => {
            Object.keys(store).forEach((key) => delete store[key]);
        })
    };
}

describe('hatchSettings module', () => {
    beforeEach(() => {
        vi.resetModules();
        vi.stubGlobal('localStorage', createMockStorage());
    });

    afterEach(() => {
        vi.unstubAllGlobals();
    });

    it('applies default settings when no storage present', async () => {
        const module = await import('../hatchSettings.js');
        const { applyHatchSettingsToConfig, getHatchSettings } = module;
        const config = { line: {} };
        applyHatchSettingsToConfig(config);
        expect(config.line.hatchStyle).toBe('serpentine');
        expect(config.line.hatchInset).toBe(1);
        expect(config.line.spacing).toBe(2);
        expect(config.line.includeBoundary).toBe(true);
        expect(getHatchSettings()).toMatchObject({ hatchStyle: 'serpentine', hatchSpacing: 2 });
    });

    it('persists updates and applies them to configs', async () => {
        const module = await import('../hatchSettings.js');
        const { applyHatchSettingsToConfig, setHatchSettings, getHatchSettings } = module;
        setHatchSettings({ hatchStyle: 'scanline', hatchInset: 2.5, hatchSpacing: 3.3, includeBoundary: false });
        const config = { line: {} };
        applyHatchSettingsToConfig(config);
        expect(config.line).toMatchObject({
            hatchStyle: 'scanline',
            hatchInset: 2.5,
            includeBoundary: false,
            spacing: 3.3
        });
        expect(getHatchSettings()).toMatchObject({ hatchStyle: 'scanline', hatchSpacing: 3.3 });
    });
});
