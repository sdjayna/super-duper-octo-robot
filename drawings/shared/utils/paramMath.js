function toFiniteNumber(value, fallback) {
    return typeof value === 'number' && Number.isFinite(value) ? value : fallback;
}

export function clampNumber(value, min, max, fallback = min ?? 0) {
    const numeric = toFiniteNumber(value, fallback);
    if (typeof min === 'number' && numeric < min) {
        return min;
    }
    if (typeof max === 'number' && numeric > max) {
        return max;
    }
    return numeric;
}

export function clampInteger(value, min, max, fallback = min ?? 0, mode = 'floor') {
    const numeric = clampNumber(value, min, max, fallback);
    if (mode === 'ceil') {
        return Math.ceil(numeric);
    }
    if (mode === 'round') {
        return Math.round(numeric);
    }
    return Math.floor(numeric);
}
