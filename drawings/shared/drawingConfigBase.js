import { computeBoundsFromPoints } from './utils/geometryUtils.js';

export class DrawingConfigBase {
    constructor(params = {}) {
        this.paper = params.paper;
        this.preserveAspectRatio = Boolean(params.preserveAspectRatio);
        this.bounds = params.bounds || null;
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
        if (this.preserveAspectRatio || !context.paper) {
            return this.bounds || this.getFallbackBounds(context);
        }
        const margin = Number(context.paper.margin) || 0;
        const rawWidth = Number(context.paper.width ?? this.bounds?.width ?? 100);
        const rawHeight = Number(context.paper.height ?? this.bounds?.height ?? 100);
        const printableWidth = Math.max(rawWidth - margin * 2, 1);
        const printableHeight = Math.max(rawHeight - margin * 2, 1);
        const longer = Math.max(printableWidth, printableHeight);
        const shorter = Math.min(printableWidth, printableHeight);
        const isPortrait = context.orientation === 'portrait';
        return {
            minX: 0,
            minY: 0,
            width: isPortrait ? shorter : longer,
            height: isPortrait ? longer : shorter
        };
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
