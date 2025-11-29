import { createSVG as domCreateSVG } from '../../client/js/utils/svgUtils.js';
import { createDrawingBuilder as domCreateDrawingBuilder } from '../../client/js/utils/drawingBuilder.js';
import { colorPalettes, maxMediumColorCount } from '../../client/js/utils/colorUtils.js';

let adapters = {
    createSVG: domCreateSVG,
    createDrawingBuilder: domCreateDrawingBuilder
};

export function setClientAdapters(customAdapters = {}) {
    adapters = {
        ...adapters,
        ...customAdapters
    };
}

export function resetClientAdapters() {
    adapters = {
        createSVG: domCreateSVG,
        createDrawingBuilder: domCreateDrawingBuilder
    };
}

export function createSVG(renderContext) {
    return adapters.createSVG(renderContext);
}

export function createDrawingBuilder(options) {
    return adapters.createDrawingBuilder(options);
}

export { colorPalettes, maxMediumColorCount };
