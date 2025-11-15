export function attachControls(definition, controls = []) {
    if (!definition || typeof definition !== 'object') {
        return definition;
    }
    const normalized = Array.isArray(controls) ? controls : [];
    definition.controls = normalized;
    if (definition.configClass) {
        definition.configClass.availableControls = normalized;
    }
    return definition;
}
