import { loadPaperConfig } from './paperConfig.js';

export const drawingTypes = {};
export const drawings = {};

const DEFAULT_FEATURE_FLAGS = {
    supportsHatching: true
};

function normalizeFeatures(features = {}) {
    return {
        ...DEFAULT_FEATURE_FLAGS,
        ...(features || {})
    };
}

export function registerDrawing({ id, name, configClass, drawFunction, validator, controls = [], features = {} }) {
    if (!id) {
        throw new Error('Drawing id is required');
    }
    if (drawingTypes[id]) {
        throw new Error(`Drawing type "${id}" is already registered`);
    }
    const resolvedControls = controls && controls.length ? controls : (configClass.availableControls || []);
    const resolvedFeatures = normalizeFeatures(features);
    drawingTypes[id] = {
        name,
        configClass,
        drawFunction,
        validator,
        controls: resolvedControls,
        features: resolvedFeatures
    };
    return drawingTypes[id];
}

export function addDrawingPreset(key, displayName, params) {
    drawings[key] = new DrawingConfig(displayName, params);
    return drawings[key];
}

export class DrawingConfig {
    constructor(name, params) {
        this.name = name;
        this.type = params.type;
        this.paper = params.paper || {};
        this.line = params.line || {};
        this.colorPalette = params.colorPalette;
        const typeEntry = drawingTypes[this.type];
        const typeControls = typeEntry?.controls || [];
        this.controls = typeControls;
        this.features = normalizeFeatures(typeEntry?.features);
        this.drawingData = this.createDrawingData(params);
    }

    static async create(name, params) {
        if (!params.paper) {
            const config = await loadPaperConfig();
            params.paper = config?.default;
        }
        return new DrawingConfig(name, params);
    }

    createDrawingData(params) {
        const typeConfig = drawingTypes[params.type];
        if (!typeConfig) {
            throw new Error(`Unsupported drawing type: ${params.type}`);
        }
        return new typeConfig.configClass(params);
    }
}

export function getDrawingControls(typeId) {
    return drawingTypes[typeId]?.controls || [];
}
