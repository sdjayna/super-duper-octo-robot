export function extractLayerColorName(labelText = '') {
    if (typeof labelText !== 'string') {
        return '';
    }
    let text = labelText.trim();
    if (!text) {
        return '';
    }
    if (text.includes(' - ')) {
        const parts = text.split(' - ');
        if (parts.length >= 2) {
            text = parts[1].trim();
        }
    } else {
        const dashIndex = text.indexOf('-');
        if (dashIndex >= 0) {
            text = text.slice(dashIndex + 1).trim();
        }
    }
    const passIndex = text.indexOf('(pass');
    if (passIndex !== -1) {
        text = text.slice(0, passIndex).trim();
    }
    const suffixIndex = text.indexOf('(');
    if (suffixIndex !== -1) {
        text = text.slice(0, suffixIndex).trim();
    }
    return text.trim();
}

export function collectLayerColorNames(layerSelect) {
    const names = new Set();
    if (!layerSelect || !layerSelect.options) {
        return names;
    }
    Array.from(layerSelect.options).forEach(option => {
        if (!option || option.value === 'all') {
            return;
        }
        const extracted = extractLayerColorName(option.textContent || option.label || '');
        if (extracted) {
            names.add(extracted);
        }
    });
    return names;
}

export function applyColorUsageHighlight(listElement, activeNames = new Set(), options = {}) {
    if (!listElement) {
        return;
    }
    const disabled = options.disabled === true;
    const colorNames = activeNames instanceof Set ? activeNames : new Set(activeNames || []);
    listElement.querySelectorAll('label').forEach(label => {
        const colorName = label?.dataset?.colorName;
        const shouldHighlight = !disabled && colorName && colorNames.has(colorName);
        label.classList.toggle('is-active', Boolean(shouldHighlight));
    });
}
