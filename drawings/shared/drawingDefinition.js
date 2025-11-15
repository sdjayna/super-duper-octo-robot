export function defineDrawing({ id, name, configClass, drawFunction, validator, presets = [], controls = [] }) {
    if (!id) {
        throw new Error('Drawing definition requires an id');
    }
    if (!name) {
        throw new Error(`Drawing "${id}" is missing a display name`);
    }
    if (!configClass) {
        throw new Error(`Drawing "${id}" is missing a configClass`);
    }
    if (typeof drawFunction !== 'function') {
        throw new Error(`Drawing "${id}" is missing a drawFunction`);
    }

    const normalizedControls = Array.isArray(controls) ? controls : [];
    configClass.availableControls = normalizedControls;

    return {
        id,
        name,
        configClass,
        drawFunction,
        validator,
        presets,
        controls: normalizedControls
    };
}
