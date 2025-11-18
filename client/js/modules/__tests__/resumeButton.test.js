import { describe, it, expect } from 'vitest';
import { deriveResumeButtonState } from '../resumeButton.js';

describe('deriveResumeButtonState', () => {
    it('returns disabled when no resume data is available', () => {
        const result = deriveResumeButtonState({
            resumeStatus: { available: false },
            plotterIsRunning: false,
            layerSelectValue: '0'
        });
        expect(result.disabled).toBe(true);
        expect(result.text).toBe('Resume Plot');
    });

    it('disables when layerSelect is set to all even if resume exists', () => {
        const result = deriveResumeButtonState({
            resumeStatus: { available: true, layer: 3, layerLabel: 'Layer 3' },
            plotterIsRunning: false,
            layerSelectValue: 'all'
        });
        expect(result.disabled).toBe(true);
        expect(result.text).toBe('Resume Layer 3');
    });

    it('enables button with specific layer selected', () => {
        const result = deriveResumeButtonState({
            resumeStatus: { available: true, layer: 2 },
            plotterIsRunning: false,
            layerSelectValue: '2'
        });
        expect(result.disabled).toBe(false);
        expect(result.text).toBe('Resume Layer 2');
    });

    it('disables while plotter is running', () => {
        const result = deriveResumeButtonState({
            resumeStatus: { available: true, layer: 5 },
            plotterIsRunning: true,
            layerSelectValue: '5'
        });
        expect(result.disabled).toBe(true);
    });
});
