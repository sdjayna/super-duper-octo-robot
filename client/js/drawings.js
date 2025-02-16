import { drawingTypes } from './drawings/types.js';
import { loadPaperConfig } from './paperConfig.js';
import { colorPalettes } from './utils/colorUtils.js';

export class DrawingConfig {
    constructor(name, params) {
        this.name = name;
        this.type = params.type;
        this.paper = params.paper;
        this.line = params.line;
        this.colorPalette = params.colorPalette;
        // Create drawing data after all properties are set
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

export const drawings = {
    simplePerfectRectangle: new DrawingConfig(
        'Simple Perfect Rectangle',
        {
            type: 'bouwkamp',
            code: [17, 403, 285, 148, 111, 144, 75, 36, 3, 141, 39, 58, 37, 53, 21, 16, 15, 99, 84, 79],
            paper: {
                width: 432,
                height: 279,
                margin: 10,
            },
            line: {
                spacing: 2,
                strokeWidth: 0.85,
                vertexGap: 0.20
            },
            colorPalette: colorPalettes.sakuraPalette
        }
    ),
    
    delaunayExample: new DrawingConfig(
        'Delaunay Example',
        {
            type: 'delaunay',
            triangulation: {
                points: [
                    { x: 10, y: 10 },   // Top left
                    { x: 90, y: 10 },   // Top right
                    { x: 90, y: 90 },   // Bottom right
                    { x: 10, y: 90 },   // Bottom left
                    { x: 50, y: 50 },   // Center
                    { x: 30, y: 30 },   // Upper left quadrant
                    { x: 70, y: 30 },   // Upper right quadrant
                    { x: 70, y: 70 },   // Lower right quadrant
                    { x: 30, y: 70 },   // Lower left quadrant
                    { x: 50, y: 20 },   // Top middle
                    { x: 80, y: 50 },   // Right middle
                    { x: 50, y: 80 },   // Bottom middle
                    { x: 20, y: 50 }    // Left middle
                ],
                width: 100,
                height: 100
            },
            paper: {
                width: 200,
                height: 200,
                margin: 20
            },
            line: {
                spacing: 1.5,
                strokeWidth: 0.3,
                vertexGap: 0
            },
            colorPalette: colorPalettes.sakuraPalette
        }
    ),
    
    hilbertCurve: new DrawingConfig(
        'Hilbert Curve',
        {
            type: 'hilbert',
            level: 7,
            paper: {
                width: 432,
                height: 279,
                margin: 10,
            },
            line: {
                spacing: 1.5,
                strokeWidth: 0.5,
                vertexGap: 0
            },
            colorPalette: colorPalettes.sakuraPalette
        }
    )
};
