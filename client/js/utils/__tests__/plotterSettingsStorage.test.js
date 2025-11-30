import { describe, it, expect } from 'vitest';
import { loadPlotterSettings, persistPlotterSettings, PLOTTER_SETTINGS_STORAGE_KEY } from '../plotterSettingsStorage.js';

function createMockStorage(initialValue) {
    const store = {};
    if (initialValue !== undefined) {
        store[PLOTTER_SETTINGS_STORAGE_KEY] = initialValue;
    }
    return {
        store,
        getItem(key) {
            return Object.prototype.hasOwnProperty.call(store, key) ? store[key] : null;
        },
        setItem(key, value) {
            store[key] = value;
        },
        removeItem(key) {
            delete store[key];
        }
    };
}

describe('plotterSettingsStorage', () => {
    it('loads parsed settings from storage', () => {
        const storage = createMockStorage(JSON.stringify({ penRateLower: 55 }));
        expect(loadPlotterSettings(storage)).toEqual({ penRateLower: 55 });
    });

    it('returns empty object when stored data is missing or invalid', () => {
        const emptyStorage = createMockStorage();
        expect(loadPlotterSettings(emptyStorage)).toEqual({});

        const badStorage = createMockStorage('{not-json');
        expect(loadPlotterSettings(badStorage)).toEqual({});
    });

    it('persists updates by merging with existing settings', () => {
        const storage = createMockStorage(JSON.stringify({ penRateLower: 40 }));
        const merged = persistPlotterSettings({ penPosDown: 12 }, storage);
        expect(merged).toEqual({ penRateLower: 40, penPosDown: 12 });
        expect(JSON.parse(storage.store[PLOTTER_SETTINGS_STORAGE_KEY])).toEqual(merged);
    });

    it('removes keys when updates provide undefined values', () => {
        const storage = createMockStorage(JSON.stringify({ penRateLower: 40, penPosDown: 10 }));
        const merged = persistPlotterSettings({ penPosDown: undefined }, storage);
        expect(merged).toEqual({ penRateLower: 40 });
        expect(JSON.parse(storage.store[PLOTTER_SETTINGS_STORAGE_KEY])).toEqual({ penRateLower: 40 });
    });

    it('gracefully handles missing storage implementations', () => {
        const merged = persistPlotterSettings({ penRateLower: 25 }, null);
        expect(merged).toEqual({ penRateLower: 25 });
    });
});
