import { ColorManager, colorPalettes, maxMediumColorCount } from '../../client/js/utils/colorUtils.js';

function deriveGeometryFromPoints(points) {
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

export function createSVG(renderContext) {
    return {
        isData: true,
        paperWidth: renderContext.paperWidth,
        paperHeight: renderContext.paperHeight,
        margin: renderContext.margin ?? 0,
        orientation: renderContext.orientation,
        layers: []
    };
}

export function createDrawingBuilder({ svg, drawingConfig, abortSignal }) {
    const palette = drawingConfig.colorPalette || colorPalettes.defaultPalette || {};
    const colorManager = new ColorManager(palette);
    const layersByColor = new Map();

    function ensureLayer(colorHex) {
        if (!layersByColor.has(colorHex)) {
            const colorEntry = palette[colorHex] || {};
            const index = layersByColor.size;
            layersByColor.set(colorHex, {
                color: colorHex,
                name: colorEntry.name || colorHex,
                order: index,
                paths: []
            });
            svg.layers = Array.from(layersByColor.values());
        }
        return layersByColor.get(colorHex);
    }

    function selectColor(options, fallbackGeometry) {
        if (options.strokeColor && palette[options.strokeColor]) {
            return options.strokeColor;
        }
        return colorManager.getValidColor(fallbackGeometry);
    }

    return {
        appendPath(points, options = {}) {
            if (abortSignal?.aborted) {
                throw new Error('Render aborted');
            }
            if (!Array.isArray(points) || points.length === 0) {
                return null;
            }
            const geometry = deriveGeometryFromPoints(points);
            const colorHex = selectColor(options, geometry);
            const layer = ensureLayer(colorHex);
            const path = {
                points,
                strokeWidth: options.strokeWidth ?? drawingConfig.line?.strokeWidth,
                strokeLinecap: options.strokeLinecap ?? drawingConfig.line?.lineCap ?? 'round',
                strokeLinejoin: options.strokeLinejoin ?? drawingConfig.line?.lineJoin ?? 'round',
                stroke: options.strokeColor || colorHex
            };
            layer.paths.push(path);
            colorManager.updateTracking(colorHex, geometry);
            return path;
        },
        projectPoints(points) {
            return points.map(point => ({ x: Number(point.x) || 0, y: Number(point.y) || 0 }));
        },
        projectRect(rect) {
            return {
                x: Number(rect?.x ?? 0),
                y: Number(rect?.y ?? 0),
                width: Number(rect?.width ?? 0),
                height: Number(rect?.height ?? 0)
            };
        },
        context: {
            layersByColor
        }
    };
}

export { colorPalettes, maxMediumColorCount };
