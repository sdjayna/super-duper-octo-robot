export class DrawingConfig {
    constructor(code, options = {}) {
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
        this.colorPalette = options.colorPalette;
    }
}
