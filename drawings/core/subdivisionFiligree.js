import {
    defineDrawing,
    SizedDrawingConfig,
    createDrawingRuntime,
    colorPalettes,
    useAvailableColorCountOr,
    ensureColorReachableLimit
} from '../shared/kit.js';
import { attachControls } from '../shared/controlsUtils.js';
import { clampInteger, clampNumber } from '../shared/utils/paramMath.js';
import { createSeededRandom } from '../shared/utils/noiseUtils.js';

const derivedOffsetCountMax = useAvailableColorCountOr(6);
const derivedLayerCountMax = ensureColorReachableLimit(4);

const FILIGREE_LIMITS = {
    depth: { min: 2, max: 7, default: 4 },
    offsetStep: { min: 1, max: 6, default: 2.5 },
    offsetCount: { min: 2, max: derivedOffsetCountMax, default: 4 },
    noise: { min: 0, max: 0.6, default: 0.2 },
    twist: { min: 0, max: 0.4, default: 0.12 },
    layerCount: { min: 1, max: derivedLayerCountMax, default: 2 },
    seed: { min: 1, max: 9999, default: 211 }
};

class SubdivisionFiligreeConfig extends SizedDrawingConfig {
    constructor(params = {}) {
        super({
            ...params,
            width: params.width ?? 340,
            height: params.height ?? 240
        });
        this.depth = clampInteger(params.depth, FILIGREE_LIMITS.depth.min, FILIGREE_LIMITS.depth.max, FILIGREE_LIMITS.depth.default);
        this.offsetStep = clampNumber(params.offsetStep, FILIGREE_LIMITS.offsetStep.min, FILIGREE_LIMITS.offsetStep.max, FILIGREE_LIMITS.offsetStep.default);
        this.offsetCount = clampInteger(params.offsetCount, FILIGREE_LIMITS.offsetCount.min, FILIGREE_LIMITS.offsetCount.max, FILIGREE_LIMITS.offsetCount.default);
        this.noise = clampNumber(params.noise, FILIGREE_LIMITS.noise.min, FILIGREE_LIMITS.noise.max, FILIGREE_LIMITS.noise.default);
        this.twist = clampNumber(params.twist, FILIGREE_LIMITS.twist.min, FILIGREE_LIMITS.twist.max, FILIGREE_LIMITS.twist.default);
        this.layerCount = clampInteger(params.layerCount, FILIGREE_LIMITS.layerCount.min, FILIGREE_LIMITS.layerCount.max, FILIGREE_LIMITS.layerCount.default);
        this.seed = clampInteger(params.seed, FILIGREE_LIMITS.seed.min, FILIGREE_LIMITS.seed.max, FILIGREE_LIMITS.seed.default);
    }
}

function createBasePolygon(width, height) {
    const cx = width / 2;
    const cy = height / 2;
    const radius = Math.min(width, height) * 0.35;
    const points = [];
    const sides = 6;
    for (let i = 0; i < sides; i++) {
        const angle = (i / sides) * Math.PI * 2;
        points.push({
            x: cx + Math.cos(angle) * radius,
            y: cy + Math.sin(angle) * radius
        });
    }
    return points;
}

function subdividePolygon(points, depth, twist, rand) {
    let poly = [...points];
    for (let iteration = 0; iteration < depth; iteration++) {
        const next = [];
        for (let i = 0; i < poly.length; i++) {
            const current = poly[i];
            const nextPoint = poly[(i + 1) % poly.length];
            const midpoint = {
                x: (current.x + nextPoint.x) / 2,
                y: (current.y + nextPoint.y) / 2
            };
            const normal = edgeNormal(current, nextPoint);
            midpoint.x += normal.x * twist * (rand() - 0.5) * 10;
            midpoint.y += normal.y * twist * (rand() - 0.5) * 10;
            next.push(current, midpoint);
        }
        poly = smoothPolygon(next);
    }
    return poly;
}

function smoothPolygon(points) {
    return points.map((point, idx, arr) => {
        const prev = arr[(idx - 1 + arr.length) % arr.length];
        const next = arr[(idx + 1) % arr.length];
        return {
            x: (prev.x + point.x + next.x) / 3,
            y: (prev.y + point.y + next.y) / 3
        };
    });
}

function edgeNormal(a, b) {
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    const length = Math.hypot(dx, dy) || 1;
    return { x: -dy / length, y: dx / length };
}

function offsetPolygon(points, distance, noise, rand) {
    return points.map((point, idx, arr) => {
        const prev = arr[(idx - 1 + arr.length) % arr.length];
        const next = arr[(idx + 1) % arr.length];
        const normalPrev = edgeNormal(prev, point);
        const normalNext = edgeNormal(point, next);
        const normal = {
            x: (normalPrev.x + normalNext.x) / 2,
            y: (normalPrev.y + normalNext.y) / 2
        };
        const len = Math.hypot(normal.x, normal.y) || 1;
        normal.x /= len;
        normal.y /= len;
        return {
            x: point.x + normal.x * distance + (rand() - 0.5) * noise,
            y: point.y + normal.y * distance + (rand() - 0.5) * noise
        };
    });
}

export function drawSubdivisionFiligree(drawingConfig, renderContext) {
    const { svg, builder } = createDrawingRuntime({ drawingConfig, renderContext });
    const config = drawingConfig.drawingData;
    const width = renderContext.drawingWidth;
    const height = renderContext.drawingHeight;
    const base = createBasePolygon(width, height);

    for (let layer = 0; layer < config.layerCount; layer++) {
        const layerSeed = config.seed + layer * 73;
        const rand = createSeededRandom(layerSeed);
        const subdivided = subdividePolygon(base, config.depth, config.twist, rand);
        const stepCenter = (config.offsetCount - 1) / 2;
        for (let offsetIndex = 0; offsetIndex < config.offsetCount; offsetIndex++) {
            const distance = (offsetIndex - stepCenter) * config.offsetStep;
            const layerNoise = config.noise * (1 + layer * 0.2);
            const offsetPoints = offsetPolygon(subdivided, distance, layerNoise, rand);
            builder.appendPath(builder.projectPoints([...offsetPoints, offsetPoints[0]]), {
                geometry: {
                    x: 0,
                    y: 0,
                    width,
                    height
                }
            });
        }
    }

    return svg;
}

const subdivisionFiligreeControls = [
    {
        id: 'depth',
        label: 'Subdivision Depth',
        target: 'drawingData.depth',
        inputType: 'range',
        min: FILIGREE_LIMITS.depth.min,
        max: FILIGREE_LIMITS.depth.max,
        step: 1,
        default: FILIGREE_LIMITS.depth.default,
        description: 'Number of subdivision passes'
    },
    {
        id: 'offsetStep',
        label: 'Offset Step (mm)',
        target: 'drawingData.offsetStep',
        inputType: 'range',
        min: FILIGREE_LIMITS.offsetStep.min,
        max: FILIGREE_LIMITS.offsetStep.max,
        step: 0.1,
        default: FILIGREE_LIMITS.offsetStep.default,
        description: 'Spacing between successive offsets'
    },
    {
        id: 'offsetCount',
        label: 'Offset Count',
        target: 'drawingData.offsetCount',
        inputType: 'range',
        min: FILIGREE_LIMITS.offsetCount.min,
        max: FILIGREE_LIMITS.offsetCount.max,
        step: 1,
        default: FILIGREE_LIMITS.offsetCount.default,
        description: 'How many offset bands to render'
    },
    {
        id: 'noise',
        label: 'Noise Amount',
        target: 'drawingData.noise',
        inputType: 'range',
        min: FILIGREE_LIMITS.noise.min,
        max: FILIGREE_LIMITS.noise.max,
        step: 0.01,
        default: FILIGREE_LIMITS.noise.default,
        description: 'Positional noise injected into offsets'
    },
    {
        id: 'twist',
        label: 'Twist Amount',
        target: 'drawingData.twist',
        inputType: 'range',
        min: FILIGREE_LIMITS.twist.min,
        max: FILIGREE_LIMITS.twist.max,
        step: 0.01,
        default: FILIGREE_LIMITS.twist.default,
        description: 'Rotational push applied each subdivision'
    },
    {
        id: 'layerCount',
        label: 'Layer Count',
        target: 'drawingData.layerCount',
        inputType: 'range',
        min: FILIGREE_LIMITS.layerCount.min,
        max: FILIGREE_LIMITS.layerCount.max,
        step: 1,
        default: FILIGREE_LIMITS.layerCount.default,
        description: 'Number of filigree stacks'
    },
    {
        id: 'seed',
        label: 'Seed',
        target: 'drawingData.seed',
        inputType: 'number',
        min: FILIGREE_LIMITS.seed.min,
        max: FILIGREE_LIMITS.seed.max,
        step: 1,
        default: FILIGREE_LIMITS.seed.default,
        description: 'Seed controlling twist + noise'
    }
];

const subdivisionFiligreeDefinition = attachControls(defineDrawing({
    id: 'subdivisionFiligree',
    name: 'Subdivision Filigree',
    configClass: SubdivisionFiligreeConfig,
    drawFunction: drawSubdivisionFiligree,
    presets: [
        {
            key: 'filigreeBands',
            name: 'Filigree Bands',
            params: {
                type: 'subdivisionFiligree',
                width: 340,
                height: 240,
                depth: 4,
                offsetStep: 2.4,
                offsetCount: 4,
                noise: 0.25,
                twist: 0.1,
                layerCount: 2,
                seed: 314,
                line: { strokeWidth: 0.22 },
                colorPalette: colorPalettes.sakuraPalette
            }
        }
    ]
}), subdivisionFiligreeControls);

export const subdivisionFiligreeDrawing = subdivisionFiligreeDefinition;
export default subdivisionFiligreeDefinition;
