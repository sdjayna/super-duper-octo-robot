export class HilbertConfig {
    constructor(params) {
        // Extract level from params, default to 7 if not provided
        this.level = params.level || 7;
        this.width = 420;
        this.height = 297;
    }

    toArray() {
        return [this.level];
    }
}
