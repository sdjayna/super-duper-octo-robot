export function isWorkerSafeDrawing(drawingConfig) {
    if (!drawingConfig) {
        return false;
    }
    if (drawingConfig?.drawingData?.imageDataUrl) {
        return false;
    }
    return Boolean(drawingConfig.type || drawingConfig.id);
}
