import { createSVG, createColorGroups, createPath } from '../utils/svgUtils.js';
import { ColorManager } from '../utils/colorUtils.js';
export class DelaunayConfig {
    constructor(params) {
        this.width = params.paper?.width || 420;
        this.height = params.paper?.height || 297;
        const triangulation = params.triangulation;
        if (!triangulation) {
            throw new Error('Triangulation data is required');
        }
        
        this.points = triangulation.points;
        this.width = triangulation.width;
        this.height = triangulation.height;
        
        if (!Array.isArray(this.points)) {
            throw new Error('Points must be an array');
        }
    }
}

export function drawDelaunayTriangulation(drawingConfig, renderContext) {
    const delaunay = drawingConfig.drawingData;
    const svg = createSVG(renderContext);
    
    const colorGroups = createColorGroups(svg, drawingConfig.colorPalette);
    const colorManager = new ColorManager(drawingConfig.colorPalette);

    const scaledPoints = renderContext.projectPoints(delaunay.points);
    
    const triangles = [];
    const numPoints = scaledPoints.length;
    
    // Create triangles using different combinations of points
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
    
    // Draw triangles
    triangles.forEach(triangle => {
        const pathPoints = [...triangle.points, triangle.points[0]];
        const pathElement = createPath(pathPoints);
        pathElement.setAttribute('stroke-width', drawingConfig.line.strokeWidth.toString());
        
        const color = colorManager.getValidColor(triangle);
        colorGroups[color].appendChild(pathElement);
    });
    
    return svg;
}
