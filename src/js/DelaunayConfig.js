export class DelaunayConfig {
    constructor(params) {
        // Extract triangulation data from params
        const triangulation = params.triangulation;
        if (!triangulation) {
            throw new Error('Triangulation data is required');
        }
        
        this.points = triangulation.points;
        this.width = triangulation.width;
        this.height = triangulation.height;
        
        if (!Array.isArray(this.points)) {
            throw new Error('Points must be an array');
        }
    }
}
