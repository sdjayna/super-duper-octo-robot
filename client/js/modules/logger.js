let lastProgressEntry = null;

function getDebugLogContainer() {
    const debugLog = document.getElementById('debugLog');
    if (!debugLog) {
        console.warn('Debug log container not found');
    }
    return debugLog;
}

function appendEntry(entry) {
    const debugLog = getDebugLogContainer();
    if (!debugLog) return;
    debugLog.appendChild(entry);
    debugLog.scrollTop = debugLog.scrollHeight;
    while (debugLog.children.length > 100) {
        debugLog.removeChild(debugLog.firstChild);
    }
    updateEntryVisibility(entry);
}

export function logDebug(message, type = 'info') {
    const debugLog = getDebugLogContainer();
    if (!debugLog) return;

    const previousLastEntry = debugLog.lastElementChild;
    if (previousLastEntry && previousLastEntry !== lastProgressEntry) {
        previousLastEntry.style.fontWeight = 'normal';
    }

    const entry = document.createElement('div');
    entry.className = `debug-entry debug-${type}`;
    entry.dataset.isPlot = message.startsWith('Plotting') ? 'true' : 'false';
    entry.textContent = `[${new Date().toLocaleTimeString()}] ${message}`;
    entry.style.fontWeight = 'bold';

    appendEntry(entry);
}

function getProgressColor(percent) {
    if (typeof percent !== 'number' || Number.isNaN(percent)) {
        return '#1976d2';
    }
    const clamped = Math.min(1, Math.max(0, percent));
    const hue = clamped * 120; // 0 = red, 120 = green
    return `hsl(${hue}, 70%, 45%)`;
}

export function logProgress(message, percent = null) {
    const debugLog = getDebugLogContainer();
    if (!debugLog) return;
    const previousLastEntry = debugLog.lastElementChild;
    if (previousLastEntry && previousLastEntry !== lastProgressEntry) {
        previousLastEntry.style.fontWeight = 'normal';
    }

    if (!lastProgressEntry || !debugLog.contains(lastProgressEntry)) {
        lastProgressEntry = document.createElement('div');
        lastProgressEntry.className = 'debug-entry debug-progress';
        lastProgressEntry.dataset.isPlot = 'true';

        const label = document.createElement('div');
        label.className = 'progress-label';
        const bar = document.createElement('div');
        bar.className = 'progress-bar';
        const barFill = document.createElement('div');
        barFill.className = 'progress-bar-fill';
        bar.appendChild(barFill);

        lastProgressEntry.appendChild(label);
        lastProgressEntry.appendChild(bar);
    }

    const timestamp = `[${new Date().toLocaleTimeString()}]`;
    const labelNode = lastProgressEntry.querySelector('.progress-label');
    if (labelNode) {
        labelNode.textContent = `${timestamp} ${message}`;
    } else {
        lastProgressEntry.textContent = `${timestamp} ${message}`;
    }

    const barNode = lastProgressEntry.querySelector('.progress-bar');
    const barFill = lastProgressEntry.querySelector('.progress-bar-fill');
    const hasPercent = typeof percent === 'number' && !Number.isNaN(percent);
    if (barNode) {
        barNode.classList.toggle('hidden', !hasPercent);
    }
    if (hasPercent && barFill) {
        const clamped = Math.min(1, Math.max(0, percent));
        barFill.style.width = `${(clamped * 100).toFixed(1)}%`;
    } else if (barFill) {
        barFill.style.width = '0%';
    }

    lastProgressEntry.style.fontWeight = 'bold';
    lastProgressEntry.style.color = '#000';
    if (barFill) {
        const clampedColor = getProgressColor(percent);
        barFill.style.backgroundImage = 'none';
        barFill.style.backgroundColor = clampedColor;
    }
    appendEntry(lastProgressEntry);
}

export function resetProgressLog() {
    lastProgressEntry = null;
}

function updateEntryVisibility(entry) {
    const activeTab = document.querySelector('.tab-button.active');
    if (!activeTab) return;

    const tab = activeTab.dataset.tab;
    if (tab === 'plots' && entry.dataset.isPlot !== 'true') {
        entry.style.display = 'none';
    } else {
        entry.style.display = '';
    }
}

export function initLogTabs() {
    const tabButtons = document.querySelectorAll('.tab-button');
    if (!tabButtons.length) return;

    tabButtons.forEach(button => {
        button.addEventListener('click', function handleTabClick() {
            tabButtons.forEach(btn => btn.classList.remove('active'));
            this.classList.add('active');

            const entries = document.querySelectorAll('.debug-entry');
            entries.forEach(entry => updateEntryVisibility(entry));
        });
    });
}
