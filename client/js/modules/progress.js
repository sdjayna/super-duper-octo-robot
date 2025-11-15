let progressEventSource = null;

export function startProgressListener({ logDebug, onPlotReady, playCompletionSiren }) {
    stopProgressListener();

    logDebug?.('Starting progress listener...');
    progressEventSource = new EventSource('http://localhost:8000/plot-progress');

    progressEventSource.onmessage = event => {
        try {
            const data = JSON.parse(event.data);
            if (!data.progress) return;

            switch (data.progress) {
                case 'PLOT_COMPLETE':
                    onPlotReady?.('complete');
                    playCompletionSiren?.();
                    stopProgressListener();
                    break;
                case 'PLOT_ERROR':
                    onPlotReady?.('error');
                    stopProgressListener();
                    break;
                default:
                    if (data.progress.toLowerCase().includes('error')) {
                        logDebug?.(data.progress, 'error');
                    } else {
                        logDebug?.(data.progress, 'info');
                    }
                    break;
            }
        } catch (error) {
            console.error('SSE parse error:', error);
            logDebug?.(`Error parsing progress data: ${error}`, 'error');
        }
    };

    progressEventSource.onerror = error => {
        console.error('SSE error:', error);
        logDebug?.('Progress listener error, reconnecting...', 'error');
        stopProgressListener();
        setTimeout(() => startProgressListener({ logDebug, onPlotReady, playCompletionSiren }), 1000);
    };

    progressEventSource.onopen = () => {
        logDebug?.('Progress listener connected');
    };
}

export function stopProgressListener() {
    if (progressEventSource) {
        progressEventSource.close();
        progressEventSource = null;
    }
}
