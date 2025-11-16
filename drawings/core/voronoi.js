import {
    defineDrawing,
    SizedDrawingConfig,
    createDrawingRuntime,
    colorPalettes
} from '../shared/kit.js';
import { attachControls } from '../shared/controlsUtils.js';
import { clampInteger, clampNumber } from '../shared/utils/paramMath.js';

const VORONOI_LIMITS = {
    pointCount: { min: 150, max: 450, default: 280 },
    relaxationPasses: { min: 0, max: 3, default: 2 },
    neighbors: { min: 2, max: 5, default: 4 },
    jitter: { min: 0, max: 1, default: 0.25 },
    seed: { min: 1, max: 9999, default: 42 }
};

class VoronoiConfig extends SizedDrawingConfig {
    constructor(params = {}) {
        super(params);
        this.pointCount = clampInteger(params.pointCount, VORONOI_LIMITS.pointCount.min, VORONOI_LIMITS.pointCount.max, VORONOI_LIMITS.pointCount.default);
        this.relaxationPasses = clampInteger(params.relaxationPasses, VORONOI_LIMITS.relaxationPasses.min, VORONOI_LIMITS.relaxationPasses.max, VORONOI_LIMITS.relaxationPasses.default);
        this.boundary = params.boundary === 'circle' ? 'circle' : 'rect';
        this.neighbors = clampInteger(params.neighbors, VORONOI_LIMITS.neighbors.min, VORONOI_LIMITS.neighbors.max, VORONOI_LIMITS.neighbors.default);
        this.jitter = clampNumber(params.jitter, VORONOI_LIMITS.jitter.min, VORONOI_LIMITS.jitter.max, VORONOI_LIMITS.jitter.default);
        this.seed = clampInteger(params.seed, VORONOI_LIMITS.seed.min, VORONOI_LIMITS.seed.max, VORONOI_LIMITS.seed.default);
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

function buildEdges(sites, config, width, height) {
    const edges = [];
    for (let i = 0; i < sites.length; i++) {
        const distances = sites.map((site, idx) => ({
            idx,
            dist: i === idx ? Infinity : Math.hypot(site.x - sites[i].x, site.y - sites[i].y)
        }));
        distances.sort((a, b) => a.dist - b.dist);
        for (let n = 0; n < config.neighbors; n++) {
            const neighbor = sites[distances[n].idx];
            edges.push([
                { x: sites[i].x, y: sites[i].y },
                { x: neighbor.x, y: neighbor.y }
            ]);
        }
    }
    return edges;
}

export function drawVoronoiSketch(drawingConfig, renderContext) {
    const { svg, builder } = createDrawingRuntime({ drawingConfig, renderContext });
    const width = renderContext.drawingWidth;
    const height = renderContext.drawingHeight;

    let sites = generateSites(drawingConfig.drawingData, width, height);
    sites = relaxSites(sites, drawingConfig.drawingData, width, height);
    const edges = buildEdges(sites, drawingConfig.drawingData, width, height);

    edges.forEach(edge => {
        const jitterX = drawingConfig.drawingData.jitter * (Math.random() - 0.5);
        const jitterY = drawingConfig.drawingData.jitter * (Math.random() - 0.5);
        const points = [
            { x: edge[0].x + jitterX, y: edge[0].y + jitterY },
            { x: edge[1].x + jitterX, y: edge[1].y + jitterY }
        ];
        builder.appendPath(builder.projectPoints(points), {
            geometry: {
                x: 0,
                y: 0,
                width,
                height
            }
        });
    });

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
