export class HilbertConfig {
    constructor(level = 8) {
        this.level = level;
        this.width = 420;
        this.height = 297;
    }

    toArray() {
        return [this.level];
    }
}
