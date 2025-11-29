import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { __previewWorkerInternals } from '../modules/preview.js';

const { runRenderGeneratorWorker, resetPreviewWorkerState, WORKER_TIMEOUT_MS } = __previewWorkerInternals;

class MockWorker {
    static instances = [];

    constructor() {
        this.listeners = {
            message: new Set(),
            error: new Set(),
            messageerror: new Set()
        };
        this.postedMessages = [];
        this.terminated = false;
        MockWorker.instances.push(this);
        queueMicrotask(() => {
            this.dispatchMessage({ type: 'workerReady', ts: Date.now() });
        });
    }

    addEventListener(type, handler) {
        this.listeners[type]?.add(handler);
    }

    removeEventListener(type, handler) {
        this.listeners[type]?.delete(handler);
    }

    postMessage(message) {
        this.postedMessages.push(message);
    }

    terminate() {
        this.terminated = true;
    }

    dispatchMessage(data) {
        (this.listeners.message || []).forEach(handler => handler({ data, currentTarget: this }));
    }

    dispatchMessageError(data) {
        (this.listeners.messageerror || []).forEach(handler => handler({ data }));
    }

    dispatchError(event) {
        (this.listeners.error || []).forEach(handler => handler(event));
    }

    static latest() {
        return MockWorker.instances[MockWorker.instances.length - 1];
    }

    static reset() {
        MockWorker.instances = [];
    }
}

const OriginalWorker = global.Worker;

function createBasePayload(overrides = {}) {
    const controller = new AbortController();
    return {
        drawingKey: 'test-drawing',
        controlValues: {},
        paper: { width: 210, height: 297, margin: 10, color: '#fff' },
        orientation: 'landscape',
        plotterArea: { width: 210, height: 297 },
        maxTravelPerLayerMeters: 5,
        paletteOverride: null,
        lineOverrides: {},
        abortSignal: controller.signal,
        ...overrides
    };
}

describe('runRenderGeneratorWorker', () => {
    beforeEach(() => {
        resetPreviewWorkerState();
        MockWorker.reset();
        global.Worker = MockWorker;
    });

    afterEach(() => {
        resetPreviewWorkerState();
        MockWorker.reset();
        if (OriginalWorker) {
            global.Worker = OriginalWorker;
        } else {
            delete global.Worker;
        }
        vi.useRealTimers();
    });

    it('resolves with render result when worker responds', async () => {
        const payload = createBasePayload();
        const resultPromise = runRenderGeneratorWorker(payload);
        const worker = MockWorker.latest();
        expect(worker).toBeTruthy();
        await Promise.resolve();
        await Promise.resolve();
        worker.dispatchMessage({ type: 'workerAck', requestId: 1, ackType: 'render' });
        const renderResult = {
            type: 'renderResult',
            requestId: 1,
            drawingKey: payload.drawingKey,
            svgInfo: { paperWidth: 210, paperHeight: 297 },
            passes: [{ paths: [] }],
            travelSummary: { totalLayers: 1 },
            elapsedMs: 42
        };
        worker.dispatchMessage(renderResult);
        const outcome = await resultPromise;
        expect(outcome).toMatchObject({
            drawingKey: payload.drawingKey,
            svgInfo: renderResult.svgInfo,
            passes: renderResult.passes,
            travelSummary: renderResult.travelSummary,
            elapsedMs: renderResult.elapsedMs
        });
        expect(worker.postedMessages[0]).toMatchObject({ type: 'render', payload: expect.any(Object) });
    });

    it('resolves with worker_messageerror when worker fires messageerror', async () => {
        const payload = createBasePayload();
        const resultPromise = runRenderGeneratorWorker(payload);
        const worker = MockWorker.latest();
        await Promise.resolve();
        await Promise.resolve();
        worker.dispatchMessageError({ reason: 'bad clone' });
        const outcome = await resultPromise;
        expect(outcome).toMatchObject({ error: 'worker_messageerror' });
        expect(worker.terminated).toBe(true);
    });

    it('returns timeout error when worker stays silent', async () => {
        vi.useFakeTimers();
        const payload = createBasePayload();
        const resultPromise = runRenderGeneratorWorker(payload);
        await vi.advanceTimersByTimeAsync(WORKER_TIMEOUT_MS);
        const outcome = await resultPromise;
        expect(outcome).toMatchObject({ error: 'worker_timeout' });
        const worker = MockWorker.latest();
        expect(worker?.terminated).toBe(true);
    });

    it('short-circuits when abort signal already fired', async () => {
        const controller = new AbortController();
        controller.abort();
        const outcome = await runRenderGeneratorWorker(createBasePayload({ abortSignal: controller.signal }));
        expect(outcome).toMatchObject({ error: 'render_aborted' });
    });
});
