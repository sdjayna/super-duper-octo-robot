export class HilbertConfig {
    constructor(params) {
        // Extract level from params, default to 7 if not provided
        this.level = params.level || 7;
        // Use paper dimensions if provided, otherwise default values
        this.width = params.paper?.width || 420;
        this.height = params.paper?.height || 297;
    }

    toArray() {
        // For Hilbert curve, we just need the level
        return [this.level];
    }
}
