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
        expect(config.line).toMatchObject({
            hatchStyle: 'serpentine',
            hatchInset: 2,
            spacing: 2,
            includeBoundary: true
        });
        expect(getHatchSettings()).toMatchObject({ hatchStyle: 'serpentine', hatchSpacing: 2, hatchInset: 2, linkSpacingOffset: true });
    });

    it('persists updates and applies them to configs', async () => {
        const module = await import('../hatchSettings.js');
        const { applyHatchSettingsToConfig, setHatchSettings, getHatchSettings } = module;
        setHatchSettings({ hatchStyle: 'scanline', hatchInset: 2.5, hatchSpacing: 3.3, includeBoundary: false, linkSpacingOffset: false });
        const config = { line: {} };
        applyHatchSettingsToConfig(config);
        expect(config.line).toMatchObject({
            hatchStyle: 'scanline',
            hatchInset: 2.5,
            includeBoundary: false,
            spacing: 3.3
        });
        expect(getHatchSettings()).toMatchObject({ hatchStyle: 'scanline', hatchSpacing: 3.3, hatchInset: 2.5, linkSpacingOffset: false });
    });

    it('synchronizes spacing and inset when linked', async () => {
        const module = await import('../hatchSettings.js');
        const { getHatchSettings, setHatchSettings } = module;
        setHatchSettings({ linkSpacingOffset: true, hatchSpacing: 4 });
        expect(getHatchSettings()).toMatchObject({ hatchSpacing: 4, hatchInset: 4, linkSpacingOffset: true });
        setHatchSettings({ hatchInset: 1.5 });
        expect(getHatchSettings()).toMatchObject({ hatchSpacing: 1.5, hatchInset: 1.5 });
        setHatchSettings({ linkSpacingOffset: false, hatchSpacing: 3, hatchInset: 1 });
        expect(getHatchSettings()).toMatchObject({ hatchSpacing: 3, hatchInset: 1, linkSpacingOffset: false });
        setHatchSettings({ linkSpacingOffset: true });
        expect(getHatchSettings()).toMatchObject({ hatchSpacing: 3, hatchInset: 3, linkSpacingOffset: true });
    });
});
