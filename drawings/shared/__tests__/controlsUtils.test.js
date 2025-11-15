import { describe, it, expect, vi } from 'vitest';
import { attachControls } from '../controlsUtils.js';

describe('attachControls', () => {
    it('attaches controls to definition and config class', () => {
        class DummyConfig {}
        const definition = { configClass: DummyConfig };
        const controls = [{ id: 'foo' }];

        const result = attachControls(definition, controls);
        expect(result.controls).toEqual(controls);
        expect(DummyConfig.availableControls).toEqual(controls);
    });

    it('handles missing controls gracefully', () => {
        class NoControlConfig {}
        const definition = { configClass: NoControlConfig };
        const result = attachControls(definition);
        expect(Array.isArray(result.controls)).toBe(true);
        expect(result.controls).toHaveLength(0);
        expect(NoControlConfig.availableControls).toEqual([]);
    });
    it('does not throw when definition lacks configClass', () => {
        expect(() => attachControls({})).not.toThrow();
    });

    it('returns the same object reference for chaining', () => {
        class ChainConfig {}
        const definition = { id: 'chain', configClass: ChainConfig };
        const result = attachControls(definition, [{ id: 'foo' }]);
        expect(result).toBe(definition);
    });
});
