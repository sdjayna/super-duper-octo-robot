const HATCH_STORAGE_KEY = 'globalHatchSettings';
const DEFAULT_SETTINGS = {
    hatchStyle: 'serpentine',
    hatchSpacing: 2,
    hatchInset: 1,
    includeBoundary: true
};

let hatchSettings = loadSettings();

function loadSettings() {
    if (typeof window === 'undefined' || !window?.localStorage) {
        return { ...DEFAULT_SETTINGS };
    }
    try {
        const stored = window.localStorage.getItem(HATCH_STORAGE_KEY);
        if (!stored) {
            return { ...DEFAULT_SETTINGS };
        }
        const parsed = JSON.parse(stored);
        return { ...DEFAULT_SETTINGS, ...(parsed || {}) };
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
        // ignore
    }
}

function updateSettings(partial) {
    hatchSettings = { ...hatchSettings, ...partial };
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
    const spacingValue = Number(hatchSettings.hatchSpacing);
    if (!Number.isNaN(spacingValue) && spacingValue > 0) {
        drawingConfig.line.spacing = spacingValue;
    }
}

function formatMm(value) {
    return `${value.toFixed(1)} mm`;
}

export function initializeHatchControls(elements = {}, onChange = () => {}) {
    const {
        styleSelect,
        spacingSlider,
        spacingValueLabel,
        insetSlider,
        insetValueLabel,
        boundaryCheckbox
    } = elements;

    const notifyChange = async () => {
        const maybePromise = onChange(getHatchSettings());
        if (maybePromise && typeof maybePromise.then === 'function') {
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

    if (spacingSlider) {
        spacingSlider.value = hatchSettings.hatchSpacing;
        if (spacingValueLabel) {
            spacingValueLabel.textContent = formatMm(hatchSettings.hatchSpacing);
        }
        spacingSlider.addEventListener('input', async (event) => {
            const nextValue = Number(event.target.value);
            updateSettings({ hatchSpacing: nextValue });
            if (spacingValueLabel) {
                spacingValueLabel.textContent = formatMm(nextValue);
            }
            await notifyChange();
        });
    }

    if (insetSlider) {
        insetSlider.value = hatchSettings.hatchInset;
        if (insetValueLabel) {
            insetValueLabel.textContent = formatMm(hatchSettings.hatchInset);
        }
        insetSlider.addEventListener('input', async (event) => {
            const nextValue = Number(event.target.value);
            updateSettings({ hatchInset: nextValue });
            if (insetValueLabel) {
                insetValueLabel.textContent = formatMm(nextValue);
            }
            await notifyChange();
        });
    }

    if (boundaryCheckbox) {
        boundaryCheckbox.checked = hatchSettings.includeBoundary;
        boundaryCheckbox.addEventListener('change', async (event) => {
            updateSettings({ includeBoundary: event.target.checked });
            await notifyChange();
        });
    }
}

export const __TEST_ONLY__ = {
    DEFAULT_SETTINGS,
    loadSettings,
    persistSettings,
    reset() {
        hatchSettings = { ...DEFAULT_SETTINGS };
        persistSettings();
    }
};
