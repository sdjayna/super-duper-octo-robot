import { drawingTypes } from './drawings/types.js';

export class DrawingConfig {
    constructor(name, params) {
        this.name = name;
        this.type = params.type;
        this.drawingData = this.createDrawingData(params);
        this.paper = params.paper;
        this.line = params.line;
        this.colorPalette = params.colorPalette;
    }

    createDrawingData(params) {
        const typeConfig = drawingTypes[params.type];
        if (!typeConfig) {
            throw new Error(`Unsupported drawing type: ${params.type}`);
        }
        return new typeConfig.configClass(params);
    }
}
