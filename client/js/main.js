import { logDebug, initLogTabs } from './modules/logger.js';
import { playCompletionSiren, toggleMute } from './modules/audio.js';
import { startProgressListener, stopProgressListener } from './modules/progress.js';
import { createPreviewController } from './modules/preview.js';
import { initPlotterControls } from './modules/plotterControls.js';
import { resolvePreviewProfile, evaluatePreviewWarnings, resolvePlotterDefaults } from './utils/paperProfile.js';
import { normalizePaperColor, getPaperColor, getPaperTextureClass, computePlotterWarning, getOrientedDimensions } from './utils/paperUtils.js';
import { filterPaletteByDisabledColors, loadDisabledColorPrefs, saveDisabledColorPrefs } from './utils/paletteUtils.js';

window.logDebug = logDebug;
initLogTabs();
const PREVIEW_CONTROL_SELECTOR = '.preview-section button, .preview-section select';

function setPreviewControlsDisabled(disabled) {
    document.querySelectorAll(PREVIEW_CONTROL_SELECTOR).forEach(control => {
        control.disabled = disabled;
    });
}

function handlePlotReady(result) {
    stopProgressListener();
    updatePlotterStatus('Ready', true);
    setPreviewControlsDisabled(false);
    if (result === 'error') {
        logDebug('Plot reported an error', 'error');
    }
}

function beginProgressListener() {
    setPreviewControlsDisabled(true);
    startProgressListener({
        logDebug,
        onPlotReady: handlePlotReady,
        playCompletionSiren
    });
}
const marginUtils = await import('./utils/marginUtils.js?v=' + Date.now());
const { DEFAULT_MARGIN } = marginUtils;
const DEFAULT_PAPER_COLOR = '#ffffff';
const CONTROL_STORAGE_KEY = 'drawingControlValues';
const DRAWING_STORAGE_KEY = 'selectedDrawingKey';
const HATCH_STORAGE_KEY = 'globalHatchSettings';

const select = document.getElementById('drawingSelect');
const container = document.getElementById('svgContainer');
const exportButton = document.getElementById('exportSvg');
const mediumSelect = document.getElementById('mediumSelect');
const mediumColorSelect = document.getElementById('mediumColorSelect');
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

const defaultHatchSettings = {
    hatchStyle: 'serpentine',
    hatchSpacing: 2,
    hatchInset: 1,
    includeBoundary: true
};

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
    hatchSettings: loadHatchSettings(),
    previewProfile: null,
    plotterSpecs: null,
    warnIfPaperExceedsPlotter: null,
    disabledColorsByMedium: loadDisabledColorPrefs()
};

state.warnIfPaperExceedsPlotter = () => warnIfPaperExceedsPlotter(state, state.currentPaper);

const previewController = createPreviewController({
    container,
    select,
    logDebug,
    marginUtils,
    state
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

function loadHatchSettings() {
    if (typeof window === 'undefined' || !window.localStorage) {
        return { ...defaultHatchSettings };
    }
    try {
        const raw = window.localStorage.getItem(HATCH_STORAGE_KEY);
        const parsed = raw ? JSON.parse(raw) : null;
        return { ...defaultHatchSettings, ...(parsed || {}) };
    } catch {
        return { ...defaultHatchSettings };
    }
}

function persistHatchSettings() {
    if (typeof window === 'undefined' || !window.localStorage) {
        return;
    }
    try {
        window.localStorage.setItem(HATCH_STORAGE_KEY, JSON.stringify(state.hatchSettings));
    } catch {
        // ignore
    }
}

function applyHatchSettingsToConfig(drawingConfig) {
    if (!drawingConfig) {
        return;
    }
    drawingConfig.line = drawingConfig.line || {};
    drawingConfig.line.hatchStyle = state.hatchSettings.hatchStyle;
    drawingConfig.line.hatchInset = state.hatchSettings.hatchInset;
    drawingConfig.line.includeBoundary = state.hatchSettings.includeBoundary;
    if (typeof state.hatchSettings.hatchSpacing === 'number' && !Number.isNaN(state.hatchSettings.hatchSpacing)) {
        drawingConfig.line.spacing = state.hatchSettings.hatchSpacing;
    }
}

async function handleHatchSettingsChanged() {
    persistHatchSettings();
    const context = await getDrawingControlContext();
    if (context) {
        applyHatchSettingsToConfig(context.drawingConfig);
    }
    await draw();
    populateLayerSelect();
    updatePlotterStatus();
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
    if (!mediumColorSelect) {
        return;
    }
    mediumColorSelect.innerHTML = '';
    const mediumInfo = mediumMetadata[mediumId];
    if (!mediumInfo?.colors) {
        mediumColorSelect.disabled = true;
        return;
    }
    const disabledSet = state.disabledColorsByMedium.get(mediumId) || new Set();
    const entries = Object.entries(mediumInfo.colors)
        .sort(([, a], [, b]) => a.name.localeCompare(b.name));
    entries.forEach(([colorId, color]) => {
        const option = document.createElement('option');
        option.value = colorId;
        option.textContent = color.name;
        option.selected = disabledSet.has(colorId);
        mediumColorSelect.appendChild(option);
    });
    mediumColorSelect.disabled = false;
}

if (hatchStyleControl) {
    hatchStyleControl.value = state.hatchSettings.hatchStyle;
    hatchStyleControl.addEventListener('change', async (event) => {
        state.hatchSettings.hatchStyle = event.target.value;
        await handleHatchSettingsChanged();
    });
}

if (hatchSpacingControl) {
    const initialSpacing = Number(state.hatchSettings.hatchSpacing) || 0;
    hatchSpacingControl.value = initialSpacing;
    if (hatchSpacingValueLabel) {
        hatchSpacingValueLabel.textContent = `${initialSpacing.toFixed(1)} mm`;
    }
    hatchSpacingControl.addEventListener('input', async (event) => {
        const nextValue = Number(event.target.value);
        state.hatchSettings.hatchSpacing = nextValue;
        if (hatchSpacingValueLabel) {
            hatchSpacingValueLabel.textContent = `${nextValue.toFixed(1)} mm`;
        }
        await handleHatchSettingsChanged();
    });
}

if (hatchInsetControl) {
    const initialInset = Number(state.hatchSettings.hatchInset) || 0;
    hatchInsetControl.value = initialInset;
    if (hatchInsetValueLabel) {
        hatchInsetValueLabel.textContent = `${initialInset.toFixed(1)} mm`;
    }
    hatchInsetControl.addEventListener('input', async (event) => {
        const nextValue = Number(event.target.value);
        state.hatchSettings.hatchInset = nextValue;
        if (hatchInsetValueLabel) {
            hatchInsetValueLabel.textContent = `${nextValue.toFixed(1)} mm`;
        }
        await handleHatchSettingsChanged();
    });
}

if (hatchBoundaryControl) {
    hatchBoundaryControl.checked = state.hatchSettings.includeBoundary;
    hatchBoundaryControl.addEventListener('change', async (event) => {
        state.hatchSettings.includeBoundary = event.target.checked;
        await handleHatchSettingsChanged();
    });
}

function syncMediumColorSelections(mediumId) {
    if (!mediumColorSelect) {
        return;
    }
    const disabledSet = state.disabledColorsByMedium.get(mediumId) || new Set();
    Array.from(mediumColorSelect.options).forEach(option => {
        option.selected = disabledSet.has(option.value);
    });
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
    const orientation = state.currentOrientation;
    const margin = Number(state.currentMargin) || 0;
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
    return rawValue;
}

function formatControlValue(value, control) {
    if (control?.valueType === 'boolean') {
        return value ? 'On' : 'Off';
    }
    const parsed = Number(value);
    if (Number.isFinite(parsed)) {
        const precision = control?.displayPrecision ?? 2;
        return parsed
            .toFixed(precision)
            .replace(/\.?0+$/, '')
            .replace(/\.$/, '');
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
        await draw();
        populateLayerSelect();
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
    valueDisplay.textContent = formatControlValue(value, control);
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
    await draw();
    populateLayerSelect();
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
    const slider = document.getElementById('penRateLower');
    const valueLabel = document.getElementById('penRateLowerValue');
    if (!slider || !valueLabel) {
        return;
    }
    const { penRateLower } = resolvePlotterDefaults({
        paper: state.currentPaper,
        mediumId: state.currentMediumId
    }) || {};
    if (typeof penRateLower !== 'number') {
        return;
    }
    slider.value = penRateLower;
    valueLabel.textContent = penRateLower;
    logDebug(`Pen Rate Lower auto-set to ${penRateLower} for ${state.currentPaper.name}`);
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
    await draw();   // Do a single draw
    populateLayerSelect();
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
        const exportConfig = {
            name: currentConfig.name,
            type: currentConfig.type,
            line: currentConfig.line,
            colorPalette: currentConfig.colorPalette,
            drawingData: currentConfig.drawingData,
            paper: paperForExport ? { ...paperForExport, orientation: state.currentOrientation } : null,
            medium: state.currentMediumId
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
        const defaultMediumId = colorUtilsModule.defaultMediumId || mediumOptions[0]?.[0] || null;
        if (defaultMediumId && mediumSelect) {
            mediumSelect.value = defaultMediumId;
            state.currentMediumId = defaultMediumId;
            await applyMediumSettings(defaultMediumId, colorUtilsModule);
            populateMediumColorSelect(defaultMediumId, colorUtilsModule.mediumMetadata);
        } else if (!defaultMediumId) {
            logDebug('No mediums available from configuration', 'error');
        }

        // Draw once but don't start refresh
        await applyDrawingControlsState();
        await draw();
        await refreshDrawingControlsUI();
        const savedDrawingKey = loadSavedDrawingKey();
        if (savedDrawingKey && select?.querySelector(`option[value="${savedDrawingKey}"]`)) {
            select.value = savedDrawingKey;
            persistSelectedDrawing(savedDrawingKey);
            await applyDrawingControlsState();
            await draw();
            await refreshDrawingControlsUI();
            populateLayerSelect();
            document.getElementById('layerSelect').value = 'all';
            updateLayerVisibility();
            updatePlotterStatus();
        }
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
    await draw();
    await refreshDrawingControlsUI();
    populateLayerSelect();
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
        await draw();
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

function updatePlotterStatus(status, isConnected = false) {
    // Get all control elements
    const plotButtons = document.querySelectorAll('.plotter-button');
    const stopButton = document.getElementById('plotterStopPlot');
    const plotLayerButton = document.getElementById('plotterPlotLayer');
    const layerSelect = document.getElementById('layerSelect');
    const previewControls = document.querySelectorAll('.preview-section button, .preview-section select');
    
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
}

initPlotterControls({
    container,
    logDebug,
    sendPlotterCommand,
    beginProgressListener,
    handlePlotReady,
    updatePlotterStatus,
    setPreviewControlsDisabled
});

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
    await draw();
});

// Medium selection handler
if (mediumSelect) {
    mediumSelect.addEventListener('change', async (e) => {
        const medium = e.target.value;
        state.currentMediumId = medium;
        logDebug(`Changing medium to ${medium}`);
        const colorUtilsModule = await loadColorUtilsModule();
        await applyMediumSettings(medium, colorUtilsModule);
        populateMediumColorSelect(medium, colorUtilsModule.mediumMetadata);
        await draw();
        populateLayerSelect();
        logDebug(`Updated drawings with ${medium} settings`);
    });
}

if (mediumColorSelect) {
    mediumColorSelect.addEventListener('change', async () => {
        const mediumId = state.currentMediumId;
        if (!mediumId) {
            return;
        }
        const selectedIds = Array.from(mediumColorSelect.selectedOptions).map(option => option.value);
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
        await applyMediumSettings(mediumId, colorUtilsModule);
        await draw();
        populateLayerSelect();
        logDebug(`Updated disabled colors for ${mediumInfo?.name || mediumId}`);
    });
}

async function applyMediumSettings(mediumId, colorUtilsModule) {
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
}
