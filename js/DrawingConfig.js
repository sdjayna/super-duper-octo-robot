export class DrawingConfig {
    constructor(name, code, options = {}) {
        this.name = name;
        this.code = code;
        this.paper = {
            width: options.width || 420,
            height: options.height || 297
        };
        this.line = {
            width: 0.3,
            spacing: 2.5,
            strokeWidth: 0.45,
            vertexGap: 1.25
        };
        this.colorPalette = options.colorPalette;
    }
}
