import { createSVG, createDrawingBuilder } from './clientAdapters.js';

/**
 * Creates the common SVG + builder runtime used by drawing modules.
 * @param {{ drawingConfig: any, renderContext: any, abortSignal?: AbortSignal | null }} params
 * @returns {{ svg: SVGElement, builder: Object }}
 */
export function createDrawingRuntime({ drawingConfig, renderContext, abortSignal = null }) {
    const svg = createSVG(renderContext);
    const builder = createDrawingBuilder({ svg, drawingConfig, renderContext, abortSignal: abortSignal || renderContext?.abortSignal });
    return { svg, builder };
}

/**
 * Helper to execute a drawing function with an initialized runtime.
 * @param {Object} params
 * @param {Object} params.drawingConfig
 * @param {Object} params.renderContext
 * @param {(runtime: { svg: SVGElement, builder: Object }) => void} draw
 * @returns {SVGElement}
 */
export function withDrawingRuntime({ drawingConfig, renderContext }, draw) {
    const runtime = createDrawingRuntime({ drawingConfig, renderContext });
    draw(runtime);
    return runtime.svg;
}
