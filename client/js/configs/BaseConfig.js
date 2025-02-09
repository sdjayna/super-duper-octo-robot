export class BaseConfig {
    constructor(params) {
        this.width = params.paper?.width || 420;
        this.height = params.paper?.height || 297;
    }

    toArray() {
        return [];
    }
}
