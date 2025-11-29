import { logDebug, initLogTabs, logProgress, resetProgressLog } from './modules/logger.js';
import { playCompletionSiren, toggleMute } from './modules/audio.js';
import { startProgressListener, stopProgressListener } from './modules/progress.js';
import { createPreviewController } from './modules/preview.js';
import { initPlotterControls } from './modules/plotterControls.js';
import { initializeHatchControls, applyHatchSettingsToConfig, getHatchSettings } from './modules/hatchSettings.js';
import { deriveResumeButtonState } from './modules/resumeButton.js';
import { resolvePreviewProfile, evaluatePreviewWarnings, resolvePlotterDefaults } from './utils/paperProfile.js';
import { normalizePaperColor, getPaperColor, getPaperTextureClass, computePlotterWarning } from './utils/paperUtils.js';
import { filterPaletteByDisabledColors, loadDisabledColorPrefs, saveDisabledColorPrefs } from './utils/paletteUtils.js';

window.logDebug = logDebug;
initLogTabs();
const PREVIEW_CONTROL_SELECTOR = '.preview-section button, .preview-section select';

function setPreviewControlsDisabled(disabled) {
    document.querySelectorAll(PREVIEW_CONTROL_SELECTOR).forEach(control => {
        control.disabled = disabled;
    });
    if (previewOverlay) {
        previewOverlay.hidden = !disabled;
    }
}

function handlePlotReady(result) {
    stopProgressListener();
    updatePlotterStatus('Ready');
    setPreviewControlsDisabled(false);
    refreshResumeStatus({ silent: true });
    if (result === 'error') {
        logDebug('Plot reported an error', 'error');
    }
}

function beginProgressListener() {
    setPreviewControlsDisabled(true);
    resetProgressLog();
    startProgressListener({
        logDebug,
        logProgress,
        onPlotReady: handlePlotReady,
        playCompletionSiren
    });
}
const marginUtils = await import('./utils/marginUtils.js?v=' + Date.now());
const { DEFAULT_MARGIN } = marginUtils;
const DEFAULT_PAPER_COLOR = '#ffffff';
const CONTROL_STORAGE_KEY = 'drawingControlValues';
const DRAWING_STORAGE_KEY = 'selectedDrawingKey';
const MEDIUM_STORAGE_KEY = 'selectedMediumId';
const TRAVEL_LIMIT_MIN_METERS = 1;
const TRAVEL_LIMIT_MAX_METERS = 100;
const TRAVEL_LIMIT_INFINITE_SLIDER_VALUE = TRAVEL_LIMIT_MAX_METERS + 1;

const select = document.getElementById('drawingSelect');
const container = document.getElementById('svgContainer');
const exportButton = document.getElementById('exportSvg');
const mediumSelect = document.getElementById('mediumSelect');
const mediumColorList = document.getElementById('mediumColorList');
const drawingControlsContainer = document.getElementById('drawingControlsContainer');
const controlTabs = document.querySelectorAll('.control-tab');
const controlPanels = document.querySelectorAll('.control-panel');
const paperDescription = document.getElementById('paperDescription');
const drawingSettingsToggle = document.getElementById('drawingSettingsToggle');
const drawingSettingsContent = document.getElementById('drawingSettingsContent');
const drawingSettingsSection = document.querySelector('[data-role="drawing-settings-section"]');
const paperSettingsToggle = document.getElementById('paperSettingsToggle');
const paperSettingsContent = document.getElementById('paperSettingsContent');
const paperSettingsSection = document.querySelector('[data-role="paper-settings-section"]');
const mediumSettingsToggle = document.getElementById('mediumSettingsToggle');
const mediumSettingsContent = document.getElementById('mediumSettingsContent');
const mediumSettingsSection = document.querySelector('[data-role="medium-settings-section"]');
const hatchSettingsToggle = document.getElementById('hatchSettingsToggle');
const hatchSettingsContent = document.getElementById('hatchSettingsContent');
const hatchSettingsSection = document.querySelector('[data-role="hatch-settings-section"]');
const hatchStyleControl = document.getElementById('hatchStyleControl');
const hatchSpacingControl = document.getElementById('hatchSpacingControl');
const hatchSpacingValueLabel = document.getElementById('hatchSpacingValue');
const hatchInsetControl = document.getElementById('hatchInsetControl');
const hatchInsetValueLabel = document.getElementById('hatchInsetValue');
const hatchBoundaryControl = document.getElementById('hatchBoundaryControl');
const hatchLinkControl = document.getElementById('hatchLinkControl');
const resumeButton = document.getElementById('plotterResumePlot');
const maxTravelSlider = document.getElementById('maxTravelPerLayer');
const maxTravelValueLabel = document.getElementById('maxTravelPerLayerValue');
const previewZoomSlider = document.getElementById('previewZoomSlider');
const previewZoomValue = document.getElementById('previewZoomValue');
const previewContainer = document.getElementById('svgContainer');
const previewCenterButton = document.getElementById('previewCenter');
const previewResetButton = document.getElementById('previewReset');
const previewFitButton = document.getElementById('previewFit');
const previewOverlay = document.getElementById('previewOverlay');
const previewZoomBar = document.querySelector('.zoom-control');

const state = {
    paperConfig: null,
    currentPaperId: null,
    currentPaper: null,
    currentPaperColor: DEFAULT_PAPER_COLOR,
    currentOrientation: 'landscape',
    currentMargin: DEFAULT_MARGIN,
    lastRenderedPaper: null,
    currentMediumId: null,
    currentPalette: null,
    currentStrokeWidth: null,
    currentLineCap: 'round',
    currentLineJoin: 'round',
    rulersVisible: false,
    drawingControlValues: loadControlValuesFromStorage(),
    previewProfile: null,
    plotterSpecs: null,
    warnIfPaperExceedsPlotter: null,
    disabledColorsByMedium: loadDisabledColorPrefs(),
    maxTravelPerLayerMeters: null,
    activeLayerColorNames: new Set(),
    previewZoomPercent: 100,
    previewPan: { x: 0, y: 0 },
    isPanning: false,
    panStart: null
};

state.warnIfPaperExceedsPlotter = () => warnIfPaperExceedsPlotter(state, state.currentPaper);
let resumeStatus = { available: false, layer: null, layerLabel: null };
let plotterIsRunning = false;

function updateResumeButtonState() {
    if (!resumeButton) {
        return;
    }
    const layerSelect = document.getElementById('layerSelect');
    const { text, disabled } = deriveResumeButtonState({
        resumeStatus,
        plotterIsRunning,
        layerSelectValue: layerSelect?.value
    });
    resumeButton.textContent = text;
    resumeButton.disabled = disabled;
}

function applyResumeStatus(status = {}) {
    resumeStatus = {
        available: Boolean(status.available),
        layer: status.layer ?? null,
        layerLabel: status.layerLabel ?? null
    };
    updateResumeButtonState();
}

function applyPreviewZoom(percent) {
    const clamped = Math.min(Math.max(Math.round(percent / 10) * 10, 10), 1000);
    state.previewZoomPercent = clamped;
    const scale = clamped / 100;
    applyPreviewTransform(scale);
    if (previewZoomSlider) {
        previewZoomSlider.value = clamped;
    }
    if (previewZoomValue) {
        previewZoomValue.textContent = `${clamped}%`;
    }
}

function applyPreviewTransform(scaleOverride) {
    const scale = scaleOverride || state.previewZoomPercent / 100;
    if (previewContainer) {
        const { x, y } = state.previewPan;
        previewContainer.style.transform = `translate(${x}px, ${y}px) scale(${scale})`;
    }
}

function resetPreviewPan() {
    state.previewPan = { x: 0, y: 0 };
    applyPreviewTransform();
}

function clearResumeStatusLocally() {
    resumeStatus = {
        available: false,
        layer: null,
        layerLabel: null
    };
    updateResumeButtonState();
}

async function refreshResumeStatus(options = {}) {
    if (typeof fetch === 'undefined') {
        return;
    }
    try {
        const response = await fetch('http://localhost:8000/resume-status');
        if (!response.ok) {
            throw new Error(`Resume status request failed (${response.status})`);
        }
        const status = await response.json();
        applyResumeStatus(status);
    } catch (error) {
        if (!options.silent) {
            logDebug(`Failed to refresh resume status: ${error.message}`, 'error');
        }
        applyResumeStatus({ available: false });
    }
}

const previewController = createPreviewController({
    container,
    select,
    logDebug,
    marginUtils,
    state,
    setPreviewControlsDisabled
});

const {
    draw,
    startRefresh: previewStartRefresh,
    stopRefresh: previewStopRefresh,
    toggleOrientation,
    updateMarginControls,
    applyMarginValue,
    updateLayerVisibility,
    populateLayerSelect
} = previewController;
let isInitializing = true;

async function requestDraw(options = {}) {
    if (isInitializing) {
        return null;
    }
    return draw(options);
}

applyPreviewZoom(state.previewZoomPercent);

let colorUtilsModulePromise = null;
let drawingsModulePromise = null;
let plotterSpecsPromise = null;
const PAPER_TEXTURE_CLASSES = ['texture-smooth', 'texture-grain', 'texture-vellum', 'texture-gesso'];

function persistDisabledColorsToStorage() {
    saveDisabledColorPrefs(state.disabledColorsByMedium);
}

function registerSectionToggle({ section, toggle, content, defaultCollapsed = false, label }) {
    if (!section || !toggle || !content) {
        return;
    }
    function setCollapsed(collapsed) {
        section.classList.toggle('collapsed', collapsed);
        content.hidden = collapsed;
        toggle.setAttribute('aria-expanded', String(!collapsed));
    }
    toggle.addEventListener('click', () => {
        const isCollapsed = section.classList.contains('collapsed');
        setCollapsed(!isCollapsed);
    });
    if (label) {
        toggle.setAttribute('aria-label', label);
    } else if (!toggle.getAttribute('aria-label')) {
        toggle.setAttribute('aria-label', 'Toggle section');
    }
    setCollapsed(defaultCollapsed);
    return { setCollapsed };
}

registerSectionToggle({
    section: drawingSettingsSection,
    toggle: drawingSettingsToggle,
    content: drawingSettingsContent,
    label: 'Toggle drawing settings panel'
});

registerSectionToggle({
    section: paperSettingsSection,
    toggle: paperSettingsToggle,
    content: paperSettingsContent,
    label: 'Toggle paper and margin panel'
});

registerSectionToggle({
    section: mediumSettingsSection,
    toggle: mediumSettingsToggle,
    content: mediumSettingsContent,
    label: 'Toggle medium panel'
});

registerSectionToggle({
    section: hatchSettingsSection,
    toggle: hatchSettingsToggle,
    content: hatchSettingsContent,
    label: 'Toggle hatch settings panel'
});

async function handleGlobalHatchChanged() {
    const context = await getDrawingControlContext();
    if (context) {
        applyHatchSettingsToConfig(context.drawingConfig);
    }
    await requestDraw({ forceRestart: true });
    refreshLayerSelectUI();
    updatePlotterStatus();
}

initializeHatchControls({
    styleSelect: hatchStyleControl,
    spacingSlider: hatchSpacingControl,
    spacingValueLabel: hatchSpacingValueLabel,
    insetSlider: hatchInsetControl,
    insetValueLabel: hatchInsetValueLabel,
    boundaryCheckbox: hatchBoundaryControl,
    linkCheckbox: hatchLinkControl
}, handleGlobalHatchChanged);

initializeHatchControls({
    styleSelect: hatchStyleControl,
    spacingSlider: hatchSpacingControl,
    spacingValueLabel: hatchSpacingValueLabel,
    insetSlider: hatchInsetControl,
    insetValueLabel: hatchInsetValueLabel,
    boundaryCheckbox: hatchBoundaryControl
}, async () => {
    await requestDraw({ forceRestart: true });
    refreshLayerSelectUI();
    updatePlotterStatus();
});

function loadControlValuesFromStorage() {
    if (typeof window === 'undefined' || !window.localStorage) {
        return {};
    }
    try {
        const raw = window.localStorage.getItem(CONTROL_STORAGE_KEY);
        return raw ? JSON.parse(raw) : {};
    } catch {
        return {};
    }
}

function persistControlValues() {
    if (typeof window === 'undefined' || !window.localStorage) {
        return;
    }
    try {
        window.localStorage.setItem(CONTROL_STORAGE_KEY, JSON.stringify(state.drawingControlValues));
    } catch {
        // ignore
    }
}

function readFileAsDataURL(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.onerror = () => reject(reader.error || new Error('Failed to read file'));
        reader.readAsDataURL(file);
    });
}

function loadSavedDrawingKey() {
    if (typeof window === 'undefined' || !window.localStorage) {
        return null;
    }
    try {
        return window.localStorage.getItem(DRAWING_STORAGE_KEY);
    } catch {
        return null;
    }
}

function loadSavedMediumId() {
    if (typeof window === 'undefined' || !window.localStorage) {
        return null;
    }
    try {
        return window.localStorage.getItem(MEDIUM_STORAGE_KEY);
    } catch {
        return null;
    }
}

function persistSelectedMedium(mediumId) {
    if (typeof window === 'undefined' || !window.localStorage) {
        return;
    }
    try {
        window.localStorage.setItem(MEDIUM_STORAGE_KEY, mediumId);
    } catch {
        // ignore
    }
}

function persistSelectedDrawing(key) {
    if (typeof window === 'undefined' || !window.localStorage) {
        return;
    }
    try {
        window.localStorage.setItem(DRAWING_STORAGE_KEY, key);
    } catch {
        // ignore
    }
}

function populateMediumColorSelect(mediumId, mediumMetadata = {}) {
    if (!mediumColorList) {
        return;
    }
    mediumColorList.innerHTML = '';
    mediumColorList.dataset.disabled = 'true';
    const mediumInfo = mediumMetadata[mediumId];
    if (!mediumInfo?.colors) {
        const empty = document.createElement('p');
        empty.className = 'medium-color-empty';
        empty.textContent = 'No palette information available.';
        mediumColorList.appendChild(empty);
        updateMediumColorUsageHighlight();
        return;
    }
    const disabledSet = state.disabledColorsByMedium.get(mediumId) || new Set();
    const entries = Object.entries(mediumInfo.colors)
        .sort(([, a], [, b]) => a.name.localeCompare(b.name));
    entries.forEach(([colorId, color]) => {
        const label = document.createElement('label');
        label.dataset.colorName = color.name;
        const checkbox = document.createElement('input');
        checkbox.type = 'checkbox';
        checkbox.value = colorId;
        checkbox.checked = disabledSet.has(colorId);
        label.appendChild(checkbox);
        const nameNode = document.createElement('span');
        nameNode.textContent = color.name;
        label.appendChild(nameNode);
        mediumColorList.appendChild(label);
    });
    mediumColorList.dataset.disabled = 'false';
    updateMediumColorUsageHighlight();
}


function syncMediumColorSelections(mediumId) {
    if (!mediumColorList) {
        return;
    }
    const disabledSet = state.disabledColorsByMedium.get(mediumId) || new Set();
    const inputs = mediumColorList.querySelectorAll('input[type="checkbox"]');
    inputs.forEach(input => {
        input.checked = disabledSet.has(input.value);
    });
}

function extractLayerColorName(labelText = '') {
    if (typeof labelText !== 'string') {
        return '';
    }
    const dashIndex = labelText.indexOf('-');
    let name = dashIndex >= 0 ? labelText.slice(dashIndex + 1).trim() : labelText.trim();
    const passIndex = name.indexOf('(pass');
    if (passIndex !== -1) {
        name = name.slice(0, passIndex).trim();
    }
    return name;
}

function updateActiveLayerColorsFromSelect() {
    const layerSelect = document.getElementById('layerSelect');
    if (!layerSelect) {
        return;
    }
    const names = new Set();
    Array.from(layerSelect.options).forEach(option => {
        if (!option || option.value === 'all') {
            return;
        }
        const extracted = extractLayerColorName(option.textContent || '');
        if (extracted) {
            names.add(extracted);
        }
    });
    state.activeLayerColorNames = names;
}

function updateMediumColorUsageHighlight() {
    if (!mediumColorList) {
        return;
    }
    const isDisabled = mediumColorList.dataset.disabled === 'true';
    const activeNames = state.activeLayerColorNames || new Set();
    mediumColorList.querySelectorAll('label').forEach(label => {
        const colorName = label.dataset.colorName;
        const shouldHighlight = !isDisabled && colorName && activeNames.has(colorName);
        label.classList.toggle('is-active', Boolean(shouldHighlight));
    });
}

function refreshLayerSelectUI() {
    populateLayerSelect();
    updateActiveLayerColorsFromSelect();
    updateMediumColorUsageHighlight();
}

function loadColorUtilsModule() {
    if (!colorUtilsModulePromise) {
        colorUtilsModulePromise = import('./utils/colorUtils.js?v=' + Date.now());
    }
    return colorUtilsModulePromise;
}

function loadDrawingsModule() {
    if (!drawingsModulePromise) {
        drawingsModulePromise = import('./drawings.js?v=' + Date.now());
    }
    return drawingsModulePromise;
}

async function loadPlotterSpecs() {
    if (state.plotterSpecs) {
        return state.plotterSpecs;
    }
    if (!plotterSpecsPromise) {
        plotterSpecsPromise = fetch(`/config/plotters.json?v=${Date.now()}`)
            .then(response => {
                if (!response.ok) {
                    throw new Error(`Failed to load plotter config (${response.status})`);
                }
                return response.json();
            })
            .then(config => {
                const defaultId = config.default;
                return config.plotters?.[defaultId] || null;
            })
            .catch(error => {
                logDebug('Unable to load plotter configuration: ' + error.message, 'error');
                return null;
            });
    }
    state.plotterSpecs = await plotterSpecsPromise;
    return state.plotterSpecs;
}

function populateDrawingSelectOptions(drawingsMap, selectEl, desiredKey) {
    if (!selectEl || !drawingsMap) {
        return null;
    }
    const entries = Object.entries(drawingsMap)
        .sort(([, a], [, b]) => a.name.localeCompare(b.name));
    selectEl.innerHTML = entries
        .map(([key, drawing]) => `<option value="${key}">${drawing.name}</option>`)
        .join('');
    const target = desiredKey && entries.some(([key]) => key === desiredKey)
        ? desiredKey
        : entries[0]?.[0] || null;
    if (target) {
        selectEl.value = target;
    }
    return target;
}

function populateMediumSelectOptions(mediumMetadata = {}) {
    if (!mediumSelect) {
        return [];
    }
    mediumSelect.innerHTML = '';
    const mediums = Object.entries(mediumMetadata)
        .sort(([, a], [, b]) => a.name.localeCompare(b.name));
    mediums.forEach(([id, medium]) => {
        const option = document.createElement('option');
        option.value = id;
        option.textContent = medium.name;
        mediumSelect.appendChild(option);
    });
    return mediums;
}

let isRefreshActive = false;

function applyPaperColor(color) {
    const normalized = normalizePaperColor(color);
    state.currentPaperColor = normalized;
    const svg = container.querySelector('svg');
    if (svg) {
        svg.style.backgroundColor = normalized;
    }
    if (state.lastRenderedPaper) {
        state.lastRenderedPaper.color = normalized;
    }
    return normalized;
}

function applyPaperTexture(paper) {
    if (!container) {
        return;
    }
    PAPER_TEXTURE_CLASSES.forEach(cls => container.classList.remove(cls));
    container.classList.add(getPaperTextureClass(paper));
}

function warnIfPaperExceedsPlotter(state, paper) {
    if (!paper || !state.plotterSpecs?.paper) {
        return;
    }
    const warning = computePlotterWarning({
        paper,
        plotterSpecs: state.plotterSpecs,
        orientation: state.currentOrientation,
        margin: Number(state.currentMargin) || 0
    });
    if (warning) {
        logDebug(warning.message, warning.severity);
    }
}

function getNestedValue(obj, path) {
    if (!obj || !path) {
        return undefined;
    }
    return path.split('.').reduce((acc, key) => {
        if (acc && typeof acc === 'object') {
            return acc[key];
        }
        return undefined;
    }, obj);
}

function setNestedValue(obj, path, value) {
    if (!obj || !path) {
        return;
    }
    const keys = path.split('.');
    let target = obj;
    for (let i = 0; i < keys.length - 1; i++) {
        const key = keys[i];
        if (typeof target[key] !== 'object' || target[key] === null) {
            target[key] = {};
        }
        target = target[key];
    }
    target[keys[keys.length - 1]] = value;
}

function ensureControlState(drawingKey) {
    if (!drawingKey) {
        return {};
    }
    if (!state.drawingControlValues[drawingKey]) {
        state.drawingControlValues[drawingKey] = {};
    }
    return state.drawingControlValues[drawingKey];
}

function normalizeControlValue(control, rawValue) {
    const valueType = control.valueType || 'number';
    if (valueType === 'number') {
        let parsed = Number(rawValue);
        if (Number.isNaN(parsed)) {
            parsed = control.min ?? 0;
        }
        if (typeof control.min === 'number') {
            parsed = Math.max(control.min, parsed);
        }
        if (typeof control.max === 'number') {
            parsed = Math.min(control.max, parsed);
        }
        return parsed;
    }
    if (valueType === 'boolean') {
        return Boolean(rawValue);
    }
    if (valueType === 'string') {
        return typeof rawValue === 'string' ? rawValue : '';
    }
    return rawValue;
}

function formatControlValue(value, control) {
    if (control?.valueType === 'boolean') {
        return value ? 'On' : 'Off';
    }
    const parsed = Number(value);
    if (Number.isFinite(parsed)) {
        const precision = control?.displayPrecision ?? 2;
        const formatted = parsed
            .toFixed(precision)
            .replace(/\.?0+$/, '')
            .replace(/\.$/, '');
        if (control?.units === 'mm') {
            return `${formatted} mm`;
        }
        return formatted;
    }
    return `${value}`;
}

function clamp01(value) {
    if (value < 0) return 0;
    if (value > 1) return 1;
    return value;
}

function controlInputToActualValue(control, rawValue) {
    const numeric = Number(rawValue);
    if (control.scale === 'log10') {
        const sliderMin = control.inputMin ?? 0;
        const sliderMax = control.inputMax ?? 1;
        const min = Math.max(1e-6, control.min ?? 1);
        const max = Math.max(min, control.max ?? min);
        const normalized = clamp01((numeric - sliderMin) / ((sliderMax - sliderMin) || 1));
        const value = min * Math.pow(max / min, normalized);
        const precision = control.scalePrecision ?? 0;
        return Number(value.toFixed(precision));
    }
    return numeric;
}

function actualValueToControlInput(control, actualValue) {
    if (control.scale === 'log10') {
        const sliderMin = control.inputMin ?? 0;
        const sliderMax = control.inputMax ?? 1;
        const min = Math.max(1e-6, control.min ?? 1);
        const max = Math.max(min, control.max ?? min);
        const ratio = clamp01(Math.log(actualValue / min) / Math.log(max / min || 1));
        return sliderMin + ratio * (sliderMax - sliderMin);
    }
    return actualValue;
}

async function getDrawingControlContext() {
    if (!select || !select.value) {
        return null;
    }
    const drawingsModule = await loadDrawingsModule();
    const { drawings, drawingTypes, drawingsReady } = drawingsModule;
    if (drawingsReady) {
        await drawingsReady;
    }
    const drawingKey = select.value;
    const drawingConfig = drawings[drawingKey];
    if (!drawingConfig) {
        logDebug(`No drawing config found for ${drawingKey}`, 'error');
        return null;
    }
    applyHatchSettingsToConfig(drawingConfig);
    const controls = drawingTypes[drawingConfig.type]?.controls
        || drawingConfig.controls
        || [];
    return { drawingKey, drawingConfig, controls };
}

function applyStoredControlValues(context) {
    if (!context) {
        return;
    }
    const { drawingKey, drawingConfig, controls } = context;
    if (!controls.length) {
        return;
    }
    const saved = state.drawingControlValues[drawingKey];
    if (!saved) {
        return;
    }
    controls.forEach(control => {
        if (Object.prototype.hasOwnProperty.call(saved, control.id)) {
            setNestedValue(drawingConfig, control.target, saved[control.id]);
        }
    });
}

function getControlValue(context, control) {
    const { drawingKey, drawingConfig } = context;
    const saved = state.drawingControlValues[drawingKey];
    if (saved && Object.prototype.hasOwnProperty.call(saved, control.id)) {
        const savedValue = saved[control.id];
        if (control.valueType === 'string' && typeof savedValue !== 'string') {
            return control.default ?? '';
        }
        return savedValue;
    }
    const current = getNestedValue(drawingConfig, control.target);
    if (typeof current !== 'undefined') {
        if (control.valueType === 'string' && typeof current !== 'string') {
            return control.default ?? '';
        }
        return current;
    }
    return control.default;
}

async function applyDrawingControlsState() {
    const context = await getDrawingControlContext();
    applyStoredControlValues(context);
    return context;
}

async function refreshDrawingControlsUI() {
    if (!drawingControlsContainer) {
        return;
    }
    const context = await applyDrawingControlsState();
    drawingControlsContainer.innerHTML = '';
    if (!context) {
        return;
    }
    const { drawingKey, controls } = context;
    if (!controls.length) {
        const emptyState = document.createElement('p');
        emptyState.className = 'drawing-controls-empty';
        emptyState.textContent = 'No adjustable settings for this drawing.';
        drawingControlsContainer.appendChild(emptyState);
        return;
    }
    const storedValues = ensureControlState(drawingKey);
    controls.forEach(control => {
        const value = getControlValue(context, control);
        storedValues[control.id] = value;
        const controlElement = createControlElement(control, value, async (nextValue) => {
            await handleDrawingControlChange(context, control, nextValue);
        });
        drawingControlsContainer.appendChild(controlElement);
    });
    const resetButton = document.createElement('button');
    resetButton.type = 'button';
    resetButton.className = 'drawing-controls-reset';
    resetButton.textContent = 'Reset drawing settings';
    resetButton.addEventListener('click', async () => {
        if (!context?.drawingKey) {
            return;
        }
        delete state.drawingControlValues[context.drawingKey];
        persistControlValues();
        controls.forEach(control => {
            setNestedValue(context.drawingConfig, control.target, control.default);
        });
        await refreshDrawingControlsUI();
        await requestDraw({ forceRestart: true });
        refreshLayerSelectUI();
        updatePlotterStatus();
    });
    drawingControlsContainer.appendChild(resetButton);
}

function createControlElement(control, value, onChange) {
    const wrapper = document.createElement('div');
    wrapper.className = 'drawing-control';
    const label = document.createElement('label');
    const labelText = document.createElement('span');
    labelText.textContent = control.label || control.id;
    const valueDisplay = document.createElement('span');
    valueDisplay.className = 'drawing-control-value';
    if (control.inputType === 'file') {
        valueDisplay.textContent = value
            ? (control.loadedLabel || 'Image loaded')
            : (control.emptyLabel || 'No file selected');
    } else {
        valueDisplay.textContent = formatControlValue(value, control);
    }
    label.appendChild(labelText);
    label.appendChild(valueDisplay);
    const inputContainer = document.createElement('div');
    inputContainer.className = 'drawing-control-input';
    let inputElement;
    if (control.inputType === 'select') {
        inputElement = document.createElement('select');
        (control.options || []).forEach(option => {
            const opt = document.createElement('option');
            opt.value = option.value;
            opt.textContent = option.label;
            inputElement.appendChild(opt);
        });
        inputElement.value = value;
        inputElement.addEventListener('change', async (event) => {
            valueDisplay.textContent = formatControlValue(event.target.value, control);
            await onChange(event.target.value);
        });
    } else {
        inputElement = document.createElement('input');
        if (control.inputType === 'checkbox') {
            inputElement.type = 'checkbox';
            inputElement.checked = Boolean(value);
            inputElement.addEventListener('change', async (event) => {
                const actualValue = event.target.checked;
                valueDisplay.textContent = formatControlValue(actualValue, control);
                await onChange(actualValue);
            });
        } else if (control.inputType === 'file') {
            inputElement.type = 'file';
            if (control.accept) {
                inputElement.accept = control.accept;
            }
            inputElement.addEventListener('change', async (event) => {
                const file = event.target.files && event.target.files[0];
                if (!file) {
                    valueDisplay.textContent = control.emptyLabel || 'No file selected';
                    await onChange('');
                    return;
                }
                valueDisplay.textContent = file.name;
                try {
                    const dataUrl = await readFileAsDataURL(file);
                    await onChange(dataUrl);
                } catch (error) {
                    logDebug(`Failed to load file: ${error.message}`, 'error');
                }
            });
        } else {
            inputElement.type = control.inputType || 'number';
            const minAttr = control.inputMin ?? control.min;
            const maxAttr = control.inputMax ?? control.max;
            if (typeof minAttr !== 'undefined') inputElement.min = minAttr;
            if (typeof maxAttr !== 'undefined') inputElement.max = maxAttr;
            if (typeof control.step !== 'undefined') {
                inputElement.step = control.step;
            } else if (typeof control.inputStep !== 'undefined') {
                inputElement.step = control.inputStep;
            }
            inputElement.value = actualValueToControlInput(control, value);
            const eventName = control.inputType === 'range' ? 'input' : 'change';
            inputElement.addEventListener(eventName, async (event) => {
                const actualValue = controlInputToActualValue(control, event.target.value);
                valueDisplay.textContent = formatControlValue(actualValue, control);
                await onChange(actualValue);
            });
        }
    }
    inputContainer.appendChild(inputElement);
    wrapper.appendChild(label);
    wrapper.appendChild(inputContainer);
    if (control.description) {
        const help = document.createElement('p');
        help.className = 'drawing-control-help';
        help.textContent = control.description;
        wrapper.appendChild(help);
    }
    return wrapper;
}

async function handleDrawingControlChange(context, control, rawValue) {
    if (!context) {
        return;
    }
    const normalized = normalizeControlValue(control, rawValue);
    setNestedValue(context.drawingConfig, control.target, normalized);
    const storedValues = ensureControlState(context.drawingKey);
    storedValues[control.id] = normalized;
    persistControlValues();
    await requestDraw({ forceRestart: true });
    refreshLayerSelectUI();
    updatePlotterStatus();
}

function describePaper(paper) {
    if (!paper) {
        return '';
    }
    const traits = [];
    if (paper.weightGsm) {
        traits.push(`${paper.weightGsm}gsm`);
    }
    if (paper.finish) {
        traits.push(paper.finish);
    }
    if (paper.absorbency) {
        traits.push(`absorbency: ${paper.absorbency}`);
    }
    return traits.join(', ');
}

function logPaperSelection(paper) {
    if (!paper) {
        return;
    }
    const traits = describePaper(paper);
    const note = traits ? ` (${traits})` : '';
    logDebug(`Paper set to ${paper.name}${note}`);
    if (paper.notes) {
        logDebug(paper.notes);
    }
}

function updatePaperDescription(paper) {
    if (!paperDescription) {
        return;
    }
    if (!paper) {
        paperDescription.textContent = '';
        paperDescription.classList.add('hidden');
        return;
    }
    const parts = [];
    if (paper.description) {
        parts.push(paper.description);
    }
    const traits = describePaper(paper);
    if (traits) {
        parts.push(traits);
    }
    if (paper.notes) {
        parts.push(paper.notes);
    }
    paperDescription.textContent = parts.join(' • ');
    paperDescription.classList.remove('hidden');
}

function formatTravelMeters(value) {
    if (value === null || value === undefined || !Number.isFinite(value)) {
        return '∞';
    }
    return `${Math.round(value)} m`;
}

function isInfiniteTravelValue(value) {
    return String(value) === String(TRAVEL_LIMIT_INFINITE_SLIDER_VALUE);
}

function clampTravelLimitValue(value) {
    const numeric = Number(value);
    if (!Number.isFinite(numeric)) {
        return null;
    }
    return Math.min(
        TRAVEL_LIMIT_MAX_METERS,
        Math.max(TRAVEL_LIMIT_MIN_METERS, Math.round(numeric))
    );
}

function applyMaxTravelLimit(value, options = {}) {
    if (isInfiniteTravelValue(value)) {
        if (maxTravelSlider) {
            maxTravelSlider.value = String(TRAVEL_LIMIT_INFINITE_SLIDER_VALUE);
        }
        if (maxTravelValueLabel) {
            maxTravelValueLabel.textContent = '∞';
        }
        state.maxTravelPerLayerMeters = null;
        if (!options.silent) {
            logDebug('Max travel per layer set to ∞ (no automatic splitting)');
        }
        return true;
    }
    const clamped = clampTravelLimitValue(value);
    if (clamped === null) {
        return false;
    }
    if (maxTravelSlider) {
        maxTravelSlider.value = String(clamped);
    }
    if (maxTravelValueLabel) {
        maxTravelValueLabel.textContent = formatTravelMeters(clamped);
    }
    state.maxTravelPerLayerMeters = clamped;
    if (!options.silent) {
        logDebug(`Max travel per layer set to ${formatTravelMeters(clamped)}`);
    }
    return true;
}

function updatePreviewProfile() {
    if (!state.currentMediumId) {
        return;
    }
    state.previewProfile = resolvePreviewProfile({
        paper: state.currentPaper,
        mediumId: state.currentMediumId
    });
    if (state.previewProfile) {
        logDebug(`Preview profile → pressure ${state.previewProfile.pressure.toFixed(2)}, spacing ${state.previewProfile.hatchSpacing.toFixed(2)}, bleed ${state.previewProfile.bleedRadius.toFixed(2)}`);
        const warnings = evaluatePreviewWarnings(state.currentPaper, state.previewProfile);
        warnings.forEach(message => logDebug(message, 'error'));
    }
}

function updatePlotterDefaults() {
    if (!state.currentPaper || !state.currentMediumId) {
        return;
    }
    const { penRateLower, maxTravelPerLayerMeters } = resolvePlotterDefaults({
        paper: state.currentPaper,
        mediumId: state.currentMediumId
    }) || {};

    const slider = document.getElementById('penRateLower');
    const valueLabel = document.getElementById('penRateLowerValue');
    if (slider && valueLabel && typeof penRateLower === 'number') {
        slider.value = penRateLower;
        valueLabel.textContent = penRateLower;
        logDebug(`Pen Rate Lower auto-set to ${penRateLower} for ${state.currentPaper.name}`);
    }

    if (typeof maxTravelPerLayerMeters === 'number') {
        applyMaxTravelLimit(maxTravelPerLayerMeters, { silent: true });
        logDebug(`Max travel per layer auto-set to ${formatTravelMeters(state.maxTravelPerLayerMeters)} for ${state.currentPaper.name}`);
    }
}

function startRefresh() {
    previewStartRefresh();
    isRefreshActive = true;
}

function stopRefresh() {
    previewStopRefresh();
    isRefreshActive = false;
}

function toggleRefresh() {
    if (isRefreshActive) {
        stopRefresh();
    } else {
        startRefresh();
    }
}

async function updateSvg() {
    stopRefresh();  // Stop auto-refresh
    await requestDraw({ forceRestart: true });   // Do a single draw
    refreshLayerSelectUI();
    updatePlotterStatus();
    logDebug('Manual SVG update triggered');
}

async function exportSvg() {
    const svg = container.querySelector('svg');
    if (!svg) {
        return;
    }

    try {
        const { drawings, drawingsReady } = await import('./drawings.js?v=' + Date.now());
        await drawingsReady;
        const currentConfig = drawings[select.value];
        const exportSvgElement = svg.cloneNode(true);
        const previewFilterId = svg.getAttribute('data-preview-filter');
        if (previewFilterId) {
            exportSvgElement.style.filter = '';
            exportSvgElement.removeAttribute('data-preview-filter');
            const defs = exportSvgElement.querySelector('defs');
            const previewFilter = defs?.querySelector(`#${previewFilterId}`);
            if (previewFilter) {
                previewFilter.remove();
            }
        }
        const svgData = new XMLSerializer().serializeToString(exportSvgElement);

        const paperForExport = state.lastRenderedPaper || state.currentPaper || currentConfig.paper;
        const hatchSettings = typeof getHatchSettings === 'function' ? getHatchSettings() : null;
        const colorUtilsModule = await loadColorUtilsModule();
        const mediumMetadata = colorUtilsModule?.mediumMetadata || {};
        const mediumInfo = state.currentMediumId ? mediumMetadata[state.currentMediumId] : null;
        const disabledColors = state.disabledColorsByMedium.get(state.currentMediumId);
        const exportConfig = {
            name: currentConfig.name,
            type: currentConfig.type,
            line: currentConfig.line,
            colorPalette: currentConfig.colorPalette,
            drawingData: currentConfig.drawingData,
            drawingControls: state.drawingControlValues[select.value] || {},
            hatch: hatchSettings,
            paperId: state.currentPaperId,
            paperMargin: state.currentMargin,
            paper: paperForExport ? { ...paperForExport, orientation: state.currentOrientation } : null,
            medium: {
                id: state.currentMediumId,
                metadata: mediumInfo || null,
                disabledColors: disabledColors ? Array.from(disabledColors) : []
            },
            maxTravelPerLayerMeters: state.maxTravelPerLayerMeters
        };

        const response = await fetch('http://localhost:8000/save-svg', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                name: select.value,
                svg: svgData,
                config: exportConfig
            })
        });
        
        const result = await response.json();
        if (result.status === 'success') {
            console.log(`SVG saved to ${result.filename}`);
            logDebug(`SVG saved to ${result.filename}`);
        }
    } catch (error) {
        console.error('Error saving SVG:', error);
        logDebug('Error saving SVG: ' + error.message, 'error');
    }
}

// Toggle debug panel visibility
function toggleDebugPanel() {
    const debugPanel = document.querySelector('.debug-panel');
    const toggleButton = document.getElementById('toggleDebug');
    debugPanel.classList.toggle('hidden');
    toggleButton.textContent = debugPanel.classList.contains('hidden') ? 'Show' : 'Hide';
}

// Populate paper select and initialize drawing
async function initialize() {
    try {
        const { loadPaperConfig } = await import('./paperConfig.js?v=' + Date.now());
        state.paperConfig = await loadPaperConfig();
        await loadPlotterSpecs();
        const paperSelect = document.getElementById('paperSelect');
        
        // Sort papers by name
        const papers = Object.entries(state.paperConfig.papers)
            .sort(([,a], [,b]) => a.name.localeCompare(b.name));
        
        // Populate dropdown
        papers.forEach(([id, paper]) => {
            const option = document.createElement('option');
            option.value = id;
            option.textContent = `${paper.name} (${paper.width}×${paper.height}mm)`;
            paperSelect.appendChild(option);
        });

        state.currentPaperId = state.paperConfig.default || papers[0]?.[0] || null;
        if (!state.currentPaperId && papers.length) {
            state.currentPaperId = papers[0][0];
        }
        if (state.currentPaperId && paperSelect.querySelector(`option[value="${state.currentPaperId}"]`)) {
            paperSelect.value = state.currentPaperId;
        } else if (papers.length) {
            paperSelect.selectedIndex = 0;
            state.currentPaperId = paperSelect.value;
        }
        state.currentPaper = state.currentPaperId ? state.paperConfig.papers[state.currentPaperId] : null;
        applyPaperTexture(state.currentPaper);
        state.currentMargin = marginUtils.clampMargin(state.currentPaper, state.currentMargin);
        updateMarginControls(state.currentPaper);
        const initialPaperColor = getPaperColor(state.currentPaper);
        applyPaperColor(initialPaperColor);
        applyPaperTexture(state.currentPaper);
        logPaperSelection(state.currentPaper);
        updatePaperDescription(state.currentPaper);
        updatePreviewProfile();
        state.warnIfPaperExceedsPlotter();

        const colorUtilsModule = await loadColorUtilsModule();
        const mediumOptions = populateMediumSelectOptions(colorUtilsModule.mediumMetadata);
        const savedMediumId = loadSavedMediumId();
        const defaultMediumId = savedMediumId
            || colorUtilsModule.defaultMediumId
            || mediumOptions[0]?.[0]
            || null;
        if (defaultMediumId && mediumSelect) {
            if (mediumSelect.querySelector(`option[value="${defaultMediumId}"]`)) {
                mediumSelect.value = defaultMediumId;
            }
            state.currentMediumId = mediumSelect.value || defaultMediumId;
            persistSelectedMedium(state.currentMediumId);
            await applyMediumSettings(state.currentMediumId, colorUtilsModule, { applyHatchDefaults: true });
            populateMediumColorSelect(state.currentMediumId, colorUtilsModule.mediumMetadata);
        } else if (!defaultMediumId) {
            logDebug('No mediums available from configuration', 'error');
        }

        const savedDrawingKey = loadSavedDrawingKey();
        const drawingsModule = await loadDrawingsModule();
        if (drawingsModule.drawingsReady) {
            await drawingsModule.drawingsReady;
        }
        const initialDrawingKey = savedDrawingKey
            || select?.value
            || select?.options?.[0]?.value
            || null;
        const resolvedDrawingKey = populateDrawingSelectOptions(drawingsModule.drawings, select, initialDrawingKey);
        const source = savedDrawingKey ? 'saved' : 'default';
        logDebug(`Startup drawing set to "${resolvedDrawingKey || 'none'}" (${source})`);

        if (resolvedDrawingKey && select) {
            persistSelectedDrawing(resolvedDrawingKey);
        } else {
            logDebug('No initial drawing could be resolved', 'warn');
        }

        await applyDrawingControlsState();
        await refreshDrawingControlsUI();
        isInitializing = false;
        await draw({ delayMs: 0, forceRestart: false });
        refreshLayerSelectUI();
        document.getElementById('layerSelect').value = 'all';
        updateLayerVisibility();
        updatePlotterStatus();
        logDebug('Initial draw complete. Auto-refresh is off.');
    } catch (error) {
        console.error('Initialization error:', error);
        logDebug('Error during initialization: ' + error.message, 'error');
    }
}

initialize();

// Handle drawing selection changes
select.addEventListener('change', async () => {
    await applyDrawingControlsState();
    await requestDraw({ forceRestart: true });
    await refreshDrawingControlsUI();
    refreshLayerSelectUI();
    // Set layer select to "all" when drawing changes
    document.getElementById('layerSelect').value = 'all';
    updateLayerVisibility();
    updatePlotterStatus();
    persistSelectedDrawing(select.value);
});

// Handle layer select interactions
document.getElementById('layerSelect').addEventListener('focus', () => {
    const wasRefreshing = isRefreshActive;
    stopRefresh();
    // Store state on the element
    document.getElementById('layerSelect').dataset.wasRefreshing = wasRefreshing;
});

document.getElementById('layerSelect').addEventListener('blur', () => {
    // Restore previous refresh state
    const wasRefreshing = document.getElementById('layerSelect').dataset.wasRefreshing === 'true';
    if (wasRefreshing) {
        startRefresh();
    }
});

document.getElementById('layerSelect').addEventListener('change', (e) => {
    updateLayerVisibility();
    updatePlotterStatus();  // Add this line to update plotter button states
    updateResumeButtonState();
    e.target.blur();
});
exportButton.addEventListener('click', exportSvg);
document.getElementById('updateSvg').addEventListener('click', updateSvg);
document.getElementById('toggleRefresh').addEventListener('click', toggleRefresh);
document.getElementById('toggleDebug').addEventListener('click', toggleDebugPanel);
document.getElementById('toggleOrientation').addEventListener('click', toggleOrientation);
document.getElementById('marginSlider').addEventListener('input', async (e) => {
    if (applyMarginValue(e.target.value)) {
        state.warnIfPaperExceedsPlotter();
        await requestDraw({ forceRestart: true });
    }
});

function setActiveControlPanel(targetId) {
    controlTabs.forEach(tab => {
        const isTarget = tab.dataset.target === targetId;
        tab.classList.toggle('active', isTarget);
    });
    controlPanels.forEach(panel => {
        panel.classList.toggle('active', panel.id === targetId);
    });
}

controlTabs.forEach(tab => {
    tab.addEventListener('click', () => {
        setActiveControlPanel(tab.dataset.target);
    });
});

// Ruler visibility toggle
document.getElementById('toggleRulers').addEventListener('click', () => {
    const button = document.getElementById('toggleRulers');
    const svg = container.querySelector('svg');
    const previewElements = svg?.querySelectorAll('.preview-only');
    if (previewElements?.length) {
        const currentlyVisible = previewElements[0].style.display !== 'none';
        previewElements.forEach(element => {
            element.style.display = currentlyVisible ? 'none' : '';
        });
        button.textContent = currentlyVisible ? 'Show Ruler' : 'Hide Ruler';
        logDebug(currentlyVisible ? 'Hidden ruler, margin, and plotter limit overlay' : 'Showing ruler, margin, and plotter limit overlay');
        state.rulersVisible = !currentlyVisible;
    }
});

// Pen rate lower slider
document.getElementById('penRateLower').addEventListener('input', (e) => {
    document.getElementById('penRateLowerValue').textContent = e.target.value;
});

// Plotter control functions
async function sendPlotterCommand(command, data = {}) {
    try {
        const response = await fetch('http://localhost:8000/plotter', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                command,
                ...data
            })
        });
        
        const result = await response.json();
        if (result.status === 'success') {
            logDebug(`Plotter command ${command} successful`);
            return true;
        } else {
            throw new Error(result.message || 'Unknown error');
        }
    } catch (error) {
        logDebug(`Plotter command ${command} failed: ${error.message}`, 'error');
        return false;
    }
}

function updatePlotterStatus(status) {
    // Get all control elements
    const plotButtons = document.querySelectorAll('.plotter-button');
    const stopButton = document.getElementById('plotterStopPlot');
    const plotLayerButton = document.getElementById('plotterPlotLayer');
    const layerSelect = document.getElementById('layerSelect');
    const previewControls = document.querySelectorAll('.preview-section button, .preview-section select');
    plotterIsRunning = status === 'Plotting';
    
    if (status === 'Plotting') {
        // During plotting, disable all controls except Stop Plot button
        plotButtons.forEach(button => {
            if (button !== stopButton) {
                button.disabled = true;
            }
        });
        // Ensure stop button is enabled
        stopButton.disabled = false;
        // Disable layer select
        layerSelect.disabled = true;
        // Disable all preview controls
        previewControls.forEach(control => {
            control.disabled = true;
        });
    } else {
        // When not plotting, restore normal control states
        plotButtons.forEach(button => {
            if (button === plotLayerButton) {
                // Plot Layer button is enabled only when a specific layer is selected
                button.disabled = layerSelect.value === 'all';
            } else {
                button.disabled = false;
            }
        });
        // Enable layer select
        layerSelect.disabled = false;
        // Enable all preview controls
        previewControls.forEach(control => {
            control.disabled = false;
        });
    }
    updateResumeButtonState();
}

initPlotterControls({
    container,
    logDebug,
    sendPlotterCommand,
    beginProgressListener,
    handlePlotReady,
    updatePlotterStatus,
    setPreviewControlsDisabled,
    refreshResumeStatus,
    clearResumeStatus: clearResumeStatusLocally
});

refreshResumeStatus({ silent: true });

// Mute button handler
document.getElementById('toggleMute').addEventListener('click', () => {
    const muted = toggleMute();
    const button = document.getElementById('toggleMute');
    const icon = button.querySelector('.speaker-icon');
    icon.textContent = muted ? '🔇' : '🔊';
    icon.style.textDecoration = muted ? 'line-through' : 'none';
    logDebug(`Sound ${muted ? 'muted' : 'unmuted'}`);
});

// Pen position sliders
document.getElementById('penPosDown').addEventListener('input', (e) => {
    const downValue = parseInt(e.target.value);
    const upValue = parseInt(document.getElementById('penPosUp').value);
    
    // Ensure down position is less than up position
    if (downValue >= upValue) {
        e.target.value = upValue - 1;
        document.getElementById('penPosDownValue').textContent = upValue - 1;
    } else {
        document.getElementById('penPosDownValue').textContent = downValue;
    }
});

document.getElementById('penPosUp').addEventListener('input', (e) => {
    const upValue = parseInt(e.target.value);
    const downValue = parseInt(document.getElementById('penPosDown').value);
    
    // Ensure up position is greater than down position
    if (upValue <= downValue) {
        e.target.value = downValue + 1;
        document.getElementById('penPosUpValue').textContent = downValue + 1;
    } else {
        document.getElementById('penPosUpValue').textContent = upValue;
    }
});

if (maxTravelSlider) {
    maxTravelSlider.addEventListener('input', (event) => {
        applyMaxTravelLimit(event.target.value, { silent: true });
    });
    maxTravelSlider.addEventListener('change', async (event) => {
        const updated = applyMaxTravelLimit(event.target.value);
        if (!updated) {
            return;
        }
        await requestDraw({ forceRestart: true });
        refreshLayerSelectUI();
        if (state.maxTravelPerLayerMeters === null) {
            logDebug('Layer travel limit disabled; layers will no longer auto-split.');
        } else {
            logDebug(`Layers will now split once travel exceeds ${formatTravelMeters(state.maxTravelPerLayerMeters)}`);
        }
    });
}

if (previewZoomSlider) {
    previewZoomSlider.addEventListener('input', (event) => {
        applyPreviewZoom(Number(event.target.value));
    });
}

if (previewCenterButton) {
    previewCenterButton.addEventListener('click', () => {
        resetPreviewPan();
    });
}

if (previewResetButton) {
    previewResetButton.addEventListener('click', () => {
        resetPreviewPan();
        applyPreviewZoom(100);
    });
}

if (previewFitButton) {
    previewFitButton.addEventListener('click', () => {
        resetPreviewPan();
        const canvasArea = document.querySelector('.canvas-area');
        const containerRect = canvasArea?.getBoundingClientRect?.();
        const svg = container?.querySelector?.('svg');
        if (!svg || !containerRect?.width || !containerRect?.height) {
            applyPreviewZoom(100);
            return;
        }
        const svgRect = svg.getBoundingClientRect();
        const currentPercent = Math.max(10, Math.min(1000, state.previewZoomPercent));
        const zoomBarHeight = previewZoomBar?.offsetHeight ?? 0;
        const availableWidth = Math.max(50, containerRect.width);
        const availableHeight = Math.max(50, containerRect.height - zoomBarHeight);
        const scaleFactor = Math.min(availableWidth / svgRect.width, availableHeight / svgRect.height);
        const targetPercent = Math.max(10, Math.min(1000, Math.floor(currentPercent * scaleFactor)));
        applyPreviewZoom(targetPercent);
    });
}

if (previewContainer) {
    previewContainer.addEventListener('mousedown', (event) => {
        if (event.button !== 0) {
            return;
        }
        state.isPanning = true;
        previewContainer.classList.add('panning');
        state.panStart = {
            x: event.clientX - state.previewPan.x,
            y: event.clientY - state.previewPan.y
        };
    });

    previewContainer.addEventListener('mousemove', (event) => {
        if (!state.isPanning) {
            return;
        }
        const scale = state.previewZoomPercent / 100;
        const nextX = (event.clientX - state.panStart.x);
        const nextY = (event.clientY - state.panStart.y);
        state.previewPan = {
            x: nextX,
            y: nextY
        };
        applyPreviewTransform(scale);
    });

    const stopPan = () => {
        state.isPanning = false;
        previewContainer.classList.remove('panning');
    };

    previewContainer.addEventListener('mouseup', stopPan);
    previewContainer.addEventListener('mouseleave', stopPan);

    previewContainer.addEventListener('wheel', (event) => {
        const isZoomGesture = event.ctrlKey || Math.abs(event.deltaY) > Math.abs(event.deltaX);
        if (!isZoomGesture) {
            return;
        }
        event.preventDefault();
        const delta = event.deltaY;
        const step = delta < 0 ? 10 : -10;
        applyPreviewZoom(state.previewZoomPercent + step);
    }, { passive: false });
}

// Paper size selection handler
document.getElementById('paperSelect').addEventListener('change', async (e) => {
    if (!state.paperConfig) {
        logDebug('Paper configuration not loaded yet', 'error');
        return;
    }
    state.currentPaperId = e.target.value;
    state.currentPaper = state.paperConfig.papers[state.currentPaperId];
    if (!state.currentPaper) {
        logDebug(`Paper ${state.currentPaperId} not found in configuration`, 'error');
        return;
    }
    applyPaperTexture(state.currentPaper);
    state.currentMargin = marginUtils.clampMargin(state.currentPaper, state.currentMargin);
    updateMarginControls(state.currentPaper);
    const defaultColor = getPaperColor(state.currentPaper);
    applyPaperColor(defaultColor);
    logDebug(`Paper colour reset to ${defaultColor}`);
    logDebug(`Changing paper size to ${state.currentPaper.name} (${state.currentPaper.width}×${state.currentPaper.height}mm)`);
    logPaperSelection(state.currentPaper);
    updatePaperDescription(state.currentPaper);
    updatePreviewProfile();
    updatePlotterDefaults();
    state.warnIfPaperExceedsPlotter();
    await requestDraw({ forceRestart: true });
});

// Medium selection handler
if (mediumSelect) {
    mediumSelect.addEventListener('change', async (e) => {
        const medium = e.target.value;
        state.currentMediumId = medium;
        persistSelectedMedium(medium);
        logDebug(`Changing medium to ${medium}`);
        const colorUtilsModule = await loadColorUtilsModule();
        await applyMediumSettings(medium, colorUtilsModule, { applyHatchDefaults: true });
        populateMediumColorSelect(medium, colorUtilsModule.mediumMetadata);
        await requestDraw({ forceRestart: true });
        refreshLayerSelectUI();
        logDebug(`Updated drawings with ${medium} settings`);
    });
}

if (mediumColorList) {
    mediumColorList.addEventListener('change', async (event) => {
        const target = event.target;
        if (!target || target.type !== 'checkbox') {
            return;
        }
        if (mediumColorList.dataset.disabled === 'true') {
            target.checked = false;
            return;
        }
        const mediumId = state.currentMediumId;
        if (!mediumId) {
            target.checked = false;
            return;
        }
        const selectedIds = Array.from(
            mediumColorList.querySelectorAll('input[type="checkbox"]:checked')
        ).map(input => input.value);
        const colorUtilsModule = await loadColorUtilsModule();
        const mediumInfo = colorUtilsModule.mediumMetadata[mediumId];
        const totalColors = Object.keys(mediumInfo?.colors || {}).length;
        if (totalColors > 0 && selectedIds.length === totalColors) {
            logDebug('At least one color must remain enabled for the selected medium', 'error');
            syncMediumColorSelections(mediumId);
            return;
        }
        if (selectedIds.length > 0) {
            state.disabledColorsByMedium.set(mediumId, new Set(selectedIds));
        } else {
            state.disabledColorsByMedium.delete(mediumId);
        }
        persistDisabledColorsToStorage();
        await applyMediumSettings(mediumId, colorUtilsModule, { applyHatchDefaults: false });
        await requestDraw({ forceRestart: true });
        refreshLayerSelectUI();
        logDebug(`Updated disabled colors for ${mediumInfo?.name || mediumId}`);
    });
}

function applyHatchDefaults(defaults = {}) {
    if (!defaults) {
        return;
    }
    if (typeof defaults.spacing === 'number' && hatchSpacingControl) {
        const min = Number(hatchSpacingControl.min) || 0;
        const max = Number(hatchSpacingControl.max) || 10;
        const clamped = Math.min(max, Math.max(min, defaults.spacing));
        hatchSpacingControl.value = String(clamped);
        hatchSpacingControl.dispatchEvent(new Event('input', { bubbles: true }));
    }
    if (typeof defaults.inset === 'number' && hatchInsetControl) {
        const min = Number(hatchInsetControl.min) || 0;
        const max = Number(hatchInsetControl.max) || 10;
        const clamped = Math.min(max, Math.max(min, defaults.inset));
        hatchInsetControl.value = String(clamped);
        hatchInsetControl.dispatchEvent(new Event('input', { bubbles: true }));
    }
    if (typeof defaults.includeBoundary === 'boolean' && hatchBoundaryControl) {
        hatchBoundaryControl.checked = defaults.includeBoundary;
        hatchBoundaryControl.dispatchEvent(new Event('change', { bubbles: true }));
    }
}

function clampPenValue(value) {
    const numeric = Number(value);
    if (!Number.isFinite(numeric)) {
        return null;
    }
    return Math.min(100, Math.max(0, Math.round(numeric)));
}

function applyPenDefaults(defaults = {}) {
    const downInput = document.getElementById('penPosDown');
    const upInput = document.getElementById('penPosUp');
    const downLabel = document.getElementById('penPosDownValue');
    const upLabel = document.getElementById('penPosUpValue');
    const penRateInput = document.getElementById('penRateLower');
    const penRateLabel = document.getElementById('penRateLowerValue');

    if (downInput && downLabel && typeof defaults.penPosDown === 'number') {
        const downValue = clampPenValue(defaults.penPosDown);
        if (downValue !== null) {
            downInput.value = String(downValue);
            downLabel.textContent = downValue;
        }
    }

    if (upInput && upLabel && typeof defaults.penPosUp === 'number') {
        let upValue = clampPenValue(defaults.penPosUp);
        const currentDown = clampPenValue(document.getElementById('penPosDown')?.value) ?? 0;
        if (upValue !== null) {
            if (upValue <= currentDown) {
                upValue = Math.min(100, currentDown + 1);
            }
            upInput.value = String(upValue);
            upLabel.textContent = upValue;
        }
    }

    if (penRateInput && penRateLabel && typeof defaults.penRateLower === 'number') {
        const rateValue = clampPenValue(defaults.penRateLower);
        if (rateValue !== null) {
            penRateInput.value = String(rateValue);
            penRateLabel.textContent = rateValue;
        }
    }
}

async function applyMediumSettings(mediumId, colorUtilsModule, options = {}) {
    if (!mediumId) {
        return;
    }
    const { colorPalettes, mediumMetadata } = colorUtilsModule || await loadColorUtilsModule();
    const paletteName = `${mediumId}Palette`;
    const palette = colorPalettes[paletteName];
    const disabledSet = state.disabledColorsByMedium.get(mediumId);
    const filteredPalette = filterPaletteByDisabledColors(palette, disabledSet);
    if (filteredPalette) {
        state.currentPalette = filteredPalette;
    }
    const mediumInfo = mediumMetadata[mediumId];
    if (mediumInfo?.strokeWidth) {
        state.currentStrokeWidth = mediumInfo.strokeWidth;
        state.currentLineCap = mediumInfo.strokeLinecap || 'round';
        state.currentLineJoin = mediumInfo.strokeLinejoin || 'round';
        logDebug(`Applied stroke width ${mediumInfo.strokeWidth}mm for ${mediumInfo.name}`);
    } else {
        state.currentStrokeWidth = null;
        state.currentLineCap = 'round';
        state.currentLineJoin = 'round';
    }
    state.currentMediumId = mediumId;
    updatePreviewProfile();
    updatePlotterDefaults();
    if (options.applyHatchDefaults && mediumInfo?.hatchDefaults) {
        applyHatchDefaults(mediumInfo.hatchDefaults);
    }
    if (options.applyPenDefaults && mediumInfo?.penDefaults) {
        applyPenDefaults(mediumInfo.penDefaults);
    }
}
