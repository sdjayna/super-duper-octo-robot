const HATCH_STORAGE_KEY = 'globalHatchSettings';
const DEFAULT_SETTINGS = {
    hatchStyle: 'serpentine',
    hatchSpacing: 2,
    hatchInset: 2,
    includeBoundary: true,
    linkSpacingOffset: true,
    debugBoundary: false
};

let hatchSettings = loadSettings();

function coerceSpacing(value, fallback = 2) {
    const numeric = Number(value);
    if (Number.isFinite(numeric) && numeric >= 0) {
        return numeric;
    }
    return fallback;
}

function normalizeSettings(settings, partial = {}) {
    const merged = { ...settings, ...partial };
    merged.hatchSpacing = coerceSpacing(merged.hatchSpacing, settings.hatchSpacing);
    merged.hatchInset = coerceSpacing(merged.hatchInset, settings.hatchInset);
    merged.debugBoundary = Boolean(merged.debugBoundary);
    if (merged.linkSpacingOffset) {
        let reference = merged.hatchSpacing;
        if (typeof partial.hatchSpacing === 'number') {
            reference = coerceSpacing(partial.hatchSpacing, merged.hatchSpacing);
        } else if (typeof partial.hatchInset === 'number') {
            reference = coerceSpacing(partial.hatchInset, merged.hatchInset);
        }
        merged.hatchSpacing = reference;
        merged.hatchInset = reference;
    }
    return merged;
}

function loadSettings() {
    if (typeof window === 'undefined' || !window?.localStorage) {
        return { ...DEFAULT_SETTINGS };
    }
    try {
        const stored = window.localStorage.getItem(HATCH_STORAGE_KEY);
        const parsed = stored ? JSON.parse(stored) : null;
        const merged = normalizeSettings({ ...DEFAULT_SETTINGS, ...(parsed || {}) });
        return merged;
    } catch {
        return { ...DEFAULT_SETTINGS };
    }
}

function persistSettings() {
    if (typeof window === 'undefined' || !window?.localStorage) {
        return;
    }
    try {
        window.localStorage.setItem(HATCH_STORAGE_KEY, JSON.stringify(hatchSettings));
    } catch {
        // ignore persistence failures
    }
}

function updateSettings(partial) {
    hatchSettings = normalizeSettings(hatchSettings, partial);
    persistSettings();
}

export function getHatchSettings() {
    return { ...hatchSettings };
}

export function setHatchSettings(partial) {
    updateSettings(partial);
}

export function applyHatchSettingsToConfig(drawingConfig) {
    if (!drawingConfig) {
        return;
    }
    drawingConfig.line = drawingConfig.line || {};
    drawingConfig.line.hatchStyle = hatchSettings.hatchStyle;
    drawingConfig.line.hatchInset = hatchSettings.hatchInset;
    drawingConfig.line.includeBoundary = hatchSettings.includeBoundary;
    drawingConfig.line.spacing = hatchSettings.hatchSpacing;
}

function formatMm(value) {
    const fixed = Number(value).toFixed(2);
    return `${fixed.replace(/\.?0+$/, '')} mm`;
}

export function initializeHatchControls(elements = {}, onChange = () => {}) {
    const {
        styleSelect,
        spacingSlider,
        spacingValueLabel,
        insetSlider,
        insetValueLabel,
        boundaryCheckbox,
        linkCheckbox
    } = elements;

    const notifyChange = async () => {
        const maybePromise = onChange(getHatchSettings());
        if (maybePromise?.then) {
            await maybePromise;
        }
    };

    if (styleSelect) {
        styleSelect.value = hatchSettings.hatchStyle;
        styleSelect.addEventListener('change', async (event) => {
            updateSettings({ hatchStyle: event.target.value });
            await notifyChange();
        });
    }

    const syncSpacingLabel = (value) => {
        if (spacingValueLabel) {
            spacingValueLabel.textContent = formatMm(value);
        }
    };

    const syncInsetLabel = (value) => {
        if (insetValueLabel) {
            insetValueLabel.textContent = formatMm(value);
        }
    };

    const reflectSpacing = (value) => {
        if (spacingSlider) {
            spacingSlider.value = value;
        }
        syncSpacingLabel(value);
    };

    const reflectInset = (value) => {
        if (insetSlider) {
            insetSlider.value = value;
        }
        syncInsetLabel(value);
    };

    reflectSpacing(hatchSettings.hatchSpacing);
    reflectInset(hatchSettings.hatchInset);

    const handleSpacingChange = async (nextValue) => {
        updateSettings({ hatchSpacing: nextValue });
        reflectSpacing(hatchSettings.hatchSpacing);
        reflectInset(hatchSettings.hatchInset);
        await notifyChange();
    };

    const handleInsetChange = async (nextValue) => {
        updateSettings({ hatchInset: nextValue });
        reflectSpacing(hatchSettings.hatchSpacing);
        reflectInset(hatchSettings.hatchInset);
        await notifyChange();
    };

    if (spacingSlider) {
        spacingSlider.min = 0;
        spacingSlider.max = 10;
        spacingSlider.step = 0.05;
        spacingSlider.addEventListener('input', async (event) => {
            await handleSpacingChange(Number(event.target.value));
        });
    }

    if (insetSlider) {
        insetSlider.min = 0;
        insetSlider.max = 10;
        insetSlider.step = 0.05;
        insetSlider.addEventListener('input', async (event) => {
            await handleInsetChange(Number(event.target.value));
        });
    }

    if (boundaryCheckbox) {
        boundaryCheckbox.checked = hatchSettings.includeBoundary;
        boundaryCheckbox.addEventListener('change', async (event) => {
            updateSettings({ includeBoundary: event.target.checked });
            await notifyChange();
        });
    }

    if (linkCheckbox) {
        linkCheckbox.checked = hatchSettings.linkSpacingOffset;
        linkCheckbox.addEventListener('change', async (event) => {
            updateSettings({ linkSpacingOffset: event.target.checked });
            reflectSpacing(hatchSettings.hatchSpacing);
            reflectInset(hatchSettings.hatchInset);
            await notifyChange();
        });
    }
}

export const __TEST_ONLY__ = {
    DEFAULT_SETTINGS,
    getInternalSettings: () => hatchSettings,
    setInternalSettings: (next) => {
        hatchSettings = normalizeSettings({ ...DEFAULT_SETTINGS }, next);
    }
};
