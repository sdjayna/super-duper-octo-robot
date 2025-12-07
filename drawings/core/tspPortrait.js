import {
    defineDrawing,
    SizedDrawingConfig,
    createDrawingRuntime,
    colorPalettes
} from '../shared/kit.js';
import { attachControls } from '../shared/controlsUtils.js';
import { clampInteger, clampNumber } from '../shared/utils/paramMath.js';
import { createSeededRandom } from '../shared/utils/noiseUtils.js';

const TSP_LIMITS = {
    pointCount: { min: 800, max: 200000, default: 35000 },
    sampleResolution: { min: 256, max: 3072, default: 1400 },
    shadeWeight: { min: 0, max: 1, default: 0.7 },
    edgeWeight: { min: 0, max: 1, default: 0.3 },
    smoothingPasses: { min: 0, max: 3, default: 1 },
    smoothingWindow: { min: 0, max: 8, default: 2 },
    twoOptPasses: { min: 0, max: 3, default: 1 },
    headTightness: { min: 0, max: 1, default: 0.35 },
    maskThreshold: { min: 0, max: 1, default: 0.25 },
    maskFeather: { min: 0, max: 8, default: 2 },
    seed: { min: 1, max: 9999, default: 2024 }
};

class TspPortraitConfig extends SizedDrawingConfig {
    constructor(params = {}) {
        super({
            ...params,
            width: params.width ?? 260,
            height: params.height ?? 200
        });
        this.pointCount = clampInteger(params.pointCount, TSP_LIMITS.pointCount.min, TSP_LIMITS.pointCount.max, TSP_LIMITS.pointCount.default);
        this.sampleResolution = clampInteger(params.sampleResolution, TSP_LIMITS.sampleResolution.min, TSP_LIMITS.sampleResolution.max, TSP_LIMITS.sampleResolution.default);
        this.shadeWeight = clampNumber(params.shadeWeight, TSP_LIMITS.shadeWeight.min, TSP_LIMITS.shadeWeight.max, TSP_LIMITS.shadeWeight.default);
        this.edgeWeight = clampNumber(params.edgeWeight, TSP_LIMITS.edgeWeight.min, TSP_LIMITS.edgeWeight.max, TSP_LIMITS.edgeWeight.default);
        this.smoothingPasses = clampInteger(params.smoothingPasses, TSP_LIMITS.smoothingPasses.min, TSP_LIMITS.smoothingPasses.max, TSP_LIMITS.smoothingPasses.default);
        this.smoothingWindow = clampInteger(params.smoothingWindow, TSP_LIMITS.smoothingWindow.min, TSP_LIMITS.smoothingWindow.max, TSP_LIMITS.smoothingWindow.default);
        this.twoOptPasses = clampInteger(params.twoOptPasses, TSP_LIMITS.twoOptPasses.min, TSP_LIMITS.twoOptPasses.max, TSP_LIMITS.twoOptPasses.default);
        this.headTightness = clampNumber(params.headTightness, TSP_LIMITS.headTightness.min, TSP_LIMITS.headTightness.max, TSP_LIMITS.headTightness.default);
        this.maskThreshold = clampNumber(params.maskThreshold, TSP_LIMITS.maskThreshold.min, TSP_LIMITS.maskThreshold.max, TSP_LIMITS.maskThreshold.default);
        this.maskFeather = clampInteger(params.maskFeather, TSP_LIMITS.maskFeather.min, TSP_LIMITS.maskFeather.max, TSP_LIMITS.maskFeather.default);
        this.seed = clampInteger(params.seed, TSP_LIMITS.seed.min, TSP_LIMITS.seed.max, TSP_LIMITS.seed.default);
        this.matchPhotoAspectRatio = params.matchPhotoAspectRatio !== false;
        this.imageDataUrl = typeof params.imageDataUrl === 'string' ? params.imageDataUrl : '';
        this.imageAspectRatio = null;
        this.imageNaturalWidth = null;
        this.imageNaturalHeight = null;
        this.imageMetadataSource = null;
        if (Number.isFinite(params.imageAspectRatio) && params.imageAspectRatio > 0) {
            this.setImageMetadata({
                aspectRatio: params.imageAspectRatio,
                width: params.imageNaturalWidth,
                height: params.imageNaturalHeight,
                source: params.imageMetadataSource || this.imageDataUrl || null
            });
        }
    }

    setImageMetadata(metadata) {
        if (!metadata) {
            this.imageAspectRatio = null;
            this.imageNaturalWidth = null;
            this.imageNaturalHeight = null;
            this.imageMetadataSource = null;
            return;
        }
        const aspect = Number(metadata.aspectRatio);
        if (!Number.isFinite(aspect) || aspect <= 0) {
            return;
        }
        this.imageAspectRatio = aspect;
        this.imageNaturalWidth = Number(metadata.width) || null;
        this.imageNaturalHeight = Number(metadata.height) || null;
        this.imageMetadataSource = metadata.source || this.imageDataUrl || null;
    }

    getBounds(context = {}) {
        if (this.matchPhotoAspectRatio && Number.isFinite(this.imageAspectRatio) && this.imageAspectRatio > 0) {
            const base = Math.max(Math.min(this.width, this.height), 1);
            if (this.imageAspectRatio >= 1) {
                return {
                    minX: 0,
                    minY: 0,
                    width: base * this.imageAspectRatio,
                    height: base
                };
            }
            return {
                minX: 0,
                minY: 0,
                width: base,
                height: base / this.imageAspectRatio
            };
        }
        return super.getBounds(context);
    }
}

function loadImageData(dataUrl) {
    return new Promise((resolve, reject) => {
        const image = new Image();
        image.crossOrigin = 'anonymous';
        image.onload = () => resolve(image);
        image.onerror = (event) => reject(event?.error || new Error('Failed to load image'));
        image.src = dataUrl;
    });
}

function rasterizeImage(image, targetResolution) {
    const aspect = image.naturalWidth / image.naturalHeight;
    const height = aspect >= 1 ? Math.max(8, Math.round(targetResolution / aspect)) : targetResolution;
    const width = aspect >= 1 ? targetResolution : Math.max(8, Math.round(targetResolution * aspect));
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(image, 0, 0, width, height);
    const { data } = ctx.getImageData(0, 0, width, height);
    const gray = new Float32Array(width * height);
    for (let i = 0; i < width * height; i++) {
        const idx = i * 4;
        const r = data[idx];
        const g = data[idx + 1];
        const b = data[idx + 2];
        gray[i] = (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
    }
    return { width, height, gray, aspect };
}

function computeEdgeMap(gray, width, height) {
    const edges = new Float32Array(width * height);
    let maxMag = 0;
    const sobelX = [-1, 0, 1, -2, 0, 2, -1, 0, 1];
    const sobelY = [-1, -2, -1, 0, 0, 0, 1, 2, 1];
    for (let y = 1; y < height - 1; y++) {
        for (let x = 1; x < width - 1; x++) {
            let gx = 0;
            let gy = 0;
            let idx = 0;
            for (let ky = -1; ky <= 1; ky++) {
                for (let kx = -1; kx <= 1; kx++) {
                    const sample = gray[(y + ky) * width + (x + kx)];
                    gx += sample * sobelX[idx];
                    gy += sample * sobelY[idx];
                    idx++;
                }
            }
            const mag = Math.hypot(gx, gy);
            edges[y * width + x] = mag;
            if (mag > maxMag) {
                maxMag = mag;
            }
        }
    }
    if (maxMag > 0) {
        for (let i = 0; i < edges.length; i++) {
            edges[i] = Math.min(edges[i] / maxMag, 1);
        }
    }
    return edges;
}

function floodFillMask(values, width, height, seed, threshold) {
    const mask = new Float32Array(width * height);
    const visited = new Uint8Array(width * height);
    const clampSeedX = Math.min(Math.max(Math.round(seed.x), 0), width - 1);
    const clampSeedY = Math.min(Math.max(Math.round(seed.y), 0), height - 1);
    const seedIdx = clampSeedY * width + clampSeedX;
    if (values[seedIdx] < threshold) {
        return mask;
    }
    const stack = [seedIdx];
    while (stack.length) {
        const idx = stack.pop();
        if (visited[idx]) continue;
        visited[idx] = 1;
        if (values[idx] < threshold) continue;
        mask[idx] = 1;
        const x = idx % width;
        const y = (idx - x) / width;
        if (x > 0) stack.push(idx - 1);
        if (x < width - 1) stack.push(idx + 1);
        if (y > 0) stack.push(idx - width);
        if (y < height - 1) stack.push(idx + width);
    }
    return mask;
}

function blurMask(mask, width, height, passes) {
    if (passes <= 0) return;
    const tmp = new Float32Array(mask.length);
    for (let pass = 0; pass < passes; pass++) {
        for (let y = 0; y < height; y++) {
            for (let x = 0; x < width; x++) {
                let sum = 0;
                let count = 0;
                for (let ky = -1; ky <= 1; ky++) {
                    const ny = y + ky;
                    if (ny < 0 || ny >= height) continue;
                    for (let kx = -1; kx <= 1; kx++) {
                        const nx = x + kx;
                        if (nx < 0 || nx >= width) continue;
                        sum += mask[ny * width + nx];
                        count++;
                    }
                }
                tmp[y * width + x] = sum / count;
            }
        }
        mask.set(tmp);
    }
}

function buildHeadMask(gray, width, height, tightness, threshold, feather) {
    let totalWeight = 0;
    let cx = 0;
    let cy = 0;
    const shade = new Float32Array(width * height);
    for (let i = 0; i < shade.length; i++) {
        shade[i] = 1 - gray[i];
    }
    const cutoff = Math.max(0, Math.min(1, threshold || 0));
    for (let i = 0; i < shade.length; i++) {
        if (shade[i] < cutoff) {
            continue;
        }
        const weight = shade[i];
        totalWeight += weight;
        const y = Math.floor(i / width);
        const x = i - y * width;
        cx += x * weight;
        cy += y * weight;
    }
    if (totalWeight > 0) {
        cx /= totalWeight;
        cy /= totalWeight;
    } else {
        cx = width / 2;
        cy = height / 2;
    }
    let distAccum = 0;
    for (let i = 0; i < shade.length; i++) {
        const y = Math.floor(i / width);
        const x = i - y * width;
        const dx = x - cx;
        const dy = y - cy;
        distAccum += (dx * dx + dy * dy) * shade[i];
    }
    const spread = totalWeight > 0 ? Math.sqrt(distAccum / totalWeight) : Math.min(width, height) * 0.3;
    const radiusScale = 1.15 - tightness * 0.4;
    const rx = Math.max(width * 0.22, spread * radiusScale);
    const ry = Math.max(height * 0.22, spread * radiusScale * 0.95);
    const mask = new Float32Array(width * height);
    for (let i = 0; i < mask.length; i++) {
        const y = Math.floor(i / width);
        const x = i - y * width;
        const nx = (x - cx) / rx;
        const ny = (y - cy) / ry;
        const d2 = nx * nx + ny * ny;
        mask[i] = d2 <= 1 ? 1 : Math.exp(-Math.max(0, d2 - 1) * 1.5);
    }
    if (cutoff > 0) {
        const region = floodFillMask(shade, width, height, { x: Math.round(cx), y: Math.round(cy) }, cutoff);
        for (let i = 0; i < mask.length; i++) {
            mask[i] *= region[i];
        }
    }
    if (feather > 0) {
        blurMask(mask, width, height, feather);
    }
    return { mask, center: { x: cx, y: cy }, radii: { x: rx, y: ry } };
}

function buildDensityMap(gray, edges, mask, shadeWeight, edgeWeight) {
    const density = new Float32Array(gray.length);
    const weightSum = Math.max(shadeWeight + edgeWeight, 0.0001);
    let max = 0;
    for (let i = 0; i < gray.length; i++) {
        const shade = 1 - gray[i];
        const value = ((shade * shadeWeight) + (edges[i] * edgeWeight)) / weightSum;
        const masked = value * mask[i];
        density[i] = masked;
        if (masked > max) {
            max = masked;
        }
    }
    if (max > 0) {
        for (let i = 0; i < density.length; i++) {
            density[i] = Math.min(density[i] / max, 1);
        }
    }
    return density;
}

function bilinearSample(map, width, height, u, v) {
    const x = Math.max(0, Math.min(width - 1, u * (width - 1)));
    const y = Math.max(0, Math.min(height - 1, v * (height - 1)));
    const x0 = Math.floor(x);
    const y0 = Math.floor(y);
    const x1 = Math.min(width - 1, x0 + 1);
    const y1 = Math.min(height - 1, y0 + 1);
    const dx = x - x0;
    const dy = y - y0;
    const i00 = y0 * width + x0;
    const i10 = y0 * width + x1;
    const i01 = y1 * width + x0;
    const i11 = y1 * width + x1;
    const top = map[i00] * (1 - dx) + map[i10] * dx;
    const bottom = map[i01] * (1 - dx) + map[i11] * dx;
    return top * (1 - dy) + bottom * dy;
}

function samplePoints({ density, width, height, count, rng }) {
    const points = [];
    const attemptsLimit = count * 30;
    let attempts = 0;
    while (points.length < count && attempts < attemptsLimit) {
        const u = rng();
        const v = rng();
        const p = bilinearSample(density, width, height, u, v);
        if (p > 0 && rng() < p) {
            points.push({ u, v });
        }
        attempts++;
    }
    return points;
}

function dist2(a, b) {
    const dx = a.x - b.x;
    const dy = a.y - b.y;
    return dx * dx + dy * dy;
}

function buildBounds(points) {
    let minX = Infinity;
    let maxX = -Infinity;
    let minY = Infinity;
    let maxY = -Infinity;
    for (const p of points) {
        if (p.x < minX) minX = p.x;
        if (p.x > maxX) maxX = p.x;
        if (p.y < minY) minY = p.y;
        if (p.y > maxY) maxY = p.y;
    }
    return { minX, maxX, minY, maxY };
}

function buildApproxNearestNeighborRoute(points) {
    const n = points.length;
    const route = new Array(n).fill(-1);
    const visited = new Uint8Array(n);
    const bounds = buildBounds(points);
    const span = Math.max(bounds.maxX - bounds.minX, bounds.maxY - bounds.minY);
    const targetCells = Math.max(16, Math.floor(Math.sqrt(n / 8)));
    const cellSize = Math.max(span / targetCells, 1e-6);
    const cellMap = new Map();
    const keyFor = (x, y) => `${Math.floor((x - bounds.minX) / cellSize)},${Math.floor((y - bounds.minY) / cellSize)}`;
    points.forEach((p, idx) => {
        const key = keyFor(p.x, p.y);
        const bucket = cellMap.get(key);
        if (bucket) {
            bucket.push(idx);
        } else {
            cellMap.set(key, [idx]);
        }
    });
    const removeFromBucket = (key, idx) => {
        const bucket = cellMap.get(key);
        if (!bucket) return;
        const pos = bucket.indexOf(idx);
        if (pos >= 0) {
            bucket.splice(pos, 1);
        }
    };

    let current = 0;
    route[0] = current;
    visited[current] = 1;
    removeFromBucket(keyFor(points[current].x, points[current].y), current);

    const gridRadiusLimit = Math.max(4, Math.ceil(targetCells * 0.75));
    for (let i = 1; i < n; i++) {
        const currPoint = points[current];
        const baseKey = keyFor(currPoint.x, currPoint.y);
        const [cx, cy] = baseKey.split(',').map(Number);
        let best = -1;
        let bestDist = Infinity;

        for (let radius = 0; radius <= gridRadiusLimit; radius++) {
            let foundThisRadius = false;
            for (let gx = cx - radius; gx <= cx + radius; gx++) {
                for (let gy = cy - radius; gy <= cy + radius; gy++) {
                    if (Math.max(Math.abs(gx - cx), Math.abs(gy - cy)) !== radius) continue;
                    const bucket = cellMap.get(`${gx},${gy}`);
                    if (!bucket || bucket.length === 0) continue;
                    for (const candidate of bucket) {
                        if (visited[candidate]) continue;
                        const d = dist2(currPoint, points[candidate]);
                        if (d < bestDist) {
                            bestDist = d;
                            best = candidate;
                            foundThisRadius = true;
                        }
                    }
                }
            }
            if (foundThisRadius) {
                break;
            }
        }
        if (best === -1) {
            // fallback: find any remaining unvisited
            for (let j = 0; j < n; j++) {
                if (!visited[j]) {
                    best = j;
                    break;
                }
            }
        }
        route[i] = best;
        visited[best] = 1;
        removeFromBucket(keyFor(points[best].x, points[best].y), best);
        current = best;
    }
    return route;
}

function twoOpt(route, points, passes, rng) {
    const n = route.length;
    if (n < 4 || passes <= 0) return route;
    for (let pass = 0; pass < passes; pass++) {
        const maxSwaps = Math.min(2000, n * 3);
        let swaps = 0;
        for (let attempt = 0; attempt < maxSwaps; attempt++) {
            const i = 1 + Math.floor(rng() * (n - 3));
            const k = i + 1 + Math.floor(rng() * (n - i - 2));
            const a = points[route[i - 1]];
            const b = points[route[i]];
            const c = points[route[k]];
            const d = points[route[(k + 1) % n]];
            const current = dist2(a, b) + dist2(c, d);
            const alt = dist2(a, c) + dist2(b, d);
            if (alt + 1e-8 < current) {
                const slice = route.slice(i, k + 1).reverse();
                route.splice(i, slice.length, ...slice);
                swaps++;
            }
            if (swaps >= maxSwaps) {
                break;
            }
        }
    }
    return route;
}

function smoothPath(points, passes, windowSize) {
    if (passes <= 0 || windowSize <= 0) {
        return points;
    }
    let smoothed = points;
    for (let pass = 0; pass < passes; pass++) {
        const next = [];
        for (let i = 0; i < smoothed.length; i++) {
            let sumX = 0;
            let sumY = 0;
            let count = 0;
            for (let offset = -windowSize; offset <= windowSize; offset++) {
                const idx = i + offset;
                if (idx < 0 || idx >= smoothed.length) continue;
                sumX += smoothed[idx].x;
                sumY += smoothed[idx].y;
                count++;
            }
            next.push({
                x: sumX / count,
                y: sumY / count
            });
        }
        smoothed = next;
    }
    return smoothed;
}

export async function drawTspPortrait(drawingConfig, renderContext) {
    const { svg, builder } = createDrawingRuntime({ drawingConfig, renderContext });
    const config = drawingConfig.drawingData;
    if (!config.imageDataUrl) {
        throw new Error('Upload a reference portrait to generate TSP art.');
    }
    const image = await loadImageData(config.imageDataUrl);
    const raster = rasterizeImage(image, config.sampleResolution);
    config.setImageMetadata({
        aspectRatio: raster.aspect,
        width: raster.width,
        height: raster.height,
        source: config.imageDataUrl
    });

    const edges = computeEdgeMap(raster.gray, raster.width, raster.height);
    const { mask } = buildHeadMask(
        raster.gray,
        raster.width,
        raster.height,
        config.headTightness,
        config.maskThreshold,
        config.maskFeather
    );
    const density = buildDensityMap(raster.gray, edges, mask, config.shadeWeight, config.edgeWeight);

    const rng = createSeededRandom(config.seed);
    const sampled = samplePoints({
        density,
        width: raster.width,
        height: raster.height,
        count: config.pointCount,
        rng
    });
    if (!sampled.length) {
        throw new Error('No sample points found in the portrait. Try increasing density weights or using a darker image.');
    }
    const bounds = {
        width: renderContext.drawingWidth,
        height: renderContext.drawingHeight
    };
    const routePoints = sampled.map(({ u, v }) => ({
        x: u * bounds.width,
        y: v * bounds.height
    }));
    const route = buildApproxNearestNeighborRoute(routePoints);
    const refinedRoute = twoOpt(route, routePoints, config.twoOptPasses, rng);
    const ordered = refinedRoute.map((idx) => routePoints[idx]);
    const smoothed = smoothPath(ordered, config.smoothingPasses, config.smoothingWindow);
    const projected = builder.projectPoints(smoothed);
    builder.appendPath(projected, {
        geometry: 'tspPortrait',
        strokeWidth: drawingConfig.line?.strokeWidth ?? 0.3
    });
    return svg;
}

const tspPortraitControls = [
    {
        id: 'imageDataUrl',
        label: 'Photo Source',
        target: 'drawingData.imageDataUrl',
        inputType: 'file',
        valueType: 'string',
        accept: 'image/*',
        emptyLabel: 'No file selected',
        loadedLabel: 'Image loaded',
        description: 'Upload a portrait photo to convert into a single-line path'
    },
    {
        id: 'matchPhotoAspectRatio',
        label: 'Lock Photo Aspect',
        target: 'drawingData.matchPhotoAspectRatio',
        inputType: 'checkbox',
        valueType: 'boolean',
        default: true,
        description: 'Preserve the photo proportions; uncheck to stretch artwork to the paper'
    },
    {
        id: 'pointCount',
        label: 'Point Count',
        target: 'drawingData.pointCount',
        inputType: 'range',
        min: TSP_LIMITS.pointCount.min,
        max: TSP_LIMITS.pointCount.max,
        step: 200,
        default: TSP_LIMITS.pointCount.default,
        description: 'How many dots to sample before linking them into one route'
    },
    {
        id: 'sampleResolution',
        label: 'Sample Resolution',
        target: 'drawingData.sampleResolution',
        inputType: 'range',
        min: TSP_LIMITS.sampleResolution.min,
        max: TSP_LIMITS.sampleResolution.max,
        step: 32,
        default: TSP_LIMITS.sampleResolution.default,
        description: 'Resolution used when rasterizing the photo for sampling'
    },
    {
        id: 'shadeWeight',
        label: 'Shade Weight',
        target: 'drawingData.shadeWeight',
        inputType: 'range',
        min: TSP_LIMITS.shadeWeight.min,
        max: TSP_LIMITS.shadeWeight.max,
        step: 0.05,
        default: TSP_LIMITS.shadeWeight.default,
        description: 'Emphasize darker regions of the face'
    },
    {
        id: 'edgeWeight',
        label: 'Edge Weight',
        target: 'drawingData.edgeWeight',
        inputType: 'range',
        min: TSP_LIMITS.edgeWeight.min,
        max: TSP_LIMITS.edgeWeight.max,
        step: 0.05,
        default: TSP_LIMITS.edgeWeight.default,
        description: 'Emphasize detected edges like jawline and eyes'
    },
    {
        id: 'twoOptPasses',
        label: '2-Opt Passes',
        target: 'drawingData.twoOptPasses',
        inputType: 'range',
        min: TSP_LIMITS.twoOptPasses.min,
        max: TSP_LIMITS.twoOptPasses.max,
        step: 1,
        default: TSP_LIMITS.twoOptPasses.default,
        description: 'How many times to untangle the route crossings'
    },
    {
        id: 'smoothingPasses',
        label: 'Smoothing Passes',
        target: 'drawingData.smoothingPasses',
        inputType: 'range',
        min: TSP_LIMITS.smoothingPasses.min,
        max: TSP_LIMITS.smoothingPasses.max,
        step: 1,
        default: TSP_LIMITS.smoothingPasses.default,
        description: 'Apply light averaging to calm zigzags'
    },
    {
        id: 'smoothingWindow',
        label: 'Smoothing Window',
        target: 'drawingData.smoothingWindow',
        inputType: 'range',
        min: TSP_LIMITS.smoothingWindow.min,
        max: TSP_LIMITS.smoothingWindow.max,
        step: 1,
        default: TSP_LIMITS.smoothingWindow.default,
        description: 'Neighbour count used when smoothing the route'
    },
    {
        id: 'headTightness',
        label: 'Mask Tightness',
        target: 'drawingData.headTightness',
        inputType: 'range',
        min: TSP_LIMITS.headTightness.min,
        max: TSP_LIMITS.headTightness.max,
        step: 0.05,
        default: TSP_LIMITS.headTightness.default,
        description: 'Shrink the head mask to exclude more background'
    },
    {
        id: 'maskThreshold',
        label: 'Mask Threshold',
        target: 'drawingData.maskThreshold',
        inputType: 'range',
        min: TSP_LIMITS.maskThreshold.min,
        max: TSP_LIMITS.maskThreshold.max,
        step: 0.05,
        default: TSP_LIMITS.maskThreshold.default,
        description: 'Minimum shading needed to be considered part of the head region'
    },
    {
        id: 'maskFeather',
        label: 'Mask Feather',
        target: 'drawingData.maskFeather',
        inputType: 'range',
        min: TSP_LIMITS.maskFeather.min,
        max: TSP_LIMITS.maskFeather.max,
        step: 1,
        default: TSP_LIMITS.maskFeather.default,
        description: 'Blur the head mask edges to smooth sampling near the silhouette'
    },
    {
        id: 'seed',
        label: 'Random Seed',
        target: 'drawingData.seed',
        inputType: 'number',
        min: TSP_LIMITS.seed.min,
        max: TSP_LIMITS.seed.max,
        step: 1,
        default: TSP_LIMITS.seed.default,
        description: 'Seed controlling point distribution and 2-opt picks'
    }
];

const tspPortraitDefinition = attachControls(defineDrawing({
    id: 'tspPortrait',
    name: 'TSP Portrait',
    configClass: TspPortraitConfig,
    drawFunction: drawTspPortrait,
    features: { supportsHatching: false },
    presets: [
        {
            key: 'tspPortraitDefault',
            name: 'TSP Portrait',
            params: {
                type: 'tspPortrait',
                width: 260,
                height: 200,
                pointCount: TSP_LIMITS.pointCount.default,
                sampleResolution: TSP_LIMITS.sampleResolution.default,
                shadeWeight: TSP_LIMITS.shadeWeight.default,
                edgeWeight: TSP_LIMITS.edgeWeight.default,
                smoothingPasses: TSP_LIMITS.smoothingPasses.default,
                smoothingWindow: TSP_LIMITS.smoothingWindow.default,
                twoOptPasses: TSP_LIMITS.twoOptPasses.default,
                headTightness: TSP_LIMITS.headTightness.default,
                maskThreshold: TSP_LIMITS.maskThreshold.default,
                maskFeather: TSP_LIMITS.maskFeather.default,
                matchPhotoAspectRatio: true,
                seed: TSP_LIMITS.seed.default,
                line: {
                    strokeWidth: 0.3
                },
                colorPalette: colorPalettes.sakuraPalette
            }
        }
    ]
}), tspPortraitControls);

export const tspPortraitDrawing = tspPortraitDefinition;
export default tspPortraitDefinition;
