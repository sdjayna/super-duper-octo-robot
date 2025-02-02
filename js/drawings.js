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
                width: 0.3,
                spacing: 2.5,
                strokeWidth: 0.45,
                vertexGap: 0.5
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
                    { x: 0, y: 0 },
                    { x: 100, y: 0 },
                    { x: 50, y: 86.6 },
                    { x: 25, y: 43.3 },
                    { x: 75, y: 43.3 },
                    { x: 50, y: 25 }
                ],
                width: 100,
                height: 86.6
            },
            paper: {
                width: 200,
                height: 200,
                margin: 20
            },
            line: {
                width: 0.2,
                spacing: 1.5,
                strokeWidth: 0.3,
                vertexGap: 0
            },
            colorPalette
        }
    )
};
