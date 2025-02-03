import { DrawingConfig } from './DrawingConfig.js';
import { colorPalette } from './colorPalette.js';

export const drawings = {
    simplePerfectRectangle: new DrawingConfig(
        'Simple Perfect Rectangle',
        {
            type: 'bouwkamp',
            code: [17, 403, 285, 148, 111, 144, 75, 36, 3, 141, 39, 58, 37, 53, 21, 16, 15, 99, 84, 79],
            paper: {
                width: 420,
                height: 297,
                margin: 12.5
            },
            line: {
                spacing: 2,
                strokeWidth: 0.85,
                vertexGap: 0.20
            },
            colorPalette
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
            colorPalette
        }
    )
};
