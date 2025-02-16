import { drawingTypes } from './drawings/types.js';
import { loadPaperConfig } from './paperConfig.js';

export class DrawingConfig {
    constructor(name, params) {
        this.name = name;
        this.type = params.type;
        this.drawingData = this.createDrawingData(params);
        this.line = params.line;
        this.colorPalette = params.colorPalette;
        this.paper = params.paper;
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
