import { createSVG, createColorGroups, createPath } from '../svgUtils.js';
import { ColorManager } from '../ColorManager.js';

function generateHilbertPoints(n, width, height) {
    const points = [];
    const size = Math.max(width, height);

    function hilbert(x0, y0, xi, xj, yi, yj, n) {
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
    
    const points = generateHilbertPoints(hilbert.level, hilbert.width, hilbert.height);

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
