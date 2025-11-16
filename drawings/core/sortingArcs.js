import {
    defineDrawing,
    SizedDrawingConfig,
    createDrawingRuntime,
    colorPalettes
} from '../shared/kit.js';
import { attachControls } from '../shared/controlsUtils.js';
import { clampInteger, clampNumber } from '../shared/utils/paramMath.js';

const SORTING_LIMITS = {
    arraySize: { min: 80, max: 200, default: 140 },
    shuffleStrength: { min: 0.1, max: 0.4, default: 0.25 },
    arcHeight: { min: 20, max: 70, default: 40 },
    lineWidth: { min: 0.1, max: 0.3, default: 0.18 },
    seed: { min: 1, max: 9999, default: 11 }
};

class SortingArcsConfig extends SizedDrawingConfig {
    constructor(params = {}) {
        super({
            ...params,
            width: params.width ?? 380,
            height: params.height ?? 260
        });
        this.arraySize = clampInteger(params.arraySize, SORTING_LIMITS.arraySize.min, SORTING_LIMITS.arraySize.max, SORTING_LIMITS.arraySize.default);
        this.algorithm = params.algorithm === 'quicksort' ? 'quicksort' : 'bubble';
        this.shuffleStrength = clampNumber(params.shuffleStrength, SORTING_LIMITS.shuffleStrength.min, SORTING_LIMITS.shuffleStrength.max, SORTING_LIMITS.shuffleStrength.default);
        this.arcHeight = clampNumber(params.arcHeight, SORTING_LIMITS.arcHeight.min, SORTING_LIMITS.arcHeight.max, SORTING_LIMITS.arcHeight.default);
        this.lineWidth = clampNumber(params.lineWidth, SORTING_LIMITS.lineWidth.min, SORTING_LIMITS.lineWidth.max, SORTING_LIMITS.lineWidth.default);
        this.seed = clampInteger(params.seed, SORTING_LIMITS.seed.min, SORTING_LIMITS.seed.max, SORTING_LIMITS.seed.default);
    }
}

function pseudoRandom(seed) {
    let state = seed % 2147483647;
    return () => {
        state = (state * 48271) % 2147483647;
        return (state - 1) / 2147483646;
    };
}

function generateArray(config) {
    const arr = new Array(config.arraySize).fill(0).map((_, i) => i);
    const rand = pseudoRandom(config.seed);
    for (let i = 0; i < arr.length; i++) {
        const j = Math.min(arr.length - 1, Math.floor(i + rand() * config.shuffleStrength * arr.length));
        [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
}

function bubbleArcs(array) {
    const swaps = [];
    const arr = array.slice();
    for (let i = 0; i < arr.length; i++) {
        for (let j = 0; j < arr.length - i - 1; j++) {
            if (arr[j] > arr[j + 1]) {
                swaps.push({ i: j, j: j + 1, height: arr[j] - arr[j + 1] });
                [arr[j], arr[j + 1]] = [arr[j + 1], arr[j]];
            }
        }
    }
    return swaps;
}

function quicksortArcs(array) {
    const swaps = [];
    const arr = array.slice();
    function partition(low, high) {
        const pivot = arr[high];
        let i = low;
        for (let j = low; j < high; j++) {
            if (arr[j] < pivot) {
                swaps.push({ i: i, j, height: Math.abs(arr[i] - arr[j]) });
                [arr[i], arr[j]] = [arr[j], arr[i]];
                i++;
            }
        }
        swaps.push({ i, j: high, height: Math.abs(arr[i] - arr[high]) });
        [arr[i], arr[high]] = [arr[high], arr[i]];
        return i;
    }
    function quicksort(low, high) {
        if (low < high) {
            const pi = partition(low, high);
            quicksort(low, pi - 1);
            quicksort(pi + 1, high);
        }
    }
    quicksort(0, arr.length - 1);
    return swaps;
}

export function drawSortingArcs(drawingConfig, renderContext) {
    const { svg, builder } = createDrawingRuntime({ drawingConfig, renderContext });
    const config = drawingConfig.drawingData;
    const array = generateArray(config);
    const swaps = config.algorithm === 'quicksort' ? quicksortArcs(array) : bubbleArcs(array);
    const spacing = renderContext.drawingWidth / config.arraySize;
    const baseline = renderContext.drawingHeight * 0.1;

    swaps.forEach(({ i, j, height }) => {
        const startX = i * spacing;
        const endX = j * spacing;
        const midX = (startX + endX) / 2;
        const arcHeight = baseline + Math.abs(height) * (config.arcHeight / config.arraySize);
        const path = [
            { x: startX, y: baseline },
            { x: midX, y: arcHeight },
            { x: endX, y: baseline }
        ];
        builder.appendPath(builder.projectPoints(path), {
            geometry: {
                x: 0,
                y: 0,
                width: renderContext.drawingWidth,
                height: renderContext.drawingHeight
            },
            strokeWidth: config.lineWidth
        });
    });

    return svg;
}

const sortingControls = [
    {
        id: 'arraySize',
        label: 'Array Size',
        target: 'drawingData.arraySize',
        inputType: 'range',
        min: SORTING_LIMITS.arraySize.min,
        max: SORTING_LIMITS.arraySize.max,
        step: 5,
        default: SORTING_LIMITS.arraySize.default,
        description: 'Number of elements in the array'
    },
    {
        id: 'algorithm',
        label: 'Algorithm',
        target: 'drawingData.algorithm',
        inputType: 'select',
        options: [
            { label: 'Bubble Sort', value: 'bubble' },
            { label: 'Quicksort', value: 'quicksort' }
        ],
        default: 'bubble',
        description: 'Sorting algorithm used for arc generation'
    },
    {
        id: 'shuffleStrength',
        label: 'Shuffle Strength',
        target: 'drawingData.shuffleStrength',
        inputType: 'range',
        min: SORTING_LIMITS.shuffleStrength.min,
        max: SORTING_LIMITS.shuffleStrength.max,
        step: 0.01,
        default: SORTING_LIMITS.shuffleStrength.default,
        description: 'How chaotic the initial array shuffle is'
    },
    {
        id: 'arcHeight',
        label: 'Arc Height (mm)',
        target: 'drawingData.arcHeight',
        inputType: 'range',
        min: SORTING_LIMITS.arcHeight.min,
        max: SORTING_LIMITS.arcHeight.max,
        step: 1,
        default: SORTING_LIMITS.arcHeight.default,
        description: 'Maximum arc height'
    },
    {
        id: 'lineWidth',
        label: 'Line Width',
        target: 'drawingData.lineWidth',
        inputType: 'range',
        min: SORTING_LIMITS.lineWidth.min,
        max: SORTING_LIMITS.lineWidth.max,
        step: 0.01,
        default: SORTING_LIMITS.lineWidth.default,
        description: 'Stroke width for arcs'
    },
    {
        id: 'seed',
        label: 'Seed',
        target: 'drawingData.seed',
        inputType: 'number',
        min: SORTING_LIMITS.seed.min,
        max: SORTING_LIMITS.seed.max,
        step: 1,
        default: SORTING_LIMITS.seed.default,
        description: 'Random seed controlling initial array'
    }
];

const sortingDefinition = attachControls(defineDrawing({
    id: 'sortingArcs',
    name: 'Sorting Arcs',
    configClass: SortingArcsConfig,
    drawFunction: drawSortingArcs,
    presets: [
        {
            key: 'sortingBubbleDensity',
            name: 'Bubble Density',
            params: {
                type: 'sortingArcs',
                width: 380,
                height: 220,
                arraySize: 150,
                algorithm: 'bubble',
                shuffleStrength: 0.25,
                arcHeight: 40,
                lineWidth: 0.18,
                seed: 33,
                line: { strokeWidth: 0.18 },
                colorPalette: colorPalettes.sakuraPalette
            }
        }
    ]
}), sortingControls);

export const sortingArcsDrawing = sortingDefinition;
export default sortingDefinition;
