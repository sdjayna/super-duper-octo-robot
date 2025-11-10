let progressEventSource = null;

// Audio state
let isMuted = false;
const audioContext = new (window.AudioContext || window.webkitAudioContext)();

function playCompletionSiren() {
    if (isMuted) return;
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();
    
    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);
    
    // Set constant volume
    gainNode.gain.setValueAtTime(0.6, audioContext.currentTime);
    
    // Simple oscillation between frequencies over 3 seconds
    const duration = 3.0;
    const steps = 6;  // Fewer steps for shorter duration
    const stepTime = duration / steps;
    
    for (let i = 0; i < steps; i++) {
        const freq = i % 2 === 0 ? 440 : 880;
        oscillator.frequency.setValueAtTime(freq, audioContext.currentTime + (i * stepTime));
    }
    
    oscillator.start();
    oscillator.stop(audioContext.currentTime + duration);
}

function startProgressListener() {
    if (progressEventSource) {
        progressEventSource.close();
    }
    
    logDebug('Starting progress listener...');
    progressEventSource = new EventSource('http://localhost:8000/plot-progress');
    
    progressEventSource.onmessage = function(event) {
        try {
            console.log('SSE message received:', event.data);  // Debug log
            const data = JSON.parse(event.data);
            if (data.progress) {
                if (data.progress === 'PLOT_COMPLETE') {
                    // Special message to re-enable controls
                    updatePlotterStatus('Ready', true);
                    // Re-enable all preview controls
                    document.querySelectorAll('.preview-section button, .preview-section select').forEach(control => {
                        control.disabled = false;
                    });
                    // Play completion siren
                    playCompletionSiren();
                    // Close SSE connection as plot is complete
                    if (progressEventSource) {
                        progressEventSource.close();
                        progressEventSource = null;
                    }
                } else if (data.progress === 'PLOT_ERROR') {
                    // Handle plot errors
                    updatePlotterStatus('Ready', true);
                    // Re-enable all preview controls
                    document.querySelectorAll('.preview-section button, .preview-section select').forEach(control => {
                        control.disabled = false;
                    });
                    // Close SSE connection as plot has errored
                    if (progressEventSource) {
                        progressEventSource.close();
                        progressEventSource = null;
                    }
                } else {
                    // Check if the message contains an error
                    if (data.progress.toLowerCase().includes('error')) {
                        logDebug(data.progress, 'error');
                    } else {
                        logDebug(data.progress, 'info');
                    }
                }
            }
        } catch (error) {
            console.error('SSE parse error:', error);  // Debug log
            logDebug(`Error parsing progress data: ${error}`, 'error');
        }
    };
    
    progressEventSource.onerror = function(error) {
        console.error('SSE error:', error);  // Debug log
        logDebug('Progress listener error, reconnecting...', 'error');
        if (progressEventSource) {
            progressEventSource.close();
            progressEventSource = null;
        }
        // Attempt to reconnect after a short delay
        setTimeout(startProgressListener, 1000);
    };

    progressEventSource.onopen = function() {
        console.log('SSE connection opened');  // Debug log
        logDebug('Progress listener connected');
    };
}

// Make logDebug available globally
window.logDebug = function(message, type = 'info') {
    const debugLog = document.getElementById('debugLog');
    
    // Remove bold from previous last message if it exists
    const previousLastEntry = debugLog.lastElementChild;
    if (previousLastEntry) {
        previousLastEntry.style.fontWeight = 'normal';
    }
    
    const entry = document.createElement('div');
    entry.className = `debug-entry debug-${type}`;
    entry.dataset.isPlot = message.startsWith('Plotting') ? 'true' : 'false';
    entry.textContent = `[${new Date().toLocaleTimeString()}] ${message}`;
    entry.style.fontWeight = 'bold';  // Make new entry bold
    console.log(entry);
    debugLog.appendChild(entry);
    debugLog.scrollTop = debugLog.scrollHeight;
    
    // Keep only last 100 messages
    while (debugLog.children.length > 100) {
        debugLog.removeChild(debugLog.firstChild);
    }

    // Update visibility based on current tab
    const activeTab = document.querySelector('.tab-button.active').dataset.tab;
    if (activeTab === 'plots' && !message.startsWith('Plotting')) {
        entry.style.display = 'none';
    }
}

// Add tab switching functionality
document.addEventListener('DOMContentLoaded', function() {
    const tabButtons = document.querySelectorAll('.tab-button');
    
    tabButtons.forEach(button => {
        button.addEventListener('click', function() {
            // Update active state
            tabButtons.forEach(btn => btn.classList.remove('active'));
            this.classList.add('active');
            
            // Show/hide messages based on tab
            const entries = document.querySelectorAll('.debug-entry');
            entries.forEach(entry => {
                if (this.dataset.tab === 'all') {
                    entry.style.display = '';
                } else if (this.dataset.tab === 'plots') {
                    entry.style.display = entry.dataset.isPlot === 'true' ? '' : 'none';
                }
            });
        });
    });
});
const { getMaxMargin, clampMargin, resolveMargin, DEFAULT_MARGIN } = await import('./utils/marginUtils.js?v=' + Date.now());

const select = document.getElementById('drawingSelect');
const container = document.getElementById('svgContainer');
const exportButton = document.getElementById('exportSvg');

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
            // Get the current drawing configuration
            const { drawings, drawingsReady } = await import('./drawings.js?v=' + Date.now());
            await drawingsReady;
            syncDrawingStyles(drawings);
            const currentConfig = drawings[select.value];

        // Serialize SVG
        const svgData = new XMLSerializer().serializeToString(svg);

        // Send to server with full config
        const paperForExport = lastRenderedPaper || currentPaper || currentConfig.paper;
        const exportConfig = {
            name: currentConfig.name,
            type: currentConfig.type,
            line: currentConfig.line,
            colorPalette: currentConfig.colorPalette,
            drawingData: currentConfig.drawingData,
            paper: paperForExport ? { ...paperForExport, orientation: currentOrientation } : null,
            medium: currentMediumId
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

function updateLayerVisibility() {
    const svg = container.querySelector('svg');
    if (!svg) return;

    const selectedLayer = document.getElementById('layerSelect').value;
    const layers = svg.querySelectorAll('g[inkscape\\:groupmode="layer"]');
    
    layers.forEach(layer => {
        const label = layer.getAttribute('inkscape:label');
        const layerIndex = label.split('-')[0];
        if (selectedLayer === 'all' || layerIndex === selectedLayer) {
            layer.style.display = '';
        } else {
            layer.style.display = 'none';
        }
    });
}

function populateLayerSelect() {
    const svg = container.querySelector('svg');
    if (!svg) return;

    const layerSelect = document.getElementById('layerSelect');
    const layers = svg.querySelectorAll('g[inkscape\\:groupmode="layer"]');
    
    // Get unique color indices
    const colorIndices = new Set();
    layers.forEach(layer => {
        const label = layer.getAttribute('inkscape:label');
        const colorIndex = label.split('-')[0];
        colorIndices.add(colorIndex);
    });

    // Clear existing options except "Show All Layers"
    layerSelect.innerHTML = '<option value="all">Show All Layers</option>';
    
    // Get all unique labels and their indices, but only for layers that have content
    const layerInfo = new Map();
    layers.forEach(layer => {
        // Only include layers that have child elements (paths, etc)
        if (layer.children.length > 0) {
            const label = layer.getAttribute('inkscape:label');
            const index = label.split('-')[0];
            layerInfo.set(index, label);
        }
    });

    // Add an option for each layer that has content
    Array.from(layerInfo.entries())
        .sort(([a], [b]) => Number(a) - Number(b))
        .forEach(([index, label]) => {
            const option = document.createElement('option');
            option.value = index;
            option.textContent = label;
            layerSelect.appendChild(option);
        });
}

// Store ruler visibility state
let rulersVisible = false;
let paperConfig = null;
let currentPaperId = null;
let currentPaper = null;
let currentOrientation = 'landscape';
let lastRenderedPaper = null;
let currentMargin = DEFAULT_MARGIN;
const mediumStrokeInput = document.getElementById('mediumStrokeInput');
let currentMediumId = document.getElementById('mediumSelect').value || 'sakura';
let currentPalette = null;
let currentStrokeWidth = null;
let currentLineCap = 'round';
let currentLineJoin = 'round';

function updateMarginControls(paper) {
    const slider = document.getElementById('marginSlider');
    const input = document.getElementById('marginInput');
    const label = document.getElementById('marginValueLabel');
    if (!paper || !slider || !input || !label) {
        return;
    }
    const maxMargin = getMaxMargin(paper);
    const normalized = resolveMargin(paper, currentMargin);
    currentMargin = normalized;
    slider.max = maxMargin;
    input.max = maxMargin;
    slider.value = normalized;
    input.value = normalized;
    label.textContent = `${normalized} mm`;
}

function applyMarginValue(value) {
    if (!currentPaper) {
        return false;
    }
    const normalized = clampMargin(currentPaper, value);
    currentMargin = normalized;
    const slider = document.getElementById('marginSlider');
    const input = document.getElementById('marginInput');
    const label = document.getElementById('marginValueLabel');
    if (slider) slider.value = normalized;
    if (input) input.value = normalized;
    if (label) label.textContent = `${normalized} mm`;
    return true;
}

function syncDrawingStyles(drawings) {
    if (currentPalette) {
        Object.values(drawings).forEach(drawing => {
            drawing.colorPalette = currentPalette;
        });
    }
    if (typeof currentStrokeWidth === 'number') {
        Object.values(drawings).forEach(drawing => {
            drawing.line = {
                ...drawing.line,
                strokeWidth: currentStrokeWidth,
                lineCap: currentLineCap,
                lineJoin: currentLineJoin
            };
        });
    }
}

async function draw() {
    try {
        logDebug('Reloading modules...');
        // Reload the modules fresh each time
        const { generateSVG } = await import('./app.js?v=' + Date.now());
        const { drawings, drawingsReady } = await import('./drawings.js?v=' + Date.now());
        await drawingsReady;
        syncDrawingStyles(drawings);
        
        // First time only: populate select options
        if (!select.options.length) {
            select.innerHTML = Object.entries(drawings)
                .map(([key, drawing]) => 
                    `<option value="${key}">${drawing.name}</option>`)
                .join('');
        }

        // Store current states
        const selectedDrawing = drawings[select.value];
        logDebug(`Generating drawing: ${selectedDrawing.name}`);
        const currentLayer = document.getElementById('layerSelect').value;
        const orientationButton = document.getElementById('toggleOrientation');
        orientationButton.textContent = currentOrientation === 'portrait' ? 'Portrait' : 'Landscape';
        const basePaper = currentPaper || selectedDrawing.paper;
        if (!basePaper) {
            throw new Error('Paper configuration is missing for the selected drawing');
        }
        const marginValue = resolveMargin(basePaper, currentMargin);
        currentMargin = marginValue;
        const paperForRender = { ...basePaper, margin: marginValue };
        lastRenderedPaper = paperForRender;
        container.innerHTML = '';
        const svg = await generateSVG(selectedDrawing, {
            paper: paperForRender,
            orientation: currentOrientation
        });
        svg.setAttribute('preserveAspectRatio', 'none');
        container.appendChild(svg);
        populateLayerSelect();
        document.getElementById('layerSelect').value = currentLayer;
        updateLayerVisibility();
        
        // Apply stored ruler visibility
        const rulerGroup = svg.querySelector('g.preview-only');
        const marginRect = svg.querySelector('rect.preview-only');
        if (rulerGroup && marginRect) {
            rulerGroup.style.display = rulersVisible ? '' : 'none';
            marginRect.style.display = rulersVisible ? '' : 'none';
        }
    } catch (error) {
        console.error('Error:', error);
        logDebug('Error generating SVG: ' + error.message, 'error');
    }
}

let refreshInterval;

function startRefresh() {
    logDebug('Starting automatic refresh');
    draw();
    refreshInterval = setInterval(draw, 1000);
    const toggleButton = document.getElementById('toggleRefresh');
    toggleButton.textContent = 'Pause Refresh';
    toggleButton.classList.remove('paused');
}

function stopRefresh() {
    if (refreshInterval) {
        logDebug('Pausing automatic refresh');
        clearInterval(refreshInterval);
        refreshInterval = null;
        const toggleButton = document.getElementById('toggleRefresh');
        toggleButton.textContent = 'Resume Refresh';
        toggleButton.classList.add('paused');
    }
}

function toggleRefresh() {
    if (refreshInterval) {
        stopRefresh();
    } else {
        startRefresh();
    }
}

async function toggleOrientation() {
    currentOrientation = currentOrientation === 'landscape' ? 'portrait' : 'landscape';
    const button = document.getElementById('toggleOrientation');
    button.textContent = currentOrientation === 'portrait' ? 'Portrait' : 'Landscape';
    logDebug(`Switched to ${currentOrientation} orientation`);
    const previousLayer = document.getElementById('layerSelect').value;
    await draw();
    populateLayerSelect();
    const layerSelect = document.getElementById('layerSelect');
    if (Array.from(layerSelect.options).some(option => option.value === previousLayer)) {
        layerSelect.value = previousLayer;
    } else {
        layerSelect.value = 'all';
    }
    updateLayerVisibility();
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
        paperConfig = await loadPaperConfig();
        const paperSelect = document.getElementById('paperSelect');
        
        // Sort papers by name
        const papers = Object.entries(paperConfig.papers)
            .sort(([,a], [,b]) => a.name.localeCompare(b.name));
        
        // Populate dropdown
        papers.forEach(([id, paper]) => {
            const option = document.createElement('option');
            option.value = id;
            option.textContent = `${paper.name} (${paper.width}×${paper.height}mm)`;
            paperSelect.appendChild(option);
        });

        currentPaperId = paperConfig.default || papers[0]?.[0] || null;
        if (!currentPaperId && papers.length) {
            currentPaperId = papers[0][0];
        }
        if (currentPaperId && paperSelect.querySelector(`option[value="${currentPaperId}"]`)) {
            paperSelect.value = currentPaperId;
        } else if (papers.length) {
            paperSelect.selectedIndex = 0;
            currentPaperId = paperSelect.value;
        }
        currentPaper = currentPaperId ? paperConfig.papers[currentPaperId] : null;
        currentMargin = clampMargin(currentPaper, currentMargin);
        updateMarginControls(currentPaper);

        await applyMediumSettings(currentMediumId);

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
    // Store current refresh state
    const wasRefreshing = !!refreshInterval;
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
        rulersVisible = rulerGroup.style.display !== 'none';
        if (!rulersVisible) {
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
        rulersVisible = !rulersVisible;
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

// Track last plotted layer
let lastPlottedLayer = null;

document.getElementById('plotterPlotLayer').addEventListener('click', async () => {
    const svg = container.querySelector('svg');
    if (!svg) return;
    
    const currentLayer = document.getElementById('layerSelect').value;
    if (currentLayer === 'all') return;
    
    // Get the full layer label to extract color information
    const layerSelect = document.getElementById('layerSelect');
    const selectedOption = layerSelect.options[layerSelect.selectedIndex];
    const layerLabel = selectedOption.textContent;

    // Check if this layer was just plotted
    if (currentLayer === lastPlottedLayer) {
        if (!confirm(`Are you sure you want to plot "${layerLabel}" again?`)) {
            logDebug('Plot cancelled - same layer');
            return;
        }
    }
    
    // Update last plotted layer
    lastPlottedLayer = currentLayer;
    
    try {
        logDebug(`Plotting layer ${layerLabel}...`);
        startProgressListener();  // Start listening for progress
        
        updatePlotterStatus('Plotting', true);  // Set status before starting plot
        
        const svgData = new XMLSerializer().serializeToString(svg);
        const penPosUp = parseInt(document.getElementById('penPosUp').value);
        const penPosDown = parseInt(document.getElementById('penPosDown').value);
        const penRateLower = parseInt(document.getElementById('penRateLower').value);
        
        if (await sendPlotterCommand('plot', { 
            svg: svgData, 
            layer: currentLayer,
            layerLabel: layerLabel,
            pen_pos_up: penPosUp,
            pen_pos_down: penPosDown,
            pen_rate_lower: penRateLower
        })) {
            logDebug(`Layer ${layerLabel} plot command sent successfully`);
        } else {
            throw new Error('Plot command failed to start');
        }
    } catch (error) {
        logDebug(`Plot failed: ${error.message}`, 'error');
        // Clean up SSE connection if it was started
        if (progressEventSource) {
            progressEventSource.close();
            progressEventSource = null;
        }
        // Re-enable all controls
        updatePlotterStatus('Ready', true);
    }
});


// Add event listeners for new plotter buttons
document.getElementById('plotterCycle').addEventListener('click', async () => {
    logDebug('Sending cycle command...');
    const penPosUp = parseInt(document.getElementById('penPosUp').value);
    const penPosDown = parseInt(document.getElementById('penPosDown').value);
    const penRateLower = parseInt(document.getElementById('penRateLower').value);
    if (await sendPlotterCommand('cycle', { 
        pen_pos_up: penPosUp, 
        pen_pos_down: penPosDown,
        pen_rate_lower: penRateLower 
    })) {
        logDebug('Cycle command completed');
        updatePlotterStatus('Ready', true);
    }
});

document.getElementById('plotterToggle').addEventListener('click', async () => {
    logDebug('Sending toggle command...');
    const penPosUp = parseInt(document.getElementById('penPosUp').value);
    const penPosDown = parseInt(document.getElementById('penPosDown').value);
    const penRateLower = parseInt(document.getElementById('penRateLower').value);
    if (await sendPlotterCommand('toggle', { 
        pen_pos_up: penPosUp, 
        pen_pos_down: penPosDown,
        pen_rate_lower: penRateLower 
    })) {
        logDebug('Toggle command completed');
        updatePlotterStatus('Ready', true);
    }
});

document.getElementById('plotterAlign').addEventListener('click', async () => {
    logDebug('Sending align command...');
    const penPosUp = parseInt(document.getElementById('penPosUp').value);
    const penPosDown = parseInt(document.getElementById('penPosDown').value);
    if (await sendPlotterCommand('align', { pen_pos_up: penPosUp, pen_pos_down: penPosDown })) {
        logDebug('Align command completed');
        updatePlotterStatus('Ready', true);
    }
});

document.getElementById('plotterStopPlot').addEventListener('click', async () => {
    if (progressEventSource) {
        progressEventSource.close();
        progressEventSource = null;
    }
    logDebug('Sending stop plot command...');
    if (await sendPlotterCommand('stop_plot')) {
        logDebug('Stop plot command sent successfully');
        const penPosUp = parseInt(document.getElementById('penPosUp').value);
        if (await sendPlotterCommand('raise_pen', { pen_pos_up: penPosUp })) {
            logDebug('Pen raised after stop');
        }
        updatePlotterStatus('Ready', true);  // Reset status after stopping
    }
});

document.getElementById('plotterHome').addEventListener('click', async () => {
    logDebug('Sending home command...');
    const penPosUp = parseInt(document.getElementById('penPosUp').value);
    const penPosDown = parseInt(document.getElementById('penPosDown').value);
    if (await sendPlotterCommand('home', { pen_pos_up: penPosUp, pen_pos_down: penPosDown })) {
        logDebug('Home command completed');
        updatePlotterStatus('Ready', true);
    }
});

document.getElementById('plotterDisableMotors').addEventListener('click', async () => {
    logDebug('Sending disable motors command...');
    if (await sendPlotterCommand('disable_motors')) {
        logDebug('Power off command completed');
        updatePlotterStatus('Ready', true);
    }
});

// Mute button handler
document.getElementById('toggleMute').addEventListener('click', () => {
    isMuted = !isMuted;
    const button = document.getElementById('toggleMute');
    const icon = button.querySelector('.speaker-icon');
    icon.textContent = isMuted ? '🔇' : '🔊';
    icon.style.textDecoration = isMuted ? 'line-through' : 'none';
    logDebug(`Sound ${isMuted ? 'muted' : 'unmuted'}`);
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
    if (!paperConfig) {
        logDebug('Paper configuration not loaded yet', 'error');
        return;
    }
    currentPaperId = e.target.value;
    currentPaper = paperConfig.papers[currentPaperId];
    if (!currentPaper) {
        logDebug(`Paper ${currentPaperId} not found in configuration`, 'error');
        return;
    }
    currentMargin = clampMargin(currentPaper, currentMargin);
    updateMarginControls(currentPaper);
    logDebug(`Changing paper size to ${currentPaper.name} (${currentPaper.width}×${currentPaper.height}mm)`);
    await draw();
});

// Medium selection handler
document.getElementById('mediumSelect').addEventListener('change', async (e) => {
    const medium = e.target.value;
    logDebug(`Changing medium to ${medium}`);
    await applyMediumSettings(medium);
    await draw();
    populateLayerSelect();
    logDebug(`Updated drawings with ${medium} settings`);
});

async function applyMediumSettings(mediumId) {
    const { colorPalettes, mediumMetadata } = await import('./utils/colorUtils.js?v=' + Date.now());
    const paletteName = `${mediumId}Palette`;
    const palette = colorPalettes[paletteName];
    if (palette) {
        currentPalette = palette;
    }
    const mediumInfo = mediumMetadata[mediumId];
    if (mediumInfo?.strokeWidth) {
        currentStrokeWidth = mediumInfo.strokeWidth;
        currentLineCap = mediumInfo.strokeLinecap || 'round';
        currentLineJoin = mediumInfo.strokeLinejoin || 'round';
        logDebug(`Applied stroke width ${mediumInfo.strokeWidth}mm for ${mediumInfo.name}`);
        if (mediumStrokeInput) {
            mediumStrokeInput.value = mediumInfo.strokeWidth;
        }
    } else {
        currentStrokeWidth = null;
        currentLineCap = 'round';
        currentLineJoin = 'round';
        if (mediumStrokeInput) {
            mediumStrokeInput.value = '';
        }
    }
    currentMediumId = mediumId;
}
