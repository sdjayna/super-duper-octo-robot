export function createPreviewController({
    container,
    select,
    logDebug,
    marginUtils,
    state
}) {
    const { getMaxMargin, clampMargin, resolveMargin } = marginUtils;
    let refreshInterval = null;

    async function draw() {
        try {
            logDebug('Reloading modules...');
            const { generateSVG } = await import('../app.js?v=' + Date.now());
            const { drawings, drawingsReady } = await import('../drawings.js?v=' + Date.now());
            await drawingsReady;
            syncDrawingStyles(drawings, state);

            if (!select.options.length) {
                populateDrawingSelect(drawings, select);
            }

            const selectedDrawing = drawings[select.value];
            logDebug(`Generating drawing: ${selectedDrawing.name}`);
            const currentLayer = document.getElementById('layerSelect').value;
            updateOrientationButton(state.currentOrientation);

            const basePaper = state.currentPaper || selectedDrawing.paper;
            if (!basePaper) {
                throw new Error('Paper configuration is missing for the selected drawing');
            }

            const marginValue = resolveMargin(basePaper, state.currentMargin);
            state.currentMargin = marginValue;
            const paperForRender = { ...basePaper, margin: marginValue };
            state.lastRenderedPaper = paperForRender;
            container.innerHTML = '';

            const svg = await generateSVG(selectedDrawing, {
                paper: paperForRender,
                orientation: state.currentOrientation
            });
            svg.setAttribute('preserveAspectRatio', 'none');
            container.appendChild(svg);
            populateLayerSelect(container);
            document.getElementById('layerSelect').value = currentLayer;
            updateLayerVisibility(container, state.rulersVisible);
        } catch (error) {
            console.error('Error:', error);
            logDebug('Error generating SVG: ' + error.message, 'error');
        }
    }

    function startRefresh() {
        logDebug('Starting automatic refresh');
        draw();
        refreshInterval = setInterval(draw, 1000);
        setRefreshButtonState(true);
    }

    function stopRefresh() {
        if (refreshInterval) {
            logDebug('Pausing automatic refresh');
            clearInterval(refreshInterval);
            refreshInterval = null;
            setRefreshButtonState(false);
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
        state.currentOrientation = state.currentOrientation === 'landscape' ? 'portrait' : 'landscape';
        updateOrientationButton(state.currentOrientation);
        logDebug(`Switched to ${state.currentOrientation} orientation`);
        const previousLayer = document.getElementById('layerSelect').value;
        await draw();
        populateLayerSelect(container);
        restoreLayerSelection(previousLayer);
        updateLayerVisibility(container, state.rulersVisible);
    }

    function updateMarginControls(paper) {
        const slider = document.getElementById('marginSlider');
        const input = document.getElementById('marginInput');
        const label = document.getElementById('marginValueLabel');
        if (!paper || !slider || !input || !label) {
            return;
        }
        const maxMargin = getMaxMargin(paper);
        const normalized = resolveMargin(paper, state.currentMargin);
        state.currentMargin = normalized;
        slider.max = maxMargin;
        input.max = maxMargin;
        slider.value = normalized;
        input.value = normalized;
        label.textContent = `${normalized} mm`;
    }

    function applyMarginValue(value) {
        if (!state.currentPaper) {
            return false;
        }
        const normalized = clampMargin(state.currentPaper, value);
        state.currentMargin = normalized;
        const slider = document.getElementById('marginSlider');
        const input = document.getElementById('marginInput');
        const label = document.getElementById('marginValueLabel');
        if (slider) slider.value = normalized;
        if (input) input.value = normalized;
        if (label) label.textContent = `${normalized} mm`;
        return true;
    }

    return {
        draw,
        startRefresh,
        stopRefresh,
        toggleRefresh,
        toggleOrientation,
        updateLayerVisibility: () => updateLayerVisibility(container, state.rulersVisible),
        populateLayerSelect: () => populateLayerSelect(container),
        updateMarginControls,
        applyMarginValue
    };
}

function syncDrawingStyles(drawings, state) {
    if (state.currentPalette) {
        Object.values(drawings).forEach(drawing => {
            drawing.colorPalette = state.currentPalette;
        });
    }
    if (typeof state.currentStrokeWidth === 'number') {
        Object.values(drawings).forEach(drawing => {
            drawing.line = {
                ...drawing.line,
                strokeWidth: state.currentStrokeWidth,
                lineCap: state.currentLineCap,
                lineJoin: state.currentLineJoin
            };
        });
    }
}

function populateDrawingSelect(drawings, select) {
    select.innerHTML = Object.entries(drawings)
        .map(([key, drawing]) => `<option value="${key}">${drawing.name}</option>`)
        .join('');
}

function populateLayerSelect(container) {
    const svg = container.querySelector('svg');
    if (!svg) return;

    const layerSelect = document.getElementById('layerSelect');
    const layers = svg.querySelectorAll('g[inkscape\\:groupmode="layer"]');
    const layerInfo = new Map();

    layers.forEach(layer => {
        if (layer.children.length > 0) {
            const label = layer.getAttribute('inkscape:label');
            const index = label.split('-')[0];
            layerInfo.set(index, label);
        }
    });

    const previousValue = layerSelect.value;
    layerSelect.innerHTML = '<option value="all">Show All Layers</option>';
    Array.from(layerInfo.entries())
        .sort(([a], [b]) => Number(a) - Number(b))
        .forEach(([index, label]) => {
            const option = document.createElement('option');
            option.value = index;
            option.textContent = label;
            layerSelect.appendChild(option);
        });

    if (![...layerSelect.options].some(option => option.value === previousValue)) {
        layerSelect.value = 'all';
    } else {
        layerSelect.value = previousValue;
    }
}

function updateLayerVisibility(container, rulersVisible) {
    const svg = container.querySelector('svg');
    if (!svg) return;
    const selectedLayer = document.getElementById('layerSelect').value;
    const layers = svg.querySelectorAll('g[inkscape\\:groupmode="layer"]');
    layers.forEach(layer => {
        const label = layer.getAttribute('inkscape:label');
        const layerIndex = label.split('-')[0];
        layer.style.display = (selectedLayer === 'all' || layerIndex === selectedLayer) ? '' : 'none';
    });

    const rulerGroup = svg.querySelector('g.preview-only');
    const marginRect = svg.querySelector('rect.preview-only');
    if (rulerGroup && marginRect) {
        rulerGroup.style.display = rulersVisible ? '' : 'none';
        marginRect.style.display = rulersVisible ? '' : 'none';
    }
}

function updateOrientationButton(orientation) {
    const button = document.getElementById('toggleOrientation');
    if (button) {
        button.textContent = orientation === 'portrait' ? 'Portrait' : 'Landscape';
    }
}

function restoreLayerSelection(previousLayer) {
    const layerSelect = document.getElementById('layerSelect');
    if (!layerSelect) return;
    if (Array.from(layerSelect.options).some(option => option.value === previousLayer)) {
        layerSelect.value = previousLayer;
    } else {
        layerSelect.value = 'all';
    }
}

function setRefreshButtonState(isRefreshing) {
    const toggleButton = document.getElementById('toggleRefresh');
    if (!toggleButton) return;
    toggleButton.textContent = isRefreshing ? 'Pause Refresh' : 'Resume Refresh';
    toggleButton.classList.toggle('paused', !isRefreshing);
}
