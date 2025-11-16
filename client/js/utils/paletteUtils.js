const defaultStorage = typeof window !== 'undefined' ? window.localStorage : null;

export function filterPaletteByDisabledColors(palette, disabledSet) {
    if (!palette || !disabledSet || disabledSet.size === 0) {
        return palette;
    }
    const entries = Object.entries(palette).filter(([colorId]) => !disabledSet.has(colorId));
    if (entries.length === 0) {
        return palette;
    }
    return Object.fromEntries(entries);
}

const STORAGE_KEY = 'mediumDisabledColorMap';

export function loadDisabledColorPrefs(storage = defaultStorage) {
    const map = new Map();
    if (!storage) {
        return map;
    }
    try {
        const raw = storage.getItem(STORAGE_KEY);
        if (!raw) {
            return map;
        }
        const parsed = JSON.parse(raw);
        if (!parsed || typeof parsed !== 'object') {
            return map;
        }
        Object.entries(parsed).forEach(([mediumId, colorIds]) => {
            if (Array.isArray(colorIds) && colorIds.length) {
                map.set(mediumId, new Set(colorIds));
            }
        });
    } catch (error) {
        console.warn('Unable to load disabled colors from storage', error);
    }
    return map;
}

export function saveDisabledColorPrefs(disabledMap, storage = defaultStorage) {
    if (!storage) {
        return;
    }
    try {
        if (!(disabledMap instanceof Map) || disabledMap.size === 0) {
            storage.removeItem(STORAGE_KEY);
            return;
        }
        const serialized = {};
        disabledMap.forEach((set, mediumId) => {
            serialized[mediumId] = Array.from(set);
        });
        storage.setItem(STORAGE_KEY, JSON.stringify(serialized));
    } catch (error) {
        console.warn('Unable to persist disabled colors to storage', error);
    }
}
