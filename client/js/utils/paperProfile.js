import { mediumMetadata } from './colorUtils.js';

function normalizePreviewConfig(config = {}) {
    return {
        pressure: typeof config.pressure === 'number' ? config.pressure : 0.5,
        hatchSpacing: typeof config.hatchSpacing === 'number' ? config.hatchSpacing : 1,
        jitter: typeof config.jitter === 'number' ? config.jitter : 0,
        bleedRadius: typeof config.bleedRadius === 'number' ? config.bleedRadius : 0
    };
}

function derivePaperModifier(paper = {}) {
    const modifiers = {
        pressure: 0,
        hatchSpacing: 0,
        jitter: 0,
        bleedRadius: 0
    };

    const finish = (paper.finish || '').toLowerCase();
    const absorbency = (paper.absorbency || '').toLowerCase();
    const texture = Number(paper.texture) || 0;

    if (finish.includes('smooth') || finish.includes('hot')) {
        modifiers.jitter -= 0.005;
        modifiers.bleedRadius -= 0.02;
    }
    if (finish.includes('vellum') || finish.includes('grain')) {
        modifiers.jitter += 0.01;
        modifiers.bleedRadius += 0.02;
    }
    if (absorbency.includes('high')) {
        modifiers.hatchSpacing += 0.5;
        modifiers.bleedRadius += 0.03;
    } else if (absorbency.includes('low')) {
        modifiers.hatchSpacing -= 0.2;
    }
    modifiers.jitter += texture * 0.01;
    return modifiers;
}

export function resolvePreviewProfile({ paper, mediumId }) {
    const medium = mediumMetadata[mediumId] || {};
    const baseline = normalizePreviewConfig(medium.preview);
    const paperMod = derivePaperModifier(paper);
    return {
        pressure: clamp(baseline.pressure + paperMod.pressure, 0, 1),
        hatchSpacing: Math.max(0.1, baseline.hatchSpacing + paperMod.hatchSpacing),
        jitter: Math.max(0, baseline.jitter + paperMod.jitter),
        bleedRadius: Math.max(0, baseline.bleedRadius + paperMod.bleedRadius)
    };
}

function clamp(value, min, max) {
    return Math.min(Math.max(value, min), max);
}
