import { BaseConfig } from './configs/BaseConfig.js';

export class BouwkampConfig extends BaseConfig {
    constructor(params) {
        super(params);
        // Extract code array from params
        const code = params.code;
        if (!Array.isArray(code)) {
            throw new Error('Bouwkamp code must be an array');
        }
        this.order = code[0];
        this.width = code[1];
        this.height = code[2];
        this.squares = code.slice(3);
    }

    toArray() {
        return [this.order, this.width, this.height, ...this.squares];
    }
}
