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

const select = document.getElementById('drawingSelect');
const container = document.getElementById('svgContainer');
const exportButton = document.getElementById('exportSvg');
const mediumStrokeInput = document.getElementById('mediumStrokeInput');
const mediumSelect = document.getElementById('mediumSelect');

const state = {
    paperConfig: null,
    currentPaperId: null,
    currentPaper: null,
    currentOrientation: 'landscape',
    currentMargin: DEFAULT_MARGIN,
    lastRenderedPaper: null,
    currentMediumId: null,
    currentPalette: null,
    currentStrokeWidth: null,
    currentLineCap: 'round',
    currentLineJoin: 'round',
    rulersVisible: false
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

function loadColorUtilsModule() {
    if (!colorUtilsModulePromise) {
        colorUtilsModulePromise = import('./utils/colorUtils.js?v=' + Date.now());
    }
    return colorUtilsModulePromise;
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
        await draw();
        logDebug('Initial draw complete. Auto-refresh is off.');
    } catch (error) {
        console.error('Initialization error:', error);
        logDebug('Error during initialization: ' + error.message, 'error');
    }
}

initialize();

// Handle drawing selection changes
select.addEventListener('change', async () => {
    await draw();
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
    logDebug(`Changing paper size to ${state.currentPaper.name} (${state.currentPaper.width}×${state.currentPaper.height}mm)`);
    await draw();
});

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
