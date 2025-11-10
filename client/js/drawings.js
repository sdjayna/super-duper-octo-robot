import { drawingTypes, drawings, registerDrawing, addDrawingPreset, DrawingConfig } from './drawingRegistry.js';

const DRAWINGS_MANIFEST_PATH = '/drawings-manifest.json';

function registerDrawingDefinition(definition) {
    if (!definition || !definition.id) {
        console.warn('Skipping invalid drawing definition', definition);
        return;
    }
    if (drawingTypes[definition.id]) {
        return;
    }
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

async function fetchManifest() {
    const response = await fetch(`${DRAWINGS_MANIFEST_PATH}?t=${Date.now()}`);
    if (!response.ok) {
        throw new Error(`Failed to load drawing manifest (${response.status})`);
    }
    return response.json();
}

async function loadDrawingsFromManifest() {
    if (typeof fetch !== 'function') {
        return;
    }
    const manifest = await fetchManifest();
    const versionSuffix = manifest.version ? `?v=${manifest.version}` : `?t=${Date.now()}`;

    await Promise.all(
        manifest.drawings.map(async entry => {
            try {
                const module = await import(`${entry.path}${versionSuffix}`);
                const definition = module.default
                    || module.drawing
                    || module.drawingDefinition
                    || Object.values(module).find(value => value?.configClass && value?.drawFunction);
                if (!definition) {
                    console.warn(`No drawing definition exported from ${entry.path}`);
                    return;
                }
                registerDrawingDefinition(definition);
            } catch (error) {
                console.error(`Failed to load drawing module at ${entry.path}`, error);
            }
        })
    );
}

const drawingsReady = (async () => {
    try {
        await loadDrawingsFromManifest();
    } catch (error) {
        console.error('Unable to initialize drawings manifest', error);
    }
})();

export {
    drawingTypes,
    drawings,
    registerDrawing,
    addDrawingPreset,
    DrawingConfig,
    drawingsReady
};
