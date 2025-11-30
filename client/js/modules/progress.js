let progressEventSource = null;
let lastProgressBar = '';
let jsonProgressActive = false;
const PROGRESS_PERCENT_REGEX = /^(\d+(?:\.\d+)?)%/;

function normalizeFraction(rawValue) {
    if (typeof rawValue !== 'number' || Number.isNaN(rawValue)) {
        return null;
    }
    const normalized = rawValue > 1 ? rawValue / 100 : rawValue;
    return Math.min(1, Math.max(0, normalized));
}

export function normalizeProgressValue(rawValue) {
    if (typeof rawValue === 'number') {
        return normalizeFraction(rawValue);
    }
    if (typeof rawValue === 'string') {
        const trimmed = rawValue.trim().replace(/%$/, '');
        if (!trimmed) {
            return null;
        }
        const parsed = Number.parseFloat(trimmed);
        if (Number.isNaN(parsed)) {
            return null;
        }
        return normalizeFraction(parsed);
    }
    return null;
}

function parsePercentFromStatus(status) {
    if (typeof status !== 'string') {
        return null;
    }
    const match = status.match(PROGRESS_PERCENT_REGEX);
    if (!match) return null;
    return normalizeProgressValue(match[0]);
}

export function startProgressListener({ logDebug, logProgress, onPlotReady, playCompletionSiren }) {
    stopProgressListener();
    lastProgressBar = '';
    jsonProgressActive = false;

    logDebug?.('Starting progress listener...');
    progressEventSource = new EventSource('http://localhost:8000/plot-progress');

    progressEventSource.onmessage = event => {
        try {
            const data = JSON.parse(event.data);
            if (!data.progress) return;
            const payload = data.payload;

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
                case 'CLI_PROGRESS': {
                    jsonProgressActive = true;
                    const status = payload && typeof payload === 'object'
                        ? (payload.status || payload.message || 'Plotting')
                        : 'Plotting';
                    const percent = payload
                        ? normalizeProgressValue(payload.progress)
                        : null;
                    const pctLabel = typeof percent === 'number'
                        ? ` ${(percent * 100).toFixed(1)}%`
                        : '';
                    const eta = payload && typeof payload.eta_seconds === 'number'
                        ? `, ETA ${Math.max(0, Math.round(payload.eta_seconds))}s`
                        : '';
                    const message = `[AxiDraw] ${status}${pctLabel}${eta}`;
                    if (typeof logProgress === 'function') {
                        logProgress(message, percent);
                    } else {
                        logDebug?.(message, 'info');
                    }
                    break;
                }
                case 'CLI_PROGRESS_BAR': {
                    if (!jsonProgressActive && payload && payload.status && payload.status !== lastProgressBar) {
                        lastProgressBar = payload.status;
                        const sourceLabel = payload.source ? ` (${payload.source})` : '';
                        const derivedPercent = parsePercentFromStatus(payload.status);
                        const message = `[AxiDraw] ${payload.status}${sourceLabel}`;
                        if (typeof logProgress === 'function') {
                            logProgress(message, derivedPercent);
                        } else {
                            logDebug?.(message, 'info');
                        }
                    }
                    break;
                }
                default:
                    if (typeof data.progress === 'string' && data.progress.toLowerCase().includes('error')) {
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
        setTimeout(() => startProgressListener({ logDebug, logProgress, onPlotReady, playCompletionSiren }), 1000);
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
