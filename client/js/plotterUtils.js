// Plotter command utilities
export async function sendPlotterCommand(command, data = {}) {
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

// Progress event source management
let progressEventSource = null;

export function startProgressListener(onProgress) {
    if (progressEventSource) {
        progressEventSource.close();
    }
    
    logDebug('Starting progress listener...');
    progressEventSource = new EventSource('http://localhost:8000/plot-progress');
    
    progressEventSource.onmessage = function(event) {
        try {
            console.log('SSE message received:', event.data);
            const data = JSON.parse(event.data);
            if (data.progress) {
                onProgress(data.progress);
            }
        } catch (error) {
            console.error('SSE parse error:', error);
            logDebug(`Error parsing progress data: ${error}`, 'error');
        }
    };
    
    progressEventSource.onerror = function(error) {
        console.error('SSE error:', error);
        logDebug('Progress listener error, reconnecting...', 'error');
        if (progressEventSource) {
            progressEventSource.close();
            progressEventSource = null;
        }
        setTimeout(() => startProgressListener(onProgress), 1000);
    };

    progressEventSource.onopen = function() {
        console.log('SSE connection opened');
        logDebug('Progress listener connected');
    };
}

export function stopProgressListener() {
    if (progressEventSource) {
        progressEventSource.close();
        progressEventSource = null;
    }
}

// Debug logging
export function logDebug(message, type = 'info') {
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
    entry.style.fontWeight = 'bold';
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
