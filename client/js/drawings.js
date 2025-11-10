import { drawingTypes, drawings, registerDrawing, addDrawingPreset, DrawingConfig } from './drawingRegistry.js';
import { coreDrawings } from '../../drawings/core/index.js';
import { communityDrawings } from '../../drawings/community/index.js';

function registerDrawingDefinitions(definitions = []) {
    definitions.forEach(definition => {
        if (!drawingTypes[definition.id]) {
            registerDrawing({
                id: definition.id,
                name: definition.name,
                configClass: definition.configClass,
                drawFunction: definition.drawFunction,
                validator: definition.validator
            });

            (definition.presets || []).forEach(preset => {
                addDrawingPreset(preset.key, preset.name, preset.params);
            });
        }
    });
}

registerDrawingDefinitions(coreDrawings);
registerDrawingDefinitions(communityDrawings);

export {
    drawingTypes,
    drawings,
    registerDrawing,
    addDrawingPreset,
    DrawingConfig
};
