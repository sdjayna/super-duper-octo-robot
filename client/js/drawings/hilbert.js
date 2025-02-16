import { createSVG, createColorGroups, createPath } from '../utils/svgUtils.js';
import { ColorManager } from '../utils/colorUtils.js';
import { BaseConfig } from '../configs/BaseConfig.js';

export class HilbertConfig extends BaseConfig {
    constructor(params) {
        super(params);
        // Extract level from params, default to 7 if not provided
        this.level = params.level || 7;
        // Use paper dimensions if provided, otherwise default values
        this.width = params.paper?.width || 420;
        this.height = params.paper?.height || 297;
    }

    toArray() {
        // For Hilbert curve, we just need the level
        return [this.level];
    }
}

function generateHilbertPoints(n, width, height) {
    const points = [];
    const size = Math.max(width, height);

    // Add safety check for n
    if (n < 0 || n > 10) { // 10 is a reasonable max level to prevent stack overflow
        console.warn(`Invalid Hilbert level: ${n}. Using level 3.`);
        n = 3;
    }

    function hilbert(x0, y0, xi, xj, yi, yj, n) {
        // Add explicit check for negative n
        if (n < 0) return;
        
        if (n <= 0) {
            points.push({ x: x0 + (xi + yi) / 2, y: y0 + (xj + yj) / 2 });
        } else {
            hilbert(x0, y0, yi / 2, yj / 2, xi / 2, xj / 2, n - 1);
            hilbert(x0 + xi / 2, y0 + xj / 2, xi / 2, xj / 2, yi / 2, yj / 2, n - 1);
            hilbert(x0 + xi / 2 + yi / 2, y0 + xj / 2 + yj / 2, xi / 2, xj / 2, yi / 2, yj / 2, n - 1);
            hilbert(x0 + xi / 2 + yi, y0 + xj / 2 + yj, -yi / 2, -yj / 2, -xi / 2, -xj / 2, n - 1);
        }
    }

    hilbert(0, 0, size, 0, 0, size, n);

    // Scale points to fit within drawing area
    const scaleX = width / size;
    const scaleY = height / size;
    return points.map(({ x, y }) => ({
        x: x * scaleX,
        y: y * scaleY,
    }));
}

function addWavyEffect(points, amplitude = 1, frequency = 0.1) {
    return points.map((point, index) => {
        const angle = frequency * index;
        const dx = amplitude * Math.sin(angle);
        const dy = amplitude * Math.cos(angle);
        return {
            x: point.x + dx,
            y: point.y + dy,
        };
    });
}

export function drawHilbertCurve(drawingConfig, isPortrait = false) {
    const hilbert = drawingConfig.drawingData;
    const svg = createSVG(drawingConfig, hilbert.width, hilbert.height, isPortrait);
    
    const colorGroups = createColorGroups(svg, drawingConfig.colorPalette);
    const colorManager = new ColorManager(drawingConfig.colorPalette);

    // Calculate scaling to fit within paper size while maintaining aspect ratio
    const scaleX = (drawingConfig.paper.width - 2 * drawingConfig.paper.margin) / hilbert.width;
    const scaleY = (drawingConfig.paper.height - 2 * drawingConfig.paper.margin) / hilbert.height;
    const scale = Math.min(scaleX, scaleY); // Use 100% of available space
    
    // Calculate the center of the paper
    const paperCenterX = drawingConfig.paper.width / 2;
    const paperCenterY = drawingConfig.paper.height / 2;
    
    // Calculate the center of the hilbert points
    const hilbertCenterX = hilbert.width / 2;
    const hilbertCenterY = hilbert.height / 2;
    
    // Generate and scale points
    const rawPoints = generateHilbertPoints(hilbert.level, hilbert.width, hilbert.height);
    const points = rawPoints.map(p => ({
        x: paperCenterX + (p.x - hilbertCenterX) * scale,
        y: paperCenterY + (p.y - hilbertCenterY) * scale
    }));

    // Process points in chunks of 3 for coloring
    for (let i = 0; i < points.length - 1; i += 3) {
        const start = i;
        const end = Math.min(i + 3, points.length);
        
        const segmentPoints = points.slice(start, end);
        const wavyPoints = addWavyEffect(segmentPoints, 1, 0.5);
        
        const color = colorManager.getValidColor({ 
            x: wavyPoints[0].x, 
            y: wavyPoints[0].y,
            width: 1,
            height: 1
        });
        
        const path = createPath(wavyPoints);
        path.setAttribute('stroke-width', drawingConfig.line.strokeWidth);
        
        colorGroups[color].appendChild(path);
        colorManager.updateTracking(color, { 
            x: wavyPoints[0].x, 
            y: wavyPoints[0].y,
            width: 1,
            height: 1
        });
    }

    return svg;
}
