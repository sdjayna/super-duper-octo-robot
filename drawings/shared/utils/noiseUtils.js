const TWO_PI = Math.PI * 2;

export function createSeededRandom(seed = 1) {
    let state = (Math.abs(seed) || 1) >>> 0;
    return () => {
        state = (1664525 * state + 1013904223) >>> 0;
        return state / 0x100000000;
    };
}

function hash2D(x, y, seed) {
    const dot = x * 127.1 + y * 311.7 + seed * 74.7;
    const s = Math.sin(dot) * 43758.5453;
    return s - Math.floor(s);
}

function valueNoise2D(x, y, seed) {
    const x0 = Math.floor(x);
    const y0 = Math.floor(y);
    const x1 = x0 + 1;
    const y1 = y0 + 1;
    const sx = smoothStep(x - x0);
    const sy = smoothStep(y - y0);

    const n00 = hash2D(x0, y0, seed);
    const n10 = hash2D(x1, y0, seed);
    const n01 = hash2D(x0, y1, seed);
    const n11 = hash2D(x1, y1, seed);

    const ix0 = lerp(n00, n10, sx);
    const ix1 = lerp(n01, n11, sx);
    return lerp(ix0, ix1, sy);
}

function smoothStep(t) {
    return t * t * (3 - 2 * t);
}

function lerp(a, b, t) {
    return a + (b - a) * t;
}

export function fractalValueNoise2D(x, y, options = {}) {
    const {
        seed = 1,
        frequency = 1,
        octaves = 3,
        lacunarity = 2,
        persistence = 0.5
    } = options;

    let value = 0;
    let amp = 1;
    let freq = frequency;
    let norm = 0;

    for (let octave = 0; octave < octaves; octave++) {
        const noise = valueNoise2D(x * freq, y * freq, seed + octave * 101);
        value += (noise * 2 - 1) * amp;
        norm += amp;
        amp *= persistence;
        freq *= lacunarity;
    }

    if (norm === 0) {
        return 0;
    }

    return value / norm;
}

export function angleFromNoise(x, y, options = {}) {
    const noise = fractalValueNoise2D(x, y, options);
    return ((noise + 1) / 2) * TWO_PI;
}
