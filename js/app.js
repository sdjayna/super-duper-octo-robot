import { createSVG, createColorGroups, createPath } from './svgUtils.js';
import { validateBouwkampCode, generateSingleSerpentineLine, areRectanglesAdjacent } from './bouwkampUtils.js';

import { DrawingConfig } from './DrawingConfig.js';

/**
 * Manages color selection and adjacency tracking
 */
class ColorManager {
    constructor(palette) {
        this.palette = palette;
        this.placedRectangles = [];
        this.colorUsage = new Map(Object.values(palette).map(color => [color.hex, 0]));
        this.recentColors = [];
        this.maxRecentColors = 3;
    }

    getValidColor(newRect) {
        const colorScores = Object.values(this.palette)
            .map(color => ({
                color: color.hex,
                score: this.getColorScore(color.hex, newRect)
            }))
            .filter(({score}) => score !== -Infinity)
            .sort((a, b) => a.score - b.score);

        const selectedColor = colorScores[0]?.color || this.getLeastUsedColor();
        this.updateTracking(selectedColor, newRect);
        return selectedColor;
    }

    getColorScore(color, newRect) {
        const isAdjacent = this.placedRectangles.some(placed => 
            areRectanglesAdjacent(newRect, placed.rect) && placed.color === color);
        if (isAdjacent) {
            return -Infinity;
        }
        return this.colorUsage.get(color) * 2 + 
               (this.recentColors.includes(color) ? 1 : 0);
    }

    getLeastUsedColor() {
        return Array.from(this.colorUsage.entries())
            .sort(([, a], [, b]) => a - b)[0][0];
    }

    updateTracking(color, rect) {
        this.colorUsage.set(color, this.colorUsage.get(color) + 1);
        this.recentColors.unshift(color);
        if (this.recentColors.length > this.maxRecentColors) {
            this.recentColors.pop();
        }
        this.placedRectangles.push({ rect, color });
    }
}

/**
 * Draws a Bouwkamp code using serpentine line patterns
 * @param {number[]} code - The Bouwkamp code to draw
 * @returns {SVGElement} The generated SVG element
 */
function drawBouwkampCode(drawingConfig) {
    const bouwkamp = drawingConfig.drawingData;
    const svg = createSVG(drawingConfig, bouwkamp.width, bouwkamp.height);

    const colorGroups = createColorGroups(svg, drawingConfig.colorPalette);
    const colorManager = new ColorManager(drawingConfig.colorPalette);

    const helper = new Array(900).fill(0);

    for (let rect = 0; rect < bouwkamp.order; rect++) {
        let i = 0;
        for (let j = 1; j < bouwkamp.width; j++) {
            if (helper[j] < helper[i]) {
                i = j;
            }
        }

        const position = { x: i, y: helper[i] };
        const size = bouwkamp.squares[rect];
        const vertexGap = drawingConfig.line.vertexGap;
        const rectData = { 
            x: position.x + vertexGap, 
            y: position.y + vertexGap, 
            width: size - (2 * vertexGap), 
            height: size - (2 * vertexGap)
        };
        const points = generateSingleSerpentineLine(rectData, drawingConfig.line.width);
        
        const pathElement = createPath(points);
        pathElement.setAttribute('stroke-width', drawingConfig.line.strokeWidth.toString());
        
        const color = colorManager.getValidColor(rectData);
        colorGroups[color].appendChild(pathElement);

        for (let j = 0; j < size; j++) {
            helper[i + j] += size;
        }
    }
    return svg;
}

/**
 * Generates and displays the SVG visualization
 */
export function generateSVG(drawingConfig) {
    try {
        if (!drawingConfig) {
            throw new Error('Drawing configuration is required');
        }

        let svg;
        switch (drawingConfig.type) {
            case 'bouwkamp':
                validateBouwkampCode(drawingConfig.drawingData.toArray());
                svg = drawBouwkampCode(drawingConfig);
                break;
            case 'delaunay':
                svg = drawDelaunayTriangulation(drawingConfig);
                break;
            default:
                throw new Error(`Unsupported drawing type: ${drawingConfig.type}`);
        }

        if (!svg) {
            throw new Error('Failed to generate SVG');
        }
        return svg;
    } catch (error) {
        console.error('Error generating visualization:', error);
        throw error;
    }
}

function drawDelaunayTriangulation(drawingConfig) {
    const delaunay = drawingConfig.drawingData;
    const svg = createSVG(drawingConfig, delaunay.width, delaunay.height);
    
    const colorGroups = createColorGroups(svg, drawingConfig.colorPalette);
    const colorManager = new ColorManager(drawingConfig.colorPalette);
    
    // Create triangles from the points
    const points = delaunay.points;
    const triangles = [];
    
    // Create as many triangles as we have colors
    const numColors = Object.keys(drawingConfig.colorPalette).length;
    for (let i = 0; i < numColors && i < points.length - 2; i++) {
        const triPoints = [
            points[i % points.length],
            points[(i + 1) % points.length],
            points[(i + 2) % points.length]
        ];
        
        // Create a triangle using three consecutive points
        const triangle = {
            points: triPoints,
            // Add bounding box for color manager
            x: Math.min(...triPoints.map(p => p.x)),
            y: Math.min(...triPoints.map(p => p.y)),
            width: Math.max(...triPoints.map(p => p.x)) - Math.min(...triPoints.map(p => p.x)),
            height: Math.max(...triPoints.map(p => p.y)) - Math.min(...triPoints.map(p => p.y))
        };
        triangles.push(triangle);
    }
    
    // Draw each triangle
    triangles.forEach(triangle => {
        const pathPoints = [...triangle.points, triangle.points[0]]; // Close the triangle
        const pathElement = createPath(pathPoints);
        pathElement.setAttribute('stroke-width', drawingConfig.line.strokeWidth.toString());
        
        // Get a color for this triangle
        const color = colorManager.getValidColor(triangle);
        colorGroups[color].appendChild(pathElement);
        
        // Add some debug output
        console.log('Drawing triangle:', {
            points: triangle.points,
            color: color,
            bbox: { x: triangle.x, y: triangle.y, width: triangle.width, height: triangle.height }
        });
    });
    
    return svg;
}
