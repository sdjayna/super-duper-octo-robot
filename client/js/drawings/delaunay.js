import { createSVG, createColorGroups, createPath } from '../svgUtils.js';
import { ColorManager } from '../utils/colorUtils.js';
import { BaseConfig } from '../configs/BaseConfig.js';

export class DelaunayConfig extends BaseConfig {
    constructor(params) {
        super(params);
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

export function drawDelaunayTriangulation(drawingConfig, isPortrait = false) {
    const delaunay = drawingConfig.drawingData;
    const svg = createSVG(drawingConfig, delaunay.width, delaunay.height, isPortrait);
    
    const colorGroups = createColorGroups(svg, drawingConfig.colorPalette);
    const colorManager = new ColorManager(drawingConfig.colorPalette);
    
    // Calculate scaling to fit within paper size while maintaining aspect ratio
    const scaleX = (drawingConfig.paper.width - 2 * drawingConfig.paper.margin) / delaunay.width;
    const scaleY = (drawingConfig.paper.height - 2 * drawingConfig.paper.margin) / delaunay.height;
    const scale = Math.min(scaleX, scaleY) * 0.98; // Use 98% of available space
    
    // Calculate the center of the paper
    const paperCenterX = drawingConfig.paper.width / 2;
    const paperCenterY = drawingConfig.paper.height / 2;
    
    // Calculate the center of the delaunay points
    const delaunayCenterX = (delaunay.width / 2);
    const delaunayCenterY = (delaunay.height / 2);
    
    // Scale and center points relative to paper center
    const scaledPoints = delaunay.points.map(p => ({
        x: paperCenterX + (p.x - delaunayCenterX) * scale,
        y: paperCenterY + (p.y - delaunayCenterY) * scale
    }));
    
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
