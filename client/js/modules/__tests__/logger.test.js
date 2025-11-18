import { describe, it, beforeEach, afterEach, expect } from 'vitest';
import { JSDOM } from 'jsdom';

import { logProgress, resetProgressLog } from '../logger.js';

function setupLogContainer() {
    document.body.innerHTML = '<div id="debugLog"></div>';
}

describe('logProgress UI rendering', () => {
let dom;

beforeEach(() => {
    dom = new JSDOM('<!doctype html><html><body></body></html>');
    global.window = dom.window;
    global.document = dom.window.document;
    setupLogContainer();
    resetProgressLog();
});

afterEach(() => {
    resetProgressLog();
    delete global.window;
    delete global.document;
});

    it('creates a single progress entry with matching bar width', () => {
        logProgress('Plot started', 0.25);
        const log = document.getElementById('debugLog');
        expect(log.children.length).toBe(1);
        const entry = log.firstElementChild;
        expect(entry.classList.contains('debug-progress')).toBe(true);
        const label = entry.querySelector('.progress-label');
        expect(label.textContent).toContain('Plot started');
        const barFill = entry.querySelector('.progress-bar-fill');
        expect(parseFloat(barFill.style.width)).toBeCloseTo(25.0, 5);
    });

    it('updates the same entry when called repeatedly', () => {
        logProgress('Plotting segment', 0.5);
        logProgress('Plotting segment', 0.75);
        const log = document.getElementById('debugLog');
        expect(log.children.length).toBe(1);
        const barFill = log.querySelector('.progress-bar-fill');
        expect(parseFloat(barFill.style.width)).toBeCloseTo(75.0, 5);
    });

    it('hides the bar when no percentage is provided', () => {
        logProgress('Initial phase', 0.1);
        logProgress('Waiting on resume', null);
        const bar = document.querySelector('.progress-bar');
        expect(bar.classList.contains('hidden')).toBe(true);
        const fill = document.querySelector('.progress-bar-fill');
        expect(fill.style.width).toBe('0%');
    });
});
