import { drawingTypes, registerDrawing, addDrawingPreset } from './drawingRegistry.js';

const DRAWINGS_MANIFEST_PATH = '/drawings-manifest.json';
const isBrowserEnvironment = typeof fetch === 'function';
let loadPromise = null;

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
        validator: definition.validator,
        controls: definition.controls,
        features: definition.features
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

async function importDrawing(entry, versionSuffix) {
    try {
        const module = await import(`${entry.path}${versionSuffix}`);
        const definition = module.default
            || module.drawing
            || module.drawingDefinition
            || Object.values(module).find(
                value => value?.configClass && value?.drawFunction
            );
        if (!definition) {
            console.warn(`No drawing definition exported from ${entry.path}`);
            return;
        }
        registerDrawingDefinition(definition);
    } catch (error) {
        console.error(`Failed to load drawing module at ${entry.path}`, error);
    }
}

export function ensureDrawingsLoaded() {
    if (!isBrowserEnvironment) {
        return Promise.resolve();
    }
    if (!loadPromise) {
        loadPromise = (async () => {
            const manifest = await fetchManifest();
            const timestamp = Date.now();
            const baseSuffix = manifest.version
                ? `?v=${manifest.version}`
                : `?t=${timestamp}`;
            const versionSuffix = `${baseSuffix}&ts=${timestamp}`;
            await Promise.all(manifest.drawings.map(entry =>
                importDrawing(entry, versionSuffix)
            ));
        })().catch(error => {
            console.error('Unable to initialize drawings manifest', error);
            throw error;
        });
    }
    return loadPromise;
}
