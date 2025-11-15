import { mediumMetadata } from './colorUtils.js';
import paperMediumProfiles from '../../../config/paperMediumProfiles.json' assert { type: 'json' };

const DEFAULT_PROFILE = {
    pressure: 0.5,
    hatchSpacing: 1.0,
    jitter: 0.01,
    bleedRadius: 0.05
};

function clamp(value, min, max) {
    return Math.min(Math.max(value, min), max);
}

function normalizePreviewConfig(config = {}) {
    return {
        pressure: typeof config.pressure === 'number' ? clamp(config.pressure, 0, 1) : DEFAULT_PROFILE.pressure,
        hatchSpacing: typeof config.hatchSpacing === 'number' ? Math.max(0.1, config.hatchSpacing) : DEFAULT_PROFILE.hatchSpacing,
        jitter: typeof config.jitter === 'number' ? Math.max(0, config.jitter) : DEFAULT_PROFILE.jitter,
        bleedRadius: typeof config.bleedRadius === 'number' ? Math.max(0, config.bleedRadius) : DEFAULT_PROFILE.bleedRadius
    };
}

function derivePaperMod(paper) {
    if (!paper) {
        return { pressure: 0, hatchSpacing: 0, jitter: 0, bleedRadius: 0 };
    }
    const modifiers = { pressure: 0, hatchSpacing: 0, jitter: 0, bleedRadius: 0 };
    const finish = (paper.finish || '').toLowerCase();
    const absorbency = (paper.absorbency || '').toLowerCase();

    if (finish.includes('smooth') || finish.includes('hot')) {
        modifiers.jitter -= 0.005;
        modifiers.bleedRadius -= 0.02;
    } else if (finish.includes('vellum') || finish.includes('grain')) {
        modifiers.jitter += 0.01;
        modifiers.bleedRadius += 0.02;
    }

    if (absorbency.includes('high')) {
        modifiers.hatchSpacing += 0.4;
        modifiers.bleedRadius += 0.03;
    } else if (absorbency.includes('low')) {
        modifiers.hatchSpacing -= 0.2;
    }
    return modifiers;
}

export function resolvePreviewProfile({ paper, mediumId }) {
    const medium = mediumMetadata[mediumId] || {};
    const base = normalizePreviewConfig(medium.preview);
    const paperMod = derivePaperMod(paper);
    const paperId = paper?.id;
    const override = paperMediumProfiles?.[mediumId]?.[paperId] || {};

    return {
        pressure: clamp(base.pressure + paperMod.pressure + (override.pressure ?? 0), 0, 1),
        hatchSpacing: Math.max(0.1, base.hatchSpacing + paperMod.hatchSpacing + (override.hatchSpacing ?? 0)),
        jitter: Math.max(0, base.jitter + paperMod.jitter + (override.jitter ?? 0)),
        bleedRadius: Math.max(0, base.bleedRadius + paperMod.bleedRadius + (override.bleedRadius ?? 0))
    };
}
