import { maxMediumColorCount } from '../clientAdapters.js';

function availableColorCount() {
    return Number.isFinite(maxMediumColorCount) && maxMediumColorCount > 0
        ? maxMediumColorCount
        : 0;
}

export function useAvailableColorCountOr(fallbackValue) {
    const available = availableColorCount();
    return available > 0 ? available : fallbackValue;
}

export function ensureColorReachableLimit(fallbackMax) {
    const available = availableColorCount();
    return available > 0 ? Math.max(fallbackMax, available) : fallbackMax;
}
