export class DrawingConfig {
    constructor(code, options = {}) {
        if (!code || !Array.isArray(code)) {
            throw new Error('DrawingConfig requires a valid Bouwkamp code array');
        }
        
        this.code = code;
        this.paper = options.paper || {
            width: 420,
            height: 297
        };
        this.line = options.line || {
            width: 0.3,
            spacing: 2.5,
            strokeWidth: 0.45,
            vertexGap: 1.25
        };
        
        if (!options.colorPalette) {
            throw new Error('DrawingConfig requires a colorPalette in options');
        }
        this.colorPalette = options.colorPalette;
    }
}
