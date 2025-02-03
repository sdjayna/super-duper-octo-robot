export class HilbertConfig {
    constructor(level = 7) {
        this.level = level;
        this.width = 420;
        this.height = 297;
    }

    toArray() {
        return [this.level];
    }
}
