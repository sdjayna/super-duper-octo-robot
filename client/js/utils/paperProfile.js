import { mediumMetadata } from './colorUtils.js';

const DEFAULT_PROFILE = {
    pressure: 0.5,
    hatchSpacing: 1.0,
    jitter: 0.01,
    bleedRadius: 0.05
};

const DEFAULT_PLOTTER_DEFAULTS = {
    penRateLower: 10
};

const PAPER_MEDIUM_OVERRIDES = {
    sakura: {
        dalersmootha3: { pressure: -0.15, hatchSpacing: -0.5 },
        strathmorebristolvellum: { pressure: -0.18, hatchSpacing: -0.55, jitter: -0.005 },
        vangoghblacka3: { pressure: -0.1, hatchSpacing: -0.4, jitter: 0.01, bleedRadius: 0.02 }
    },
    molotow: {
        dalersmootha3: { pressure: 0.05, hatchSpacing: 0.8, bleedRadius: 0.07 },
        daleraquafinehpa3: { pressure: 0.1, hatchSpacing: 1.1, bleedRadius: 0.1 },
        hahnemuhleskizze190: { pressure: -0.1, bleedRadius: 0.13 },
        vangoghblacka3: { hatchSpacing: 0.9, bleedRadius: 0.09 }
    },
    yono: {
        dalersmootha3: { pressure: 0.08, hatchSpacing: 0.9, bleedRadius: 0.07 },
        daleraquafinehpa3: { pressure: 0.12, hatchSpacing: 1.2, bleedRadius: 0.11 },
        vangoghblacka3: { hatchSpacing: 0.8, bleedRadius: 0.1 },
        hahnemuhleskizze190: { pressure: -0.05, hatchSpacing: 1.0, bleedRadius: 0.13 }
    }
};

const PAPER_MEDIUM_PLOTTER_OVERRIDES = {
    molotow: {
        dalersmootha3: { penRateLower: 5 },
        daleraquafinehpa3: { penRateLower: -5 },
        vangoghblacka3: { penRateLower: 8 },
        strathmorebristolvellum: { penRateLower: 4 },
        hahnemuhleskizze190: { penRateLower: -12 }
    },
    yono: {
        dalersmootha3: { penRateLower: 8 },
        daleraquafinehpa3: { penRateLower: -6 },
        vangoghblacka3: { penRateLower: 10 },
        strathmorebristolvellum: { penRateLower: 6 },
        hahnemuhleskizze190: { penRateLower: -15 }
    }
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

function derivePaperModifier(paper = {}) {
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
        modifiers.hatchSpacing -= 0.3;
    }
    return modifiers;
}

export function resolvePreviewProfile({ paper, mediumId }) {
    const medium = mediumMetadata[mediumId] || {};
    const base = normalizePreviewConfig(medium.preview);
    const paperMod = derivePaperModifier(paper);
    const overrides = PAPER_MEDIUM_OVERRIDES[mediumId]?.[paper?.id] ?? {};

    return {
        pressure: clamp(base.pressure + paperMod.pressure + (overrides.pressure ?? 0), 0, 1),
        hatchSpacing: Math.max(0.1, base.hatchSpacing + paperMod.hatchSpacing + (overrides.hatchSpacing ?? 0)),
        jitter: Math.max(0, base.jitter + paperMod.jitter + (overrides.jitter ?? 0)),
        bleedRadius: Math.max(0, base.bleedRadius + paperMod.bleedRadius + (overrides.bleedRadius ?? 0))
    };
}

export function evaluatePreviewWarnings(paper, profile) {
    if (!paper || !profile) {
        return [];
    }
    const warnings = [];
    const surface = (paper.surfaceStrength || '').toLowerCase();
    if (profile.bleedRadius > 0.12 && profile.hatchSpacing < 0.7) {
        warnings.push('Hatch spacing is tight for this absorbent stock—consider increasing spacing or reducing bleed.');
    }
    if (profile.pressure > 0.6 && surface !== 'excellent') {
        warnings.push('High pen pressure on this sheet may emboss or buckle the surface.');
    }
    return warnings;
}

function derivePenRateModifier(paper = {}) {
    let modifier = 0;
    const absorbency = (paper.absorbency || '').toLowerCase();
    if (absorbency.includes('medium-high')) {
        modifier -= 3;
    } else if (absorbency.includes('high')) {
        modifier -= 6;
    } else if (absorbency.includes('low-medium')) {
        modifier += 3;
    } else if (absorbency.includes('low')) {
        modifier += 5;
    }

    const strength = (paper.surfaceStrength || '').toLowerCase();
    if (strength.includes('excellent') || strength.includes('very-strong')) {
        modifier += 4;
    } else if (strength.includes('good')) {
        modifier += 2;
    } else if (strength.includes('moderate') || strength.includes('delicate')) {
        modifier -= 6;
    }

    return modifier;
}

export function resolvePlotterDefaults({ paper, mediumId }) {
    const medium = mediumMetadata[mediumId] || {};
    const base = typeof medium.plotterDefaults?.penRateLower === 'number'
        ? medium.plotterDefaults.penRateLower
        : DEFAULT_PLOTTER_DEFAULTS.penRateLower;
    const overrides = PAPER_MEDIUM_PLOTTER_OVERRIDES[mediumId]?.[paper?.id]?.penRateLower ?? 0;
    const modifier = derivePenRateModifier(paper);
    const penRateLower = clamp(Math.round(base + modifier + overrides), 1, 100);
    return { penRateLower };
}
