import { BouwkampConfig } from './BouwkampConfig.js';
import { DelaunayConfig } from './DelaunayConfig.js';
import { HilbertConfig } from './HilbertConfig.js';

export class DrawingConfig {
    static defaultPaper = {
        width: 420,
        height: 297,
        margin: 12.5
    };

    static defaultLine = {
        spacing: 2.5,
        strokeWidth: 0.45,
        vertexGap: 0.5
    };

    constructor(name, params) {
        this.name = name;
        this.type = params.type;
        this.drawingData = this.createDrawingData(params);
        this.paper = { ...DrawingConfig.defaultPaper, ...params.paper };
        this.line = { ...DrawingConfig.defaultLine, ...params.line };
        this.colorPalette = params.colorPalette;
    }

    createDrawingData(params) {
        const configs = {
            bouwkamp: () => new BouwkampConfig(params.code),
            delaunay: () => new DelaunayConfig(params.triangulation),
            hilbert: () => new HilbertConfig(params.level)
        };
        
        const creator = configs[params.type];
        if (!creator) {
            throw new Error(`Unsupported drawing type: ${params.type}`);
        }
        return creator();
    }
}
