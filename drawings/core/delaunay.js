import { createSVG, createDrawingBuilder, colorPalettes } from '../shared/clientAdapters.js';
import { PointCloudDrawingConfig, defineDrawing } from '../shared/index.js';

export class DelaunayConfig extends PointCloudDrawingConfig {
    constructor(params = {}) {
        const triangulation = params.triangulation;
        if (!triangulation) {
            throw new Error('Triangulation data is required');
        }
        super({ points: triangulation.points });
        if (!Array.isArray(this.points)) {
            throw new Error('Points must be an array');
        }
    }
}

export function drawDelaunayTriangulation(drawingConfig, renderContext) {
    const delaunay = drawingConfig.drawingData;
    const svg = createSVG(renderContext);
    const builder = createDrawingBuilder({ svg, drawingConfig, renderContext });

    const scaledPoints = builder.projectPoints(delaunay.points);
    const triangles = [];
    const numPoints = scaledPoints.length;
    
    for (let i = 0; i < numPoints; i++) {
        for (let j = 1; j < 4; j++) {
            const p1 = scaledPoints[i];
            const p2 = scaledPoints[(i + j) % numPoints];
            const p3 = scaledPoints[(i + j + 1) % numPoints];
            const triPoints = [p1, p2, p3];
            const triangle = {
                points: triPoints,
                x: Math.min(...triPoints.map(p => p.x)),
                y: Math.min(...triPoints.map(p => p.y)),
                width: Math.max(...triPoints.map(p => p.x)) - Math.min(...triPoints.map(p => p.x)),
                height: Math.max(...triPoints.map(p => p.y)) - Math.min(...triPoints.map(p => p.y))
            };
            triangles.push(triangle);
        }
    }

    triangles.forEach(triangle => {
        const pathPoints = [...triangle.points, triangle.points[0]];
        builder.appendPath(pathPoints, { geometry: triangle });
    });

    return svg;
}

export const delaunayDrawing = defineDrawing({
    id: 'delaunay',
    name: 'Delaunay Triangulation',
    configClass: DelaunayConfig,
    drawFunction: drawDelaunayTriangulation,
    presets: [
        {
            key: 'delaunayExample',
            name: 'Delaunay Example',
            params: {
                type: 'delaunay',
                triangulation: {
                    points: [
                        { x: 10, y: 10 },
                        { x: 90, y: 10 },
                        { x: 90, y: 90 },
                        { x: 10, y: 90 },
                        { x: 50, y: 50 },
                        { x: 30, y: 30 },
                        { x: 70, y: 30 },
                        { x: 70, y: 70 },
                        { x: 30, y: 70 },
                        { x: 50, y: 20 },
                        { x: 80, y: 50 },
                        { x: 50, y: 80 },
                        { x: 20, y: 50 }
                    ]
                },
                line: {
                    spacing: 1.5,
                    strokeWidth: 0.3,
                    vertexGap: 0
                },
                colorPalette: colorPalettes.sakuraPalette
            }
        }
    ]
});
