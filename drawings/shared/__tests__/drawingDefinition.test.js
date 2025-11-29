import { describe, it, expect } from 'vitest';
import { defineDrawing } from '../drawingDefinition.js';

describe('defineDrawing', () => {
    class DummyConfig {
        static availableControls = [];
    }
    const drawFn = () => {};

    it('returns controls metadata and attaches it to the config class', () => {
        const controls = [
            {
                id: 'size',
                label: 'Size',
                target: 'drawingData.size',
                inputType: 'number'
            }
        ];

        const definition = defineDrawing({
            id: 'dummy',
            name: 'Dummy Drawing',
            configClass: DummyConfig,
            drawFunction: drawFn,
            controls
        });

        expect(definition.controls).toEqual(controls);
        expect(DummyConfig.availableControls).toEqual(controls);
    });

    it('defaults to an empty controls array when none provided', () => {
        class NoControlConfig {
            static availableControls = [];
        }
        const definition = defineDrawing({
            id: 'nocontrol',
            name: 'No Control Drawing',
            configClass: NoControlConfig,
            drawFunction: drawFn
        });

        expect(Array.isArray(definition.controls)).toBe(true);
        expect(definition.controls).toHaveLength(0);
        expect(NoControlConfig.availableControls).toEqual([]);
    });
});
