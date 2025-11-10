import { computeBoundsFromPoints } from '../../client/js/utils/geometryUtils.js';

export class DrawingConfigBase {
    constructor(params = {}) {
        this.paper = params.paper;
    }

    getFallbackBounds(context = {}) {
        const width = Number(context.paper?.width ?? this.paper?.width ?? 100);
        const height = Number(context.paper?.height ?? this.paper?.height ?? 100);
        return {
            minX: 0,
            minY: 0,
            width: Math.max(width, 1),
            height: Math.max(height, 1)
        };
    }

    getBounds(context = {}) {
        return this.bounds || this.getFallbackBounds(context);
    }
}

export class SizedDrawingConfig extends DrawingConfigBase {
    constructor(params = {}) {
        super(params);
        this.width = Number(params.width ?? params.paper?.width ?? 100);
        this.height = Number(params.height ?? params.paper?.height ?? this.width);
        this.bounds = {
            minX: 0,
            minY: 0,
            width: Math.max(this.width, 1),
            height: Math.max(this.height, 1)
        };
    }
}

export class PointCloudDrawingConfig extends DrawingConfigBase {
    constructor(params = {}) {
        super(params);
        this.points = params.points || [];
        this.bounds = computeBoundsFromPoints(this.points);
    }
}
