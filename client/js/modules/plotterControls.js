export function initPlotterControls({
    container,
    logDebug,
    sendPlotterCommand,
    beginProgressListener,
    handlePlotReady,
    updatePlotterStatus,
    setPreviewControlsDisabled,
    refreshResumeStatus
}) {
    let lastPlottedLayer = null;
    const resumeButton = document.getElementById('plotterResumePlot');

    document.getElementById('plotterPlotLayer').addEventListener('click', async () => {
        const svg = container.querySelector('svg');
        if (!svg) return;

        const currentLayer = document.getElementById('layerSelect').value;
        if (currentLayer === 'all') return;

        const layerSelect = document.getElementById('layerSelect');
        const selectedOption = layerSelect.options[layerSelect.selectedIndex];
        const layerLabel = selectedOption.textContent;

        if (currentLayer === lastPlottedLayer) {
            if (!confirm(`Are you sure you want to plot "${layerLabel}" again?`)) {
                logDebug('Plot cancelled - same layer');
                return;
            }
        }

        lastPlottedLayer = currentLayer;

        try {
            logDebug(`Plotting layer ${layerLabel}...`);
            beginProgressListener();
            updatePlotterStatus('Plotting');
            setPreviewControlsDisabled(true);

            const svgData = new XMLSerializer().serializeToString(svg);
            const penPosUp = parseInt(document.getElementById('penPosUp').value);
            const penPosDown = parseInt(document.getElementById('penPosDown').value);
            const penRateLower = parseInt(document.getElementById('penRateLower').value);

            const success = await sendPlotterCommand('plot', {
                svg: svgData,
                layer: currentLayer,
                layerLabel,
                pen_pos_up: penPosUp,
                pen_pos_down: penPosDown,
                pen_rate_lower: penRateLower
            });
            if (!success) {
                throw new Error('Plot command failed to start');
            }
            if (typeof refreshResumeStatus === 'function') {
                await refreshResumeStatus({ silent: true });
            }
            logDebug(`Layer ${layerLabel} plot command sent successfully`);
        } catch (error) {
            logDebug(`Plot failed: ${error.message}`, 'error');
            handlePlotReady('error');
            updatePlotterStatus('Ready');
            setPreviewControlsDisabled(false);
            if (typeof refreshResumeStatus === 'function') {
                await refreshResumeStatus();
            }
        }
    });

    document.getElementById('plotterCycle').addEventListener('click', async () => {
        logDebug('Sending cycle command...');
        const penPosUp = parseInt(document.getElementById('penPosUp').value);
        const penPosDown = parseInt(document.getElementById('penPosDown').value);
        const penRateLower = parseInt(document.getElementById('penRateLower').value);
        if (await sendPlotterCommand('cycle', { pen_pos_up: penPosUp, pen_pos_down: penPosDown, pen_rate_lower: penRateLower })) {
            logDebug('Cycle command completed');
            updatePlotterStatus('Ready');
        }
    });

    document.getElementById('plotterToggle').addEventListener('click', async () => {
        logDebug('Sending toggle command...');
        const penPosUp = parseInt(document.getElementById('penPosUp').value);
        const penPosDown = parseInt(document.getElementById('penPosDown').value);
        const penRateLower = parseInt(document.getElementById('penRateLower').value);
        if (await sendPlotterCommand('toggle', { pen_pos_up: penPosUp, pen_pos_down: penPosDown, pen_rate_lower: penRateLower })) {
            logDebug('Toggle command completed');
            updatePlotterStatus('Ready');
        }
    });

    document.getElementById('plotterAlign').addEventListener('click', async () => {
        logDebug('Sending align command...');
        const penPosUp = parseInt(document.getElementById('penPosUp').value);
        const penPosDown = parseInt(document.getElementById('penPosDown').value);
        if (await sendPlotterCommand('align', { pen_pos_up: penPosUp, pen_pos_down: penPosDown })) {
            logDebug('Align command completed');
            updatePlotterStatus('Ready');
        }
    });

    document.getElementById('plotterStopPlot').addEventListener('click', async () => {
        handlePlotReady('manual');
        logDebug('Sending stop plot command...');
        if (await sendPlotterCommand('stop_plot')) {
            logDebug('Stop plot command sent successfully');
            const penPosUp = parseInt(document.getElementById('penPosUp').value);
            if (await sendPlotterCommand('raise_pen', { pen_pos_up: penPosUp })) {
                logDebug('Pen raised after stop');
            }
            updatePlotterStatus('Ready');
            setPreviewControlsDisabled(false);
            if (typeof refreshResumeStatus === 'function') {
                await refreshResumeStatus();
            }
        }
    });

    document.getElementById('plotterHome').addEventListener('click', async () => {
        logDebug('Sending home command...');
        const penPosUp = parseInt(document.getElementById('penPosUp').value);
        const penPosDown = parseInt(document.getElementById('penPosDown').value);
        if (resumeButton) {
            resumeButton.disabled = true;
            resumeButton.textContent = 'Resume Plot';
        }
        if (await sendPlotterCommand('home', { pen_pos_up: penPosUp, pen_pos_down: penPosDown })) {
            logDebug('Home command completed');
            updatePlotterStatus('Ready');
            if (typeof refreshResumeStatus === 'function') {
                await refreshResumeStatus();
            }
        }
    });

    document.getElementById('plotterDisableMotors').addEventListener('click', async () => {
        logDebug('Sending disable motors command...');
        if (await sendPlotterCommand('disable_motors')) {
            logDebug('Power off command completed');
            updatePlotterStatus('Ready');
        }
    });

    if (resumeButton) {
        resumeButton.addEventListener('click', async () => {
            logDebug('Attempting to resume last plot...');
            beginProgressListener();
            updatePlotterStatus('Plotting');
            setPreviewControlsDisabled(true);
            try {
                const success = await sendPlotterCommand('resume_plot');
                if (!success) {
                    throw new Error('Resume command failed to start');
                }
                if (typeof refreshResumeStatus === 'function') {
                    await refreshResumeStatus({ silent: true });
                }
                logDebug('Resume plot command sent successfully');
            } catch (error) {
                logDebug(`Resume failed: ${error.message}`, 'error');
                handlePlotReady('error');
                updatePlotterStatus('Ready');
                setPreviewControlsDisabled(false);
                if (typeof refreshResumeStatus === 'function') {
                    await refreshResumeStatus();
                }
            }
        });
    }
}
