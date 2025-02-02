import { BouwkampConfig } from './BouwkampConfig.js';
import { DelaunayConfig } from './DelaunayConfig.js';

export class DrawingConfig {
    constructor(name, params) {
        // Basic drawing info
        this.name = name;
        this.type = params.type;

        // Drawing-specific configurations
        switch (params.type) {
            case 'bouwkamp':
                this.drawingData = new BouwkampConfig(params.code);
                break;
            case 'delaunay':
                this.drawingData = new DelaunayConfig(params.triangulation);
                break;
            default:
                throw new Error(`Unsupported drawing type: ${params.type}`);
        }

        // Paper configuration
        this.paper = {
            width: params.paper?.width || 420,
            height: params.paper?.height || 297,
            margin: params.paper?.margin || 12.5
        };

        // Line configuration
        this.line = {
            width: params.line?.width || 0.3,
            spacing: params.line?.spacing || 2.5,
            strokeWidth: params.line?.strokeWidth || 0.45,
            vertexGap: params.line?.vertexGap || 0.5
        };

        this.colorPalette = params.colorPalette;
    }
}
