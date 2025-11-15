export function logDebug(message, type = 'info') {
    const debugLog = document.getElementById('debugLog');
    if (!debugLog) {
        console.warn('Debug log container not found');
        return;
    }

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

    while (debugLog.children.length > 100) {
        debugLog.removeChild(debugLog.firstChild);
    }

    updateEntryVisibility(entry);
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
