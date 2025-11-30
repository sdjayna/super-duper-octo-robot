import {
    defineDrawing,
    SizedDrawingConfig,
    createDrawingRuntime,
    colorPalettes
} from '../shared/kit.js';
import { attachControls } from '../shared/controlsUtils.js';
import { clampInteger, clampNumber } from '../shared/utils/paramMath.js';

const TRUCHET_LIMITS = {
    columns: { min: 20, max: 40, default: 30 },
    rows: { min: 30, max: 60, default: 45 },
    motifCount: { min: 1, max: 3, default: 2 },
    rotationBias: { min: 0.5, max: 0.9, default: 0.7 },
    seed: { min: 1, max: 9999, default: 64 }
};

class TruchetConfig extends SizedDrawingConfig {
    constructor(params = {}) {
        super({
            ...params,
            width: params.width ?? 380,
            height: params.height ?? 260
        });
        this.columns = clampInteger(params.columns, TRUCHET_LIMITS.columns.min, TRUCHET_LIMITS.columns.max, TRUCHET_LIMITS.columns.default);
        this.rows = clampInteger(params.rows, TRUCHET_LIMITS.rows.min, TRUCHET_LIMITS.rows.max, TRUCHET_LIMITS.rows.default);
        this.motifCount = clampInteger(params.motifCount, TRUCHET_LIMITS.motifCount.min, TRUCHET_LIMITS.motifCount.max, TRUCHET_LIMITS.motifCount.default);
        this.rotationBias = clampNumber(params.rotationBias, TRUCHET_LIMITS.rotationBias.min, TRUCHET_LIMITS.rotationBias.max, TRUCHET_LIMITS.rotationBias.default);
        this.seed = clampInteger(params.seed, TRUCHET_LIMITS.seed.min, TRUCHET_LIMITS.seed.max, TRUCHET_LIMITS.seed.default);
    }
}

function pseudoRandom(seed) {
    let state = seed % 2147483647;
    return () => {
        state = (state * 16807) % 2147483647;
        return (state - 1) / 2147483646;
    };
}

export function drawTruchetTiles(drawingConfig, renderContext) {
    const { svg, builder } = createDrawingRuntime({ drawingConfig, renderContext });
    const config = drawingConfig.drawingData;
    const tileWidth = renderContext.drawingWidth / config.columns;
    const tileHeight = renderContext.drawingHeight / config.rows;
    const rand = pseudoRandom(config.seed);

    for (let row = 0; row < config.rows; row++) {
        for (let col = 0; col < config.columns; col++) {
            const x = col * tileWidth;
            const y = row * tileHeight;
            const rotation = chooseRotation(rand, config.rotationBias);
            const motif = Math.floor(rand() * config.motifCount);
            const path = createMotifPath(x, y, tileWidth, tileHeight, motif, rotation);
            builder.appendPath(builder.projectPoints(path), {
                geometry: {
                    x,
                    y,
                    width: tileWidth,
                    height: tileHeight
                }
            });
        }
    }
    return svg;
}

function chooseRotation(rand, bias) {
    return rand() < bias ? 0 : Math.PI;
}

function createMotifPath(x, y, width, height, motif, rotation) {
    const points = [];
    const cx = x + width / 2;
    const cy = y + height / 2;
    const radius = Math.min(width, height) / 2;
    const start = rotation;

    const arcPoints = (startAngle, endAngle) => {
        const pts = [];
        const steps = 6;
        for (let i = 0; i <= steps; i++) {
            const angle = startAngle + (i / steps) * (endAngle - startAngle);
            pts.push({
                x: cx + radius * Math.cos(angle),
                y: cy + radius * Math.sin(angle)
            });
        }
        return pts;
    };

    if (motif === 0) {
        points.push(...arcPoints(start, start + Math.PI / 2));
        points.push(...arcPoints(start + Math.PI, start + (3 * Math.PI) / 2));
    } else {
        points.push(
            { x: x, y: y + height / 2 },
            { x: x + width / 2, y: y },
            { x: x + width, y: y + height / 2 },
            { x: x + width / 2, y: y + height },
            { x: x, y: y + height / 2 }
        );
    }
    return points;
}

const truchetControls = [
    {
        id: 'columns',
        label: 'Columns',
        target: 'drawingData.columns',
        inputType: 'range',
        min: TRUCHET_LIMITS.columns.min,
        max: TRUCHET_LIMITS.columns.max,
        step: 1,
        default: TRUCHET_LIMITS.columns.default,
        description: 'Horizontal tile count'
    },
    {
        id: 'rows',
        label: 'Rows',
        target: 'drawingData.rows',
        inputType: 'range',
        min: TRUCHET_LIMITS.rows.min,
        max: TRUCHET_LIMITS.rows.max,
        step: 1,
        default: TRUCHET_LIMITS.rows.default,
        description: 'Vertical tile count'
    },
    {
        id: 'motifCount',
        label: 'Motifs',
        target: 'drawingData.motifCount',
        inputType: 'range',
        min: TRUCHET_LIMITS.motifCount.min,
        max: TRUCHET_LIMITS.motifCount.max,
        step: 1,
        default: TRUCHET_LIMITS.motifCount.default,
        description: 'Number of motifs to choose from'
    },
    {
        id: 'rotationBias',
        label: 'Rotation Bias',
        target: 'drawingData.rotationBias',
        inputType: 'range',
        min: TRUCHET_LIMITS.rotationBias.min,
        max: TRUCHET_LIMITS.rotationBias.max,
        step: 0.01,
        default: TRUCHET_LIMITS.rotationBias.default,
        description: 'Bias toward 0° vs 180° rotations'
    },
    {
        id: 'seed',
        label: 'Seed',
        target: 'drawingData.seed',
        inputType: 'number',
        min: TRUCHET_LIMITS.seed.min,
        max: TRUCHET_LIMITS.seed.max,
        step: 1,
        default: TRUCHET_LIMITS.seed.default,
        description: 'Random seed for tile selection'
    }
];

const truchetDefinition = attachControls(defineDrawing({
    id: 'truchet',
    name: 'Truchet Tiles',
    configClass: TruchetConfig,
    drawFunction: drawTruchetTiles,
    presets: [
        {
            key: 'truchetArcWaves',
            name: 'Arc Waves',
            params: {
                type: 'truchet',
                width: 380,
                height: 260,
                columns: 32,
                rows: 48,
                motifCount: 2,
                rotationBias: 0.75,
                seed: 140,
                line: { strokeWidth: 0.25 },
                colorPalette: colorPalettes.sakuraPalette
            }
        }
    ]
}), truchetControls);

export const truchetDrawing = truchetDefinition;
export default truchetDefinition;
