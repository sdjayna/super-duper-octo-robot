export const DEFAULT_MARGIN = 20;

export function getMaxMargin(paper) {
    if (!paper) return 0;
    return Math.floor(Math.min(Number(paper.width) || 0, Number(paper.height) || 0) / 2);
}

export function clampMargin(paper, value) {
    const maxMargin = getMaxMargin(paper);
    const parsed = Number(value);
    if (!Number.isFinite(parsed)) {
        return Math.min(DEFAULT_MARGIN, maxMargin);
    }
    if (parsed < 0) return 0;
    return Math.min(parsed, maxMargin);
}

export function resolveMargin(paper, currentMargin) {
    const base = typeof currentMargin === 'number' ? currentMargin : (paper?.margin ?? DEFAULT_MARGIN);
    return clampMargin(paper, base);
}

