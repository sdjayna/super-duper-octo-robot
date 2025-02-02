export class DelaunayConfig {
    constructor(params) {
        this.points = params.points;  // Array of {x, y} points
        this.width = params.width;
        this.height = params.height;
    }
}
