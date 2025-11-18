/**
 * @vitest-environment jsdom
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { initPlotterControls } from '../plotterControls.js';

function buildDom() {
    document.body.innerHTML = `
        <div id="svgContainer"></div>
        <select id="layerSelect">
            <option value="all">Show All Layers</option>
            <option value="0">0-Black</option>
        </select>
        <button id="plotterPlotLayer"></button>
        <button id="plotterResumePlot">Resume Plot</button>
        <button id="plotterStopPlot"></button>
        <button id="plotterCycle"></button>
        <button id="plotterToggle"></button>
        <button id="plotterAlign"></button>
        <button id="plotterHome"></button>
        <button id="plotterDisableMotors"></button>
        <input id="penPosDown" value="40" />
        <input id="penPosUp" value="90" />
        <input id="penRateLower" value="10" />
    `;
}

function createPlotterControls(overrides = {}) {
    const defaultHandlers = {
        logDebug: vi.fn(),
        sendPlotterCommand: vi.fn().mockResolvedValue(true),
        beginProgressListener: vi.fn(),
        handlePlotReady: vi.fn(),
        updatePlotterStatus: vi.fn(),
        setPreviewControlsDisabled: vi.fn(),
        refreshResumeStatus: vi.fn(),
        clearResumeStatus: vi.fn()
    };
    return initPlotterControls({
        container: document.getElementById('svgContainer'),
        ...defaultHandlers,
        ...overrides
    });
}

describe('plotterControls home behavior', () => {
    beforeEach(() => {
        buildDom();
    });

    it('disables resume button immediately after clicking Home and clears status', () => {
        const clearResumeStatus = vi.fn();
        createPlotterControls({ clearResumeStatus });
        const resumeButton = document.getElementById('plotterResumePlot');
        resumeButton.disabled = false;
        document.getElementById('plotterHome').click();
        expect(resumeButton.disabled).toBe(true);
        expect(clearResumeStatus).toHaveBeenCalled();
    });

    it('refreshes resume status after home completes', async () => {
        const refreshResumeStatus = vi.fn();
        createPlotterControls({ refreshResumeStatus });
        document.getElementById('plotterHome').click();
        await vi.waitFor(() => {
            expect(refreshResumeStatus).toHaveBeenCalled();
        });
    });
});
