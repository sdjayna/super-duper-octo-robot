const HEX_COLOR_PATTERN = /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/;
const DEFAULT_PAPER_COLOR = '#ffffff';

export function normalizePaperColor(color) {
    if (typeof color !== 'string') {
        return DEFAULT_PAPER_COLOR;
    }
    const trimmed = color.trim();
    const match = HEX_COLOR_PATTERN.exec(trimmed);
    if (!match) {
        return DEFAULT_PAPER_COLOR;
    }
    const hex = match[1];
    if (hex.length === 3) {
        return '#' + hex.split('').map(ch => `${ch}${ch}`).join('').toLowerCase();
    }
    return `#${hex.toLowerCase()}`;
}

export function getPaperColor(paper) {
    if (!paper) {
        return DEFAULT_PAPER_COLOR;
    }
    return normalizePaperColor(paper.previewColor || paper.color || DEFAULT_PAPER_COLOR);
}

export function getPaperTextureClass(paper) {
    return `texture-${paper?.texture || 'smooth'}`;
}

export function getOrientedDimensions(dimensions = {}, orientation = 'landscape') {
    const width = Number(dimensions.width);
    const height = Number(dimensions.height);
    if (!Number.isFinite(width) || !Number.isFinite(height)) {
        return { width: 0, height: 0 };
    }
    const longer = Math.max(width, height);
    const shorter = Math.min(width, height);
    return orientation === 'portrait'
        ? { width: shorter, height: longer }
        : { width: longer, height: shorter };
}

export function computePlotterWarning({ paper, plotterSpecs, orientation = 'landscape', margin = 0 }) {
    if (!paper || !plotterSpecs?.paper) {
        return null;
    }
    const paperDims = getOrientedDimensions(paper, orientation);
    const plotterDims = getOrientedDimensions(plotterSpecs.paper, orientation);
    const effectiveWidth = Math.max(paperDims.width - margin * 2, 0);
    const effectiveHeight = Math.max(paperDims.height - margin * 2, 0);
    const widthOverflow = Math.max(0, paperDims.width - plotterDims.width);
    const heightOverflow = Math.max(0, paperDims.height - plotterDims.height);

    if (widthOverflow <= 0 && heightOverflow <= 0) {
        return null;
    }

    const name = plotterSpecs.name || 'Plotter';
    const withinTravel = effectiveWidth <= plotterDims.width && effectiveHeight <= plotterDims.height;

    if (withinTravel) {
        return {
            severity: 'warning',
            message: `${name} travel ${plotterDims.width.toFixed(1)}×${plotterDims.height.toFixed(1)}mm is slightly smaller than ${paper.name} (${paperDims.width.toFixed(1)}×${paperDims.height.toFixed(1)}mm). Current margin keeps the drawing within reach.`,
            overflow: { widthOverflow, heightOverflow }
        };
    }

    return {
        severity: 'error',
        message: `${name} travel ${plotterDims.width.toFixed(1)}×${plotterDims.height.toFixed(1)}mm is smaller than ${paper.name} (${paperDims.width.toFixed(1)}×${paperDims.height.toFixed(1)}mm). Reduce margins or choose a smaller sheet.`,
        overflow: { widthOverflow, heightOverflow }
    };
}
