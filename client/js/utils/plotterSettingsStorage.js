const defaultStorage = typeof window !== 'undefined' ? window.localStorage : null;

export const PLOTTER_SETTINGS_STORAGE_KEY = 'plotterSettings';

function isUsableStorage(storage) {
    return Boolean(storage && typeof storage.getItem === 'function' && typeof storage.setItem === 'function');
}

export function loadPlotterSettings(storage = defaultStorage) {
    if (!isUsableStorage(storage)) {
        return {};
    }
    try {
        const raw = storage.getItem(PLOTTER_SETTINGS_STORAGE_KEY);
        if (!raw) {
            return {};
        }
        const parsed = JSON.parse(raw);
        if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
            return parsed;
        }
        return {};
    } catch {
        return {};
    }
}

export function persistPlotterSettings(updates = {}, storage = defaultStorage) {
    const current = loadPlotterSettings(storage);
    const merged = { ...current };
    Object.entries(updates || {}).forEach(([key, value]) => {
        if (value === undefined) {
            delete merged[key];
        } else {
            merged[key] = value;
        }
    });
    if (!isUsableStorage(storage)) {
        return merged;
    }
    try {
        storage.setItem(PLOTTER_SETTINGS_STORAGE_KEY, JSON.stringify(merged));
    } catch {
        // ignore persistence failures
    }
    return merged;
}
