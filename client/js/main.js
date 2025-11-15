import { logDebug, initLogTabs } from './modules/logger.js';
import { playCompletionSiren, toggleMute } from './modules/audio.js';
import { startProgressListener, stopProgressListener } from './modules/progress.js';
import { createPreviewController } from './modules/preview.js';
import { initPlotterControls } from './modules/plotterControls.js';

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

const select = document.getElementById('drawingSelect');
const container = document.getElementById('svgContainer');
const exportButton = document.getElementById('exportSvg');
const mediumStrokeInput = document.getElementById('mediumStrokeInput');
const mediumSelect = document.getElementById('mediumSelect');
const drawingControlsContainer = document.getElementById('drawingControlsContainer');
const paperColorInput = document.getElementById('paperColorInput');
const resetPaperColorButton = document.getElementById('resetPaperColor');
const controlTabs = document.querySelectorAll('.control-tab');
const controlPanels = document.querySelectorAll('.control-panel');

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
    drawingControlValues: {}
};

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
const HEX_COLOR_PATTERN = /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/;

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

function normalizePaperColor(color) {
    if (typeof color !== 'string') {
        return DEFAULT_PAPER_COLOR;
    }
    const trimmed = color.trim();
    const match = HEX_COLOR_PATTERN.exec(trimmed);
    if (!match) {
        return DEFAULT_PAPER_COLOR;
    }
    const hex = match[1];
    if (hex.length === 3) {
        return '#' + hex.split('').map(ch => `${ch}${ch}`).join('').toLowerCase();
    }
    return `#${hex.toLowerCase()}`;
}

function getPaperColor(paper) {
    if (!paper) {
        return DEFAULT_PAPER_COLOR;
    }
    return normalizePaperColor(paper.previewColor || paper.color || DEFAULT_PAPER_COLOR);
}

function applyPaperColor(color) {
    const normalized = normalizePaperColor(color);
    state.currentPaperColor = normalized;
    if (paperColorInput && paperColorInput.value !== normalized) {
        paperColorInput.value = normalized;
    }
    const svg = container.querySelector('svg');
    if (svg) {
        svg.style.backgroundColor = normalized;
    }
    if (state.lastRenderedPaper) {
        state.lastRenderedPaper.color = normalized;
    }
    return normalized;
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
        const parsed = Number(rawValue);
        return Number.isNaN(parsed) ? 0 : parsed;
    }
    return rawValue;
}

function formatControlValue(value, control) {
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
        return saved[control.id];
    }
    const current = getNestedValue(drawingConfig, control.target);
    if (typeof current !== 'undefined') {
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
        inputElement.type = control.inputType || 'number';
        if (typeof control.min !== 'undefined') inputElement.min = control.min;
        if (typeof control.max !== 'undefined') inputElement.max = control.max;
        if (typeof control.step !== 'undefined') inputElement.step = control.step;
        inputElement.value = value;
        const eventName = control.inputType === 'range' ? 'input' : 'change';
        inputElement.addEventListener(eventName, async (event) => {
            valueDisplay.textContent = formatControlValue(event.target.value, control);
            await onChange(event.target.value);
        });
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
    await draw();
    populateLayerSelect();
    updatePlotterStatus();
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
        const svgData = new XMLSerializer().serializeToString(svg);

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
        state.currentMargin = marginUtils.clampMargin(state.currentPaper, state.currentMargin);
        updateMarginControls(state.currentPaper);
        const initialPaperColor = getPaperColor(state.currentPaper);
        applyPaperColor(initialPaperColor);

        const colorUtilsModule = await loadColorUtilsModule();
        const mediumOptions = populateMediumSelectOptions(colorUtilsModule.mediumMetadata);
        const defaultMediumId = colorUtilsModule.defaultMediumId || mediumOptions[0]?.[0] || null;
        if (defaultMediumId && mediumSelect) {
            mediumSelect.value = defaultMediumId;
            state.currentMediumId = defaultMediumId;
            await applyMediumSettings(defaultMediumId, colorUtilsModule);
        } else if (!defaultMediumId) {
            logDebug('No mediums available from configuration', 'error');
        }

        // Draw once but don't start refresh
        await applyDrawingControlsState();
        await draw();
        await refreshDrawingControlsUI();
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
        await draw();
    }
});
document.getElementById('marginInput').addEventListener('change', async (e) => {
    if (applyMarginValue(e.target.value)) {
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
    const rulerGroup = svg.querySelector('g.preview-only');
    const marginRect = svg.querySelector('rect.preview-only');
    
    if (rulerGroup && marginRect) {
        const currentlyVisible = rulerGroup.style.display !== 'none';
        if (!currentlyVisible) {
            rulerGroup.style.display = '';
            marginRect.style.display = '';
            button.textContent = 'Hide Ruler';
            logDebug('Showing ruler and margin');
        } else {
            rulerGroup.style.display = 'none';
            marginRect.style.display = 'none';
            button.textContent = 'Show Ruler';
            logDebug('Hidden ruler and margin');
        }
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
    state.currentMargin = marginUtils.clampMargin(state.currentPaper, state.currentMargin);
    updateMarginControls(state.currentPaper);
    const defaultColor = getPaperColor(state.currentPaper);
    applyPaperColor(defaultColor);
    logDebug(`Paper colour reset to ${defaultColor}`);
    logDebug(`Changing paper size to ${state.currentPaper.name} (${state.currentPaper.width}×${state.currentPaper.height}mm)`);
    await draw();
});

if (paperColorInput) {
    paperColorInput.addEventListener('input', (e) => {
        const normalized = applyPaperColor(e.target.value);
        logDebug(`Preview paper colour set to ${normalized}`);
    });
}

if (resetPaperColorButton) {
    resetPaperColorButton.addEventListener('click', () => {
        const defaultColor = getPaperColor(state.currentPaper);
        const normalized = applyPaperColor(defaultColor);
        logDebug(`Paper colour reset to ${normalized}`);
    });
}

// Medium selection handler
if (mediumSelect) {
    mediumSelect.addEventListener('change', async (e) => {
        const medium = e.target.value;
        logDebug(`Changing medium to ${medium}`);
        const colorUtilsModule = await loadColorUtilsModule();
        await applyMediumSettings(medium, colorUtilsModule);
        await draw();
        populateLayerSelect();
        logDebug(`Updated drawings with ${medium} settings`);
    });
}

async function applyMediumSettings(mediumId, colorUtilsModule) {
    if (!mediumId) {
        return;
    }
    const { colorPalettes, mediumMetadata } = colorUtilsModule || await loadColorUtilsModule();
    const paletteName = `${mediumId}Palette`;
    const palette = colorPalettes[paletteName];
    if (palette) {
        state.currentPalette = palette;
    }
    const mediumInfo = mediumMetadata[mediumId];
    if (mediumInfo?.strokeWidth) {
        state.currentStrokeWidth = mediumInfo.strokeWidth;
        state.currentLineCap = mediumInfo.strokeLinecap || 'round';
        state.currentLineJoin = mediumInfo.strokeLinejoin || 'round';
        logDebug(`Applied stroke width ${mediumInfo.strokeWidth}mm for ${mediumInfo.name}`);
        if (mediumStrokeInput) {
            mediumStrokeInput.value = mediumInfo.strokeWidth;
        }
    } else {
        state.currentStrokeWidth = null;
        state.currentLineCap = 'round';
        state.currentLineJoin = 'round';
        if (mediumStrokeInput) {
            mediumStrokeInput.value = '';
        }
    }
    state.currentMediumId = mediumId;
}
