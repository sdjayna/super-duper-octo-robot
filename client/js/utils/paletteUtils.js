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
