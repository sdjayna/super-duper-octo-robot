export function deriveResumeButtonState({ resumeStatus, plotterIsRunning, layerSelectValue }) {
    const safeStatus = resumeStatus || {};
    const label = safeStatus.layerLabel || (safeStatus.layer ? `Layer ${safeStatus.layer}` : null);
    const buttonText = label ? `Resume ${label}` : 'Resume Plot';
    const noLayerSelected = layerSelectValue === 'all';
    const disabled = Boolean(plotterIsRunning) ||
        !Boolean(safeStatus.available) ||
        noLayerSelected;
    return {
        text: buttonText,
        disabled
    };
}
