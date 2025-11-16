import {
    defineDrawing,
    SizedDrawingConfig,
    createDrawingRuntime,
    colorPalettes,
    generatePolygonScanlineHatch,
    generatePolygonSerpentineHatch,
    rectToPolygon,
    computeBoundsFromPoints
} from '../shared/kit.js';
import { attachControls } from '../shared/controlsUtils.js';
import { clampInteger, clampNumber } from '../shared/utils/paramMath.js';

const VORONOI_LIMITS = {
    pointCount: { min: 150, max: 450, default: 280 },
    relaxationPasses: { min: 0, max: 3, default: 2 },
    neighbors: { min: 2, max: 5, default: 4 },
    jitter: { min: 0, max: 1, default: 0.25 },
    seed: { min: 1, max: 9999, default: 42 },
    cellInset: { min: 0, max: 10, default: 0 }
};

export class VoronoiConfig extends SizedDrawingConfig {
    constructor(params = {}) {
        super(params);
        this.pointCount = clampInteger(params.pointCount, VORONOI_LIMITS.pointCount.min, VORONOI_LIMITS.pointCount.max, VORONOI_LIMITS.pointCount.default);
        this.relaxationPasses = clampInteger(params.relaxationPasses, VORONOI_LIMITS.relaxationPasses.min, VORONOI_LIMITS.relaxationPasses.max, VORONOI_LIMITS.relaxationPasses.default);
        this.boundary = params.boundary === 'circle' ? 'circle' : 'rect';
        this.neighbors = clampInteger(params.neighbors, VORONOI_LIMITS.neighbors.min, VORONOI_LIMITS.neighbors.max, VORONOI_LIMITS.neighbors.default);
        this.jitter = clampNumber(params.jitter, VORONOI_LIMITS.jitter.min, VORONOI_LIMITS.jitter.max, VORONOI_LIMITS.jitter.default);
        this.seed = clampInteger(params.seed, VORONOI_LIMITS.seed.min, VORONOI_LIMITS.seed.max, VORONOI_LIMITS.seed.default);
        this.showEdges = params.showEdges !== false;
        this.cellInset = clampNumber(params.cellInset, VORONOI_LIMITS.cellInset.min, VORONOI_LIMITS.cellInset.max, VORONOI_LIMITS.cellInset.default);
    }

    getBounds(context = {}) {
        const baseBounds = super.getBounds(context);
        const ratio = resolvePaperAspectRatio(context.paper, context.orientation);
        if (!ratio) {
            return baseBounds;
        }
        const baseWidth = Math.max(baseBounds.width, 1);
        const baseHeight = Math.max(baseBounds.height, 1);
        const baseRatio = baseWidth / baseHeight;
        if (!Number.isFinite(baseRatio) || Math.abs(baseRatio - ratio) < 1e-3) {
            return baseBounds;
        }
        let width;
        let height;
        if (ratio >= baseRatio) {
            height = baseHeight;
            width = height * ratio;
        } else {
            width = baseWidth;
            height = width / ratio;
        }
        return {
            ...baseBounds,
            width,
            height
        };
    }
}

function randomGenerator(seed) {
    let state = seed % 2147483647;
    return () => {
        state = (state * 16807) % 2147483647;
        return (state - 1) / 2147483646;
    };
}

function generateSites(config, width, height) {
    const rand = randomGenerator(config.seed);
    const sites = [];
    for (let i = 0; i < config.pointCount; i++) {
        const angle = rand() * Math.PI * 2;
        const radius = config.boundary === 'circle'
            ? Math.sqrt(rand()) * Math.min(width, height) / 2
            : null;
        const x = config.boundary === 'circle'
            ? width / 2 + Math.cos(angle) * radius
            : rand() * width;
        const y = config.boundary === 'circle'
            ? height / 2 + Math.sin(angle) * radius
            : rand() * height;
        sites.push({ x, y });
    }
    return sites;
}

function relaxSites(sites, config, width, height) {
    if (config.relaxationPasses <= 0) return sites;
    const rand = randomGenerator(config.seed + 1337);
    const samples = Math.max(config.pointCount * 15, 200);

    for (let pass = 0; pass < config.relaxationPasses; pass++) {
        const accum = sites.map(() => ({ x: 0, y: 0, count: 0 }));
        for (let i = 0; i < samples; i++) {
            const tx = rand() * width;
            const ty = rand() * height;
            let best = 0;
            let bestDist = Infinity;
            for (let s = 0; s < sites.length; s++) {
                const dx = sites[s].x - tx;
                const dy = sites[s].y - ty;
                const dist = dx * dx + dy * dy;
                if (dist < bestDist) {
                    bestDist = dist;
                    best = s;
                }
            }
            accum[best].x += tx;
            accum[best].y += ty;
            accum[best].count++;
        }
        accum.forEach((acc, idx) => {
            if (acc.count > 0) {
                sites[idx].x = acc.x / acc.count;
                sites[idx].y = acc.y / acc.count;
            }
        });
    }
    return sites;
}

function buildEdges(sites, config) {
    const edges = [];
    for (let i = 0; i < sites.length; i++) {
        const distances = sites.map((site, idx) => ({
            idx,
            dist: i === idx ? Infinity : Math.hypot(site.x - sites[i].x, site.y - sites[i].y)
        }));
        distances.sort((a, b) => a.dist - b.dist);
        for (let n = 0; n < config.neighbors; n++) {
            const neighborIndex = distances[n]?.idx;
            if (neighborIndex === i || typeof neighborIndex !== 'number') {
                continue;
            }
            edges.push({
                start: { x: sites[i].x, y: sites[i].y },
                end: { x: sites[neighborIndex].x, y: sites[neighborIndex].y }
            });
        }
    }
    return edges;
}

function buildVoronoiCells(sites, config, width, height) {
    const boundary = createBoundaryPolygon(config.boundary, width, height);
    return sites.map((site, siteIndex) => {
        let cell = boundary.map(point => ({ x: point.x, y: point.y }));
        for (let other = 0; other < sites.length; other++) {
            if (other === siteIndex) {
                continue;
            }
            cell = clipPolygonToBisector(cell, site, sites[other]);
            if (cell.length === 0) {
                break;
            }
        }
        return closePolygon(cell);
    });
}

function createBoundaryPolygon(boundaryType, width, height) {
    if (boundaryType === 'circle') {
        const segments = 80;
        const radius = Math.min(width, height) / 2;
        const centerX = width / 2;
        const centerY = height / 2;
        const polygon = [];
        for (let i = 0; i < segments; i++) {
            const angle = (Math.PI * 2 * i) / segments;
            polygon.push({
                x: centerX + Math.cos(angle) * radius,
                y: centerY + Math.sin(angle) * radius
            });
        }
        polygon.push({ ...polygon[0] });
        return polygon;
    }
    return rectToPolygon({ x: 0, y: 0, width, height });
}

function clipPolygonToBisector(polygon, site, neighbor) {
    if (!polygon.length || !Number.isFinite(neighbor?.x) || !Number.isFinite(neighbor?.y)) {
        return [];
    }
    const dx = neighbor.x - site.x;
    const dy = neighbor.y - site.y;
    if (Math.abs(dx) + Math.abs(dy) < 1e-9) {
        return polygon.map(point => ({ x: point.x, y: point.y }));
    }
    const midX = (site.x + neighbor.x) / 2;
    const midY = (site.y + neighbor.y) / 2;
    const openPolygon = polygon[0] && polygon[polygon.length - 1] &&
        polygon[0].x === polygon[polygon.length - 1].x &&
        polygon[0].y === polygon[polygon.length - 1].y
        ? polygon.slice(0, -1)
        : polygon.slice();
    if (openPolygon.length === 0) {
        return [];
    }
    const evaluate = (point) => ((point.x - midX) * dx + (point.y - midY) * dy);
    const result = [];
    for (let i = 0; i < openPolygon.length; i++) {
        const current = openPolygon[i];
        const next = openPolygon[(i + 1) % openPolygon.length];
        const currentVal = evaluate(current);
        const nextVal = evaluate(next);
        const currentInside = currentVal <= 0;
        const nextInside = nextVal <= 0;

        if (currentInside && nextInside) {
            result.push({ x: next.x, y: next.y });
        } else if (currentInside && !nextInside) {
            result.push(interpolateOnBisector(current, next, currentVal, nextVal));
        } else if (!currentInside && nextInside) {
            result.push(interpolateOnBisector(current, next, currentVal, nextVal));
            result.push({ x: next.x, y: next.y });
        }
    }
    return result;
}

function interpolateOnBisector(current, next, currentVal, nextVal) {
    const denom = currentVal - nextVal;
    const t = Math.abs(denom) < 1e-9 ? 0 : currentVal / denom;
    return {
        x: current.x + (next.x - current.x) * t,
        y: current.y + (next.y - current.y) * t
    };
}

function closePolygon(points) {
    if (!points.length) {
        return [];
    }
    const closed = points.map(point => ({ x: point.x, y: point.y }));
    const first = closed[0];
    const last = closed[closed.length - 1];
    if (Math.abs(first.x - last.x) > 1e-6 || Math.abs(first.y - last.y) > 1e-6) {
        closed.push({ x: first.x, y: first.y });
    }
    return closed;
}

function insetPolygonPoints(polygon, inset) {
    if (!polygon?.length || inset <= 0) {
        return polygon || [];
    }
    const openPoints = polygon.slice(0, -1);
    if (!openPoints.length) {
        return [];
    }
    const centroid = openPoints.reduce((acc, point) => ({
        x: acc.x + point.x,
        y: acc.y + point.y
    }), { x: 0, y: 0 });
    centroid.x /= openPoints.length;
    centroid.y /= openPoints.length;

    const insetPoints = openPoints.map(point => {
        const vx = point.x - centroid.x;
        const vy = point.y - centroid.y;
        const distance = Math.hypot(vx, vy) || 1;
        const safeDistance = Math.max(distance - inset, 0);
        const scale = safeDistance / distance;
        return {
            x: centroid.x + vx * scale,
            y: centroid.y + vy * scale
        };
    });

    insetPoints.push({ ...insetPoints[0] });
    return insetPoints;
}

function resolvePaperAspectRatio(paper, orientation) {
    if (!paper) {
        return null;
    }
    const width = Number(paper.width);
    const height = Number(paper.height);
    if (!Number.isFinite(width) || !Number.isFinite(height) || width <= 0 || height <= 0) {
        return null;
    }
    const normalizedOrientation = orientation === 'portrait' ? 'portrait' : 'landscape';
    const longer = Math.max(width, height);
    const shorter = Math.min(width, height);
    const orientedWidth = normalizedOrientation === 'portrait' ? shorter : longer;
    const orientedHeight = normalizedOrientation === 'portrait' ? longer : shorter;
    if (orientedHeight <= 0) {
        return null;
    }
    return orientedWidth / orientedHeight;
}

export function drawVoronoiSketch(drawingConfig, renderContext) {
    const { svg, builder } = createDrawingRuntime({ drawingConfig, renderContext });
    const width = renderContext.drawingWidth;
    const height = renderContext.drawingHeight;
    const spacing = Math.max(0.1, Number(drawingConfig.line?.spacing) || 2.5);
    const hatchStyle = drawingConfig.line?.hatchStyle || 'scanline';
    const hatchInset = typeof drawingConfig.line?.hatchInset === 'number'
        ? drawingConfig.line.hatchInset
        : spacing / 2;
    const includeBoundary = drawingConfig.line?.includeBoundary !== false;

    let sites = generateSites(drawingConfig.drawingData, width, height);
    sites = relaxSites(sites, drawingConfig.drawingData, width, height);
    const edges = buildEdges(sites, drawingConfig.drawingData);
    const cells = buildVoronoiCells(sites, drawingConfig.drawingData, width, height);

    const cellInset = Math.max(0, drawingConfig.drawingData.cellInset || 0);
    cells.forEach(cell => {
        if (!cell || cell.length < 3) {
            return;
        }
        const projectedPolygon = builder.projectPoints(cell);
        const insetPolygon = insetPolygonPoints(projectedPolygon, cellInset);
        const polygonForFill = insetPolygon.length >= 3 ? insetPolygon : projectedPolygon;
        const bounds = computeBoundsFromPoints(polygonForFill);
        const geometry = {
            x: bounds.minX,
            y: bounds.minY,
            width: bounds.width,
            height: bounds.height
        };
        let pathPoints;
        if (hatchStyle === 'none') {
            pathPoints = polygonForFill;
        } else if (hatchStyle === 'serpentine') {
            pathPoints = generatePolygonSerpentineHatch(polygonForFill, spacing, {
                inset: hatchInset,
                includeBoundary
            });
        } else {
            pathPoints = generatePolygonScanlineHatch(polygonForFill, spacing, {
                inset: hatchInset,
                includeBoundary
            });
        }
        if (pathPoints.length > 1) {
            builder.appendPath(pathPoints, { geometry });
        }
    });

    const showEdgesSetting = drawingConfig.drawingData.showEdges;
    const shouldDrawEdges = showEdgesSetting === undefined ? true : Boolean(showEdgesSetting);
    if (shouldDrawEdges) {
        edges.forEach(edge => {
            const jitterX = drawingConfig.drawingData.jitter * (Math.random() - 0.5);
            const jitterY = drawingConfig.drawingData.jitter * (Math.random() - 0.5);
            const points = [
                { x: edge.start.x + jitterX, y: edge.start.y + jitterY },
                { x: edge.end.x + jitterX, y: edge.end.y + jitterY }
            ];
            const projected = builder.projectPoints(points);
            const bounds = computeBoundsFromPoints(projected);
            builder.appendPath(projected, {
                geometry: {
                    x: bounds.minX,
                    y: bounds.minY,
                    width: bounds.width,
                    height: bounds.height
                }
            });
        });
    }

    return svg;
}

const voronoiControls = [
    {
        id: 'pointCount',
        label: 'Point Count',
        target: 'drawingData.pointCount',
        inputType: 'range',
        min: VORONOI_LIMITS.pointCount.min,
        max: VORONOI_LIMITS.pointCount.max,
        step: 10,
        default: VORONOI_LIMITS.pointCount.default,
        description: 'Number of generator points'
    },
    {
        id: 'relaxationPasses',
        label: 'Relaxation Passes',
        target: 'drawingData.relaxationPasses',
        inputType: 'range',
        min: VORONOI_LIMITS.relaxationPasses.min,
        max: VORONOI_LIMITS.relaxationPasses.max,
        step: 1,
        default: VORONOI_LIMITS.relaxationPasses.default,
        description: 'Number of Lloyd-like passes to smooth distribution'
    },
    {
        id: 'neighbors',
        label: 'Neighbor Connections',
        target: 'drawingData.neighbors',
        inputType: 'range',
        min: VORONOI_LIMITS.neighbors.min,
        max: VORONOI_LIMITS.neighbors.max,
        step: 1,
        default: VORONOI_LIMITS.neighbors.default,
        description: 'How many nearest neighbors to connect'
    },
    {
        id: 'boundary',
        label: 'Boundary Shape',
        target: 'drawingData.boundary',
        inputType: 'select',
        options: [
            { label: 'Rectangle', value: 'rect' },
            { label: 'Circle', value: 'circle' }
        ],
        default: 'rect',
        description: 'Seed distribution boundary'
    },
    {
        id: 'jitter',
        label: 'Line Jitter',
        target: 'drawingData.jitter',
        inputType: 'range',
        min: VORONOI_LIMITS.jitter.min,
        max: VORONOI_LIMITS.jitter.max,
        step: 0.05,
        default: VORONOI_LIMITS.jitter.default,
        description: 'Random offset applied to edges for organic feel'
    },
    {
        id: 'seed',
        label: 'Random Seed',
        target: 'drawingData.seed',
        inputType: 'number',
        min: VORONOI_LIMITS.seed.min,
        max: VORONOI_LIMITS.seed.max,
        step: 1,
        default: VORONOI_LIMITS.seed.default,
        description: 'Random seed for reproducible point placement'
    },
    {
        id: 'cellInset',
        label: 'Polygon Margin',
        target: 'drawingData.cellInset',
        inputType: 'range',
        min: VORONOI_LIMITS.cellInset.min,
        max: VORONOI_LIMITS.cellInset.max,
        step: 0.1,
        default: VORONOI_LIMITS.cellInset.default,
        units: 'mm',
        description: 'Shrinks each cell before filling to create gutters between polygons'
    },
    {
        id: 'showEdges',
        label: 'Show Edge Graph',
        target: 'drawingData.showEdges',
        inputType: 'checkbox',
        valueType: 'boolean',
        default: true,
        description: 'Draw neighbor edges in addition to the filled cells'
    }
];

const voronoiDefinition = attachControls(defineDrawing({
    id: 'voronoi',
    name: 'Voronoi Sketch',
    configClass: VoronoiConfig,
    drawFunction: drawVoronoiSketch,
    presets: [
        {
            key: 'voronoiRelaxed',
            name: 'Relaxed Voronoi',
            params: {
                type: 'voronoi',
                width: 260,
                height: 220,
                pointCount: 220,
                relaxationPasses: 2,
                neighbors: 4,
                boundary: 'rect',
                jitter: 0.3,
                seed: 101,
                cellInset: 0,
                showEdges: true,
                line: {
                    strokeWidth: 0.25
                },
                colorPalette: colorPalettes.sakuraPalette
            }
        }
    ]
}), voronoiControls);

export const voronoiDrawing = voronoiDefinition;
export default voronoiDefinition;
