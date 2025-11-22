export {
    DrawingConfigBase,
    SizedDrawingConfig,
    PointCloudDrawingConfig,
    defineDrawing,
    createDrawingRuntime,
    withDrawingRuntime
} from './index.js';

export {
    createSVG,
    createDrawingBuilder,
    colorPalettes,
    maxMediumColorCount
} from './clientAdapters.js';

export {
    validateBouwkampCode
} from './utils/validationUtils.js';

export {
    generateSingleSerpentineLine
} from './utils/patternUtils.js';

export {
    generatePolygonScanlineHatch,
    generatePolygonSerpentineHatch,
    generatePolygonSkeletonHatch,
    generatePolygonContourHatch,
    rectToPolygon
} from './utils/hatchingUtils.js';

export {
    areRectanglesAdjacent,
    computeBoundsFromPoints,
    computeBoundsFromRects
} from './utils/geometryUtils.js';

export {
    attachControls
} from './controlsUtils.js';

export {
    useAvailableColorCountOr,
    ensureColorReachableLimit
} from './utils/colorLimitUtils.js';
