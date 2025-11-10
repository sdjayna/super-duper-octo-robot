/**
 * Validates a Bouwkamp code array.
 * @param {number[]} code - The Bouwkamp code to validate
 * @throws {Error} If the code is invalid
 */
export function validateBouwkampCode(code) {
    if (!Array.isArray(code)) {
        throw new Error("Invalid Bouwkamp code: Must be an array.");
    }
    if (!code || code.length === 0) {
        throw new Error("Invalid Bouwkamp code: The code is empty.");
    }
    if (code.length - 3 !== code[0]) {
        throw new Error("Invalid Bouwkamp code: The code has the wrong length.");
    }
    if (!code.every(num => Number.isInteger(num) && num > 0)) {
        throw new Error("Invalid Bouwkamp code: All values must be positive integers.");
    }
}
