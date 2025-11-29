declare module '../../client/js/utils/svgUtils.js' {
    export function createSVG(renderContext: any, options?: any): SVGSVGElement;
    export function createGroup(attributes?: Record<string, string | number>): SVGGElement;
    export function createPath(points: Array<{ x: number; y: number }>, options?: Record<string, any>): SVGPathElement;
}

declare module '../../client/js/utils/drawingBuilder.js' {
    export function createDrawingBuilder(options: {
        svg: SVGSVGElement;
        drawingConfig: any;
        renderContext: any;
        abortSignal?: AbortSignal | null;
    }): any;
}
