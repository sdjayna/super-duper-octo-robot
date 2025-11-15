import { describe, it, expect, vi } from 'vitest';

const mockMediums = vi.hoisted(() => ({
    sakura: {
        preview: {
            pressure: 0.35,
            hatchSpacing: 0.5,
            jitter: 0.01,
            bleedRadius: 0.05
        }
    },
    molotow: {
        preview: {
            pressure: 0.55,
            hatchSpacing: 1.2,
            jitter: 0.02,
            bleedRadius: 0.12
        }
    }
}));

vi.mock('../../../client/js/utils/colorUtils.js', () => ({
    mediumMetadata: mockMediums
}));

import { resolvePreviewProfile, evaluatePreviewWarnings } from '../../../client/js/utils/paperProfile.js';

const BASE_PAPER = {
    id: 'dalersmootha3',
    finish: 'smooth',
    absorbency: 'low',
    surfaceStrength: 'good'
};

describe('resolvePreviewProfile', () => {
    it('falls back to defaults when medium preview missing', () => {
        const profile = resolvePreviewProfile({ paper: BASE_PAPER, mediumId: 'unknown' });
        expect(profile).toMatchObject({
            pressure: expect.any(Number),
            hatchSpacing: expect.any(Number),
            jitter: expect.any(Number),
            bleedRadius: expect.any(Number)
        });
    });

    it('applies paper modifiers for absorbency and finish', () => {
        const paper = { finish: 'vellum', absorbency: 'high' };
        const profile = resolvePreviewProfile({ paper, mediumId: 'molotow' });
        expect(profile.hatchSpacing).toBeGreaterThanOrEqual(1.6);
        expect(profile.bleedRadius).toBeGreaterThanOrEqual(0.15);
        expect(profile.jitter).toBeGreaterThan(0.02);
    });

    it('applies overrides for known medium/paper combinations', () => {
        const profile = resolvePreviewProfile({ paper: BASE_PAPER, mediumId: 'sakura' });
        expect(profile.pressure).toBeLessThan(0.35);
        expect(profile.hatchSpacing).toBeLessThan(0.5);
    });

    it('clamps impossible values to safe ranges', () => {
        const paper = { finish: 'smooth', absorbency: 'low' };
        const profile = resolvePreviewProfile({ paper, mediumId: 'molotow' });
        expect(profile.pressure).toBeLessThanOrEqual(1);
        expect(profile.hatchSpacing).toBeGreaterThan(0);
        expect(profile.jitter).toBeGreaterThanOrEqual(0);
    });
});

describe('evaluatePreviewWarnings', () => {
    it('emits warnings for risky bleed/spacing combinations', () => {
        const warnings = evaluatePreviewWarnings(
            { surfaceStrength: 'good' },
            { bleedRadius: 0.2, hatchSpacing: 0.5, pressure: 0.4 }
        );
        expect(warnings.length).toBe(1);
    });

    it('emits warnings for excessive pressure on weaker sheets', () => {
        const warnings = evaluatePreviewWarnings(
            { surfaceStrength: 'moderate' },
            { bleedRadius: 0.05, hatchSpacing: 1, pressure: 0.7 }
        );
        expect(warnings.length).toBe(1);
    });

    it('returns no warnings for conservative profiles', () => {
        const warnings = evaluatePreviewWarnings(
            { surfaceStrength: 'excellent' },
            { bleedRadius: 0.02, hatchSpacing: 1.5, pressure: 0.3 }
        );
        expect(warnings).toHaveLength(0);
    });
});
