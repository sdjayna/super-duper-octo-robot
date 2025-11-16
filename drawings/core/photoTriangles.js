import {
    defineDrawing,
    SizedDrawingConfig,
    createDrawingRuntime,
    colorPalettes,
    generatePolygonScanlineHatch,
    generatePolygonSerpentineHatch
} from '../shared/kit.js';
import { attachControls } from '../shared/controlsUtils.js';
import { clampInteger, clampNumber } from '../shared/utils/paramMath.js';

const TRI_LIMITS = {
    triangleCount: { min: 150, max: 1500, default: 800 },
    sampleResolution: { min: 48, max: 1024, default: 320 },
    contrast: { min: 0, max: 1, default: 0.25 },
    colorNoise: { min: 0, max: 0.35, default: 0.1 },
    seed: { min: 1, max: 9999, default: 421 }
};

export class PhotoTriangleConfig extends SizedDrawingConfig {
    constructor(params = {}) {
        super(params);
        this.triangleCount = clampInteger(
            params.triangleCount,
            TRI_LIMITS.triangleCount.min,
            TRI_LIMITS.triangleCount.max,
            TRI_LIMITS.triangleCount.default
        );
        this.sampleResolution = clampInteger(
            params.sampleResolution,
            TRI_LIMITS.sampleResolution.min,
            TRI_LIMITS.sampleResolution.max,
            TRI_LIMITS.sampleResolution.default
        );
        this.contrastBias = clampNumber(
            params.contrastBias,
            TRI_LIMITS.contrast.min,
            TRI_LIMITS.contrast.max,
            TRI_LIMITS.contrast.default
        );
        this.colorNoise = clampNumber(
            params.colorNoise,
            TRI_LIMITS.colorNoise.min,
            TRI_LIMITS.colorNoise.max,
            TRI_LIMITS.colorNoise.default
        );
        this.seed = clampInteger(
            params.seed,
            TRI_LIMITS.seed.min,
            TRI_LIMITS.seed.max,
            TRI_LIMITS.seed.default
        );
        this.imageDataUrl = typeof params.imageDataUrl === 'string' ? params.imageDataUrl : '';
    }
}

let imageSamplerFactory = loadImageSampler;

export async function drawPhotoTriangleMosaic(drawingConfig, renderContext) {
    const { svg, builder } = createDrawingRuntime({ drawingConfig, renderContext });
    const width = renderContext.drawingWidth;
    const height = renderContext.drawingHeight;
    const drawingData = drawingConfig.drawingData;

    if (!drawingData.imageDataUrl) {
        return svg;
    }

    const sampler = await imageSamplerFactory(drawingData.imageDataUrl, drawingData.sampleResolution);
    if (!sampler) {
        return svg;
    }

    const samplePoints = generateSamplePoints({
        width,
        height,
        sampler,
        count: drawingData.triangleCount,
        seed: drawingData.seed,
        bias: drawingData.contrastBias
    });

    if (samplePoints.length < 3) {
        return svg;
    }

    const triangles = delaunayTriangulate(samplePoints, width, height);
    if (!triangles.length) {
        return svg;
    }

    const paletteEntries = Object.values(drawingConfig.colorPalette || colorPalettes.sakuraPalette)
        .map(entry => ({ ...entry, rgb: hexToRgb(entry.hex) }))
        .filter(entry => entry.rgb);
    if (!paletteEntries.length) {
        return svg;
    }

    const lineOptions = drawingConfig.line || {};
    const hatchSpacing = Math.max(0.1, Number(lineOptions.spacing ?? 2.5));
    const hatchStyle = lineOptions.hatchStyle || 'scanline';
    const hatchInset = typeof lineOptions.hatchInset === 'number'
        ? lineOptions.hatchInset
        : hatchSpacing / 2;
    const includeBoundary = lineOptions.includeBoundary !== false;

    triangles.forEach(triangle => {
        const sample = sampleTriangleColor(triangle, sampler, width, height);
        const paletteColor = choosePaletteColor(paletteEntries, sample, drawingData.colorNoise);
        const projectedPolygon = builder.projectPoints([...triangle, triangle[0]]);
        const geometry = computeBoundsFromPoints(projectedPolygon);
        let pathPoints;
        if (hatchStyle === 'none') {
            pathPoints = projectedPolygon;
        } else if (hatchStyle === 'serpentine') {
            pathPoints = generatePolygonSerpentineHatch(projectedPolygon, hatchSpacing, {
                inset: hatchInset,
                includeBoundary
            });
        } else {
            pathPoints = generatePolygonScanlineHatch(projectedPolygon, hatchSpacing, {
                inset: hatchInset,
                includeBoundary
            });
        }
        if (!pathPoints || pathPoints.length < 2) {
            return;
        }
        builder.appendPath(pathPoints, {
            strokeColor: paletteColor.hex,
            geometry,
            strokeWidth: lineOptions.strokeWidth ?? 0.35,
            strokeLinejoin: 'round'
        });
    });
    const table = sampler.buildWeightTable?.(drawingData.contrastBias);
    logPhotoSampling({
        avgBrightness: table?.avgBrightness,
        darkShare: table?.darkShare,
        triangleCount: triangles.length
    });

    return svg;
}

function generateSamplePoints({ width, height, sampler, count, seed, bias }) {
    const basePoints = [
        { x: 0, y: 0 },
        { x: width, y: 0 },
        { x: width, y: height },
        { x: 0, y: height }
    ];
    const rng = randomGenerator(seed || 1);
    const table = sampler.buildWeightTable?.(bias);
    if (!table || !table.cumulative || table.totalWeight <= 0) {
        return generateSamplePointsFallback({ width, height, sampler, count, rng, bias, basePoints });
    }
    const points = [...basePoints];
    while (points.length < count) {
        const target = rng() * table.totalWeight;
        const pixelIndex = binarySearch(table.cumulative, target);
        const px = pixelIndex % table.width;
        const py = Math.floor(pixelIndex / table.width);
        const jitterX = (rng() - 0.5) * 0.9;
        const jitterY = (rng() - 0.5) * 0.9;
        const normX = Math.min(Math.max((px + 0.5 + jitterX) / table.width, 0), 1);
        const normY = Math.min(Math.max((py + 0.5 + jitterY) / table.height, 0), 1);
        points.push({
            x: normX * width,
            y: normY * height
        });
    }
    return points;
}

function generateSamplePointsFallback({ width, height, sampler, count, rng, bias, basePoints }) {
    const points = [...basePoints];
    const maxAttempts = count * 12;
    let attempts = 0;
    while (points.length < count && attempts < maxAttempts) {
        attempts++;
        const x = rng() * width;
        const y = rng() * height;
        const sample = sampler.sample(x / width, y / height);
        const importance = Math.min(1, bias + (1 - sample.brightness));
        if (rng() <= importance) {
            points.push({ x, y });
        }
    }
    return points;
}

function delaunayTriangulate(points, width, height) {
    if (points.length < 3) {
        return [];
    }
    const margin = Math.max(width, height) * 10;
    const superTriangle = [
        { x: -margin, y: margin },
        { x: width / 2, y: -margin },
        { x: width + margin, y: height + margin }
    ];
    let triangles = [
        createTriangle(superTriangle[0], superTriangle[1], superTriangle[2])
    ];

    points.forEach(point => {
        const badTriangles = triangles.filter(triangle => pointInCircumcircle(point, triangle));
        const boundary = extractBoundaryEdges(badTriangles);
        triangles = triangles.filter(triangle => !badTriangles.includes(triangle));
        boundary.forEach(edge => {
            triangles.push(createTriangle(edge[0], edge[1], point));
        });
    });

    const result = triangles.filter(triangle => (
        superTriangle.every(vertex => !triangle.points.includes(vertex))
    ));
    return result.map(tri => tri.points);
}

function createTriangle(a, b, c) {
    const circle = circumcircle(a, b, c);
    return { points: [a, b, c], circle };
}

function pointInCircumcircle(point, triangle) {
    const { circle } = triangle;
    if (!circle) {
        return false;
    }
    const dx = point.x - circle.x;
    const dy = point.y - circle.y;
    return dx * dx + dy * dy <= circle.r2;
}

function circumcircle(a, b, c) {
    const ax = a.x;
    const ay = a.y;
    const bx = b.x;
    const by = b.y;
    const cx = c.x;
    const cy = c.y;

    const d = 2 * (ax * (by - cy) + bx * (cy - ay) + cx * (ay - by));
    if (Math.abs(d) < 1e-9) {
        return { x: 0, y: 0, r2: Infinity };
    }
    const ux = ((ax * ax + ay * ay) * (by - cy) + (bx * bx + by * by) * (cy - ay) + (cx * cx + cy * cy) * (ay - by)) / d;
    const uy = ((ax * ax + ay * ay) * (cx - bx) + (bx * bx + by * by) * (ax - cx) + (cx * cx + cy * cy) * (bx - ax)) / d;
    const dx = ux - ax;
    const dy = uy - ay;
    return { x: ux, y: uy, r2: dx * dx + dy * dy };
}

function extractBoundaryEdges(triangles = []) {
    const edges = new Map();
    triangles.forEach(triangle => {
        const { points } = triangle;
        for (let i = 0; i < 3; i++) {
            const start = points[i];
            const end = points[(i + 1) % 3];
            const key = edgeKey(start, end);
            if (edges.has(key)) {
                edges.delete(key);
            } else {
                edges.set(key, [start, end]);
            }
        }
    });
    return Array.from(edges.values());
}

function edgeKey(a, b) {
    return a.x <= b.x
        ? `${a.x},${a.y}-${b.x},${b.y}`
        : `${b.x},${b.y}-${a.x},${a.y}`;
}

function sampleTriangleColor(triangle, sampler, width, height) {
    const centroid = {
        x: (triangle[0].x + triangle[1].x + triangle[2].x) / 3,
        y: (triangle[0].y + triangle[1].y + triangle[2].y) / 3
    };
    const samples = [
        centroid,
        triangle[0],
        triangle[1],
        triangle[2]
    ].map(point => sampler.sample(point.x / width, point.y / height));
    const aggregate = samples.reduce((acc, sample) => {
        acc.r += sample.r;
        acc.g += sample.g;
        acc.b += sample.b;
        acc.brightness += sample.brightness;
        return acc;
    }, { r: 0, g: 0, b: 0, brightness: 0 });
    const count = samples.length || 1;
    return {
        r: aggregate.r / count,
        g: aggregate.g / count,
        b: aggregate.b / count,
        brightness: aggregate.brightness / count
    };
}

function computeBoundsFromPoints(points) {
    const xs = points.map(point => point.x);
    const ys = points.map(point => point.y);
    const minX = Math.min(...xs);
    const maxX = Math.max(...xs);
    const minY = Math.min(...ys);
    const maxY = Math.max(...ys);
    return {
        x: minX,
        y: minY,
        width: Math.max(maxX - minX, 1),
        height: Math.max(maxY - minY, 1)
    };
}

function choosePaletteColor(paletteEntries, sample, noise) {
    if (!sample) {
        return paletteEntries[0];
    }
    let best = paletteEntries[0];
    let bestDistance = Infinity;
    paletteEntries.forEach(entry => {
        const dr = entry.rgb.r - sample.r;
        const dg = entry.rgb.g - sample.g;
        const db = entry.rgb.b - sample.b;
        const distance = dr * dr + dg * dg + db * db;
        if (distance < bestDistance) {
            bestDistance = distance;
            best = entry;
        }
    });
    if (noise > 0 && paletteEntries.length > 1) {
        const perturbed = Math.floor(Math.random() * paletteEntries.length * noise);
        return paletteEntries[(paletteEntries.indexOf(best) + perturbed) % paletteEntries.length];
    }
    return best;
}

function hexToRgb(hex) {
    if (!hex || typeof hex !== 'string') {
        return null;
    }
    const normalized = hex.replace('#', '');
    if (normalized.length !== 6) {
        return null;
    }
    const value = Number.parseInt(normalized, 16);
    return {
        r: (value >> 16) & 255,
        g: (value >> 8) & 255,
        b: value & 255
    };
}

function randomGenerator(seed) {
    let state = seed % 2147483647;
    return () => {
        state = (state * 16807) % 2147483647;
        return (state - 1) / 2147483646;
    };
}

async function loadImageSampler(dataUrl, resolution) {
    if (!dataUrl) {
        return null;
    }
    const img = new Image();
    img.src = dataUrl;
    await waitForImage(img);
    const canvas = document.createElement('canvas');
    const aspect = img.width / img.height || 1;
    if (img.width >= img.height) {
        canvas.width = resolution;
        canvas.height = Math.max(1, Math.round(resolution / aspect));
    } else {
        canvas.height = resolution;
        canvas.width = Math.max(1, Math.round(resolution * aspect));
    }
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) {
        return null;
    }
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const sampler = {
        width: canvas.width,
        height: canvas.height,
        data: imageData.data,
        buildWeightTable(bias = 0) {
            if (this._weightCache && this._weightCache.bias === bias) {
                return this._weightCache;
            }
            const pixelCount = this.width * this.height;
            if (!pixelCount) {
                return null;
            }
            const cumulative = new Float64Array(pixelCount);
            let totalWeight = 0;
            let brightnessSum = 0;
            let darkWeight = 0;
            for (let i = 0; i < pixelCount; i++) {
                const idx = i * 4;
                const r = this.data[idx];
                const g = this.data[idx + 1];
                const b = this.data[idx + 2];
                const brightness = (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
                const weight = Math.max(0.0001, bias + (1 - brightness));
                totalWeight += weight;
                cumulative[i] = totalWeight;
                brightnessSum += brightness;
                if (brightness < 0.4) {
                    darkWeight += weight;
                }
            }
            this._weightCache = {
                cumulative,
                width: this.width,
                height: this.height,
                totalWeight,
                avgBrightness: brightnessSum / pixelCount,
                darkShare: totalWeight > 0 ? darkWeight / totalWeight : 0,
                bias
            };
            return this._weightCache;
        },
        sample(u, v) {
            if (!Number.isFinite(u) || !Number.isFinite(v)) {
                return { r: 0, g: 0, b: 0, brightness: 1 };
            }
            const x = Math.min(imageData.width - 1, Math.max(0, Math.round(u * (imageData.width - 1))));
            const y = Math.min(imageData.height - 1, Math.max(0, Math.round(v * (imageData.height - 1))));
            const idx = (y * imageData.width + x) * 4;
            const r = imageData.data[idx];
            const g = imageData.data[idx + 1];
            const b = imageData.data[idx + 2];
            const brightness = (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
            return { r, g, b, brightness };
        }
    };
    return sampler;
}

function waitForImage(image) {
    if (image.decode) {
        return image.decode().catch(() => waitForImageFallback(image));
    }
    return waitForImageFallback(image);
}

function waitForImageFallback(image) {
    return new Promise((resolve, reject) => {
        image.onload = () => resolve();
        image.onerror = (event) => reject(event?.error || new Error('Failed to load image'));
    });
}

const photoTriangleControls = [
    {
        id: 'imageDataUrl',
        label: 'Photo Source',
        target: 'drawingData.imageDataUrl',
        inputType: 'file',
        valueType: 'string',
        accept: 'image/*',
        emptyLabel: 'No file selected',
        loadedLabel: 'Image loaded',
        description: 'Upload a reference image to convert into triangles'
    },
    {
        id: 'triangleCount',
        label: 'Triangle Count',
        target: 'drawingData.triangleCount',
        inputType: 'range',
        min: TRI_LIMITS.triangleCount.min,
        max: TRI_LIMITS.triangleCount.max,
        step: 50,
        default: TRI_LIMITS.triangleCount.default,
        description: 'Number of sample points used for triangulation'
    },
    {
        id: 'sampleResolution',
        label: 'Sample Resolution',
        target: 'drawingData.sampleResolution',
        inputType: 'range',
        min: TRI_LIMITS.sampleResolution.min,
        max: TRI_LIMITS.sampleResolution.max,
        step: 16,
        default: TRI_LIMITS.sampleResolution.default,
        description: 'Resolution used when sampling the reference image'
    },
    {
        id: 'contrastBias',
        label: 'Contrast Bias',
        target: 'drawingData.contrastBias',
        inputType: 'range',
        min: TRI_LIMITS.contrast.min,
        max: TRI_LIMITS.contrast.max,
        step: 0.05,
        default: TRI_LIMITS.contrast.default,
        description: 'Higher values emphasize darker portions of the source image'
    },
    {
        id: 'colorNoise',
        label: 'Color Shuffle',
        target: 'drawingData.colorNoise',
        inputType: 'range',
        min: TRI_LIMITS.colorNoise.min,
        max: TRI_LIMITS.colorNoise.max,
        step: 0.01,
        default: TRI_LIMITS.colorNoise.default,
        description: 'Introduce subtle palette variation between adjacent triangles'
    },
    {
        id: 'seed',
        label: 'Random Seed',
        target: 'drawingData.seed',
        inputType: 'number',
        min: TRI_LIMITS.seed.min,
        max: TRI_LIMITS.seed.max,
        step: 1,
        default: TRI_LIMITS.seed.default,
        description: 'Seed controlling point distribution'
    }
];

const photoTriangleDefinition = attachControls(defineDrawing({
    id: 'photoTriangles',
    name: 'Photo Triangles',
    configClass: PhotoTriangleConfig,
    drawFunction: drawPhotoTriangleMosaic,
    presets: [
        {
            key: 'photoTrianglesBlank',
            name: 'Photo Mosaic',
            params: {
                type: 'photoTriangles',
                width: 260,
                height: 200,
                triangleCount: TRI_LIMITS.triangleCount.default,
                sampleResolution: TRI_LIMITS.sampleResolution.default,
                contrastBias: TRI_LIMITS.contrast.default,
                colorNoise: TRI_LIMITS.colorNoise.default,
                seed: TRI_LIMITS.seed.default,
                line: {
                    strokeWidth: 0.35
                },
                colorPalette: colorPalettes.sakuraPalette
            }
        }
    ]
}), photoTriangleControls);

export const photoTriangleDrawing = photoTriangleDefinition;
export default photoTriangleDefinition;

export const __TEST_ONLY__ = {
    setImageSamplerFactory(factory) {
        imageSamplerFactory = typeof factory === 'function' ? factory : loadImageSampler;
    },
    resetImageSamplerFactory() {
        imageSamplerFactory = loadImageSampler;
    }
};
function binarySearch(array, target) {
    let low = 0;
    let high = array.length - 1;
    while (low < high) {
        const mid = Math.floor((low + high) / 2);
        if (array[mid] < target) {
            low = mid + 1;
        } else {
            high = mid;
        }
    }
    return low;
}

function logPhotoSampling(details) {
    if (!details) {
        return;
    }
    const message = [
        'Photo Triangles:',
        `avg brightness ${(details.avgBrightness ?? 0).toFixed(2)}`,
        `dark weight ${((details.darkShare ?? 0) * 100).toFixed(1)}%`,
        `triangles ${details.triangleCount ?? 0}`
    ].join(' ');
    if (typeof window !== 'undefined' && typeof window.logDebug === 'function') {
        window.logDebug(message);
    } else {
        console.log(message);
    }
}
