export class BouwkampConfig {
    constructor(code) {
        this.order = code[0];
        this.width = code[1];
        this.height = code[2];
        this.squares = code.slice(3);
    }

    toArray() {
        return [this.order, this.width, this.height, ...this.squares];
    }
}
