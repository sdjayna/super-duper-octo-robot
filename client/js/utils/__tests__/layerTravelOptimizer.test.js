/**
 * @vitest-environment jsdom
 */

import { describe, it, expect } from 'vitest';
import { createLayerTravelOptimizer } from '../layerTravelOptimizer.js';

const SVG_NS = 'http://www.w3.org/2000/svg';

function createPath(points) {
    const path = document.createElementNS(SVG_NS, 'path');
    const d = points.reduce((acc, point, index) => {
        const cmd = index === 0 ? 'M' : 'L';
        return `${acc} ${cmd} ${point.x} ${point.y}`;
    }, '').trim();
    path.setAttribute('d', d);
    return path;
}

describe('layerTravelOptimizer', () => {
    it('reorders paths inside a layer to reduce travel distance', () => {
        const svg = document.createElementNS(SVG_NS, 'svg');
        const group = document.createElementNS(SVG_NS, 'g');
        svg.appendChild(group);

        const optimizer = createLayerTravelOptimizer({ '#000': group });

        const farRight = createPath([{ x: 90, y: 10 }, { x: 95, y: 15 }]);
        optimizer.registerPath({
            color: '#000',
            pathElement: farRight,
            points: [{ x: 90, y: 10 }, { x: 95, y: 15 }]
        });
        const center = createPath([{ x: 50, y: 10 }, { x: 55, y: 15 }]);
        optimizer.registerPath({
            color: '#000',
            pathElement: center,
            points: [{ x: 50, y: 10 }, { x: 55, y: 15 }]
        });
        const left = createPath([{ x: 5, y: 10 }, { x: 10, y: 15 }]);
        optimizer.registerPath({
            color: '#000',
            pathElement: left,
            points: [{ x: 5, y: 10 }, { x: 10, y: 15 }]
        });

        const order = Array.from(group.children);
        expect(order[0]).toBe(left);
        expect(order[1]).toBe(center);
        expect(order[2]).toBe(farRight);
    });

    it('reverses a path when doing so shortens travel distance', () => {
        const svg = document.createElementNS(SVG_NS, 'svg');
        const group = document.createElementNS(SVG_NS, 'g');
        svg.appendChild(group);
        const optimizer = createLayerTravelOptimizer({ '#222': group });

        const first = createPath([{ x: 0, y: 0 }, { x: 2, y: 0 }]);
        optimizer.registerPath({
            color: '#222',
            pathElement: first,
            points: [{ x: 0, y: 0 }, { x: 2, y: 0 }]
        });
        const second = createPath([{ x: 10, y: 0 }, { x: 4, y: 0 }]);
        optimizer.registerPath({
            color: '#222',
            pathElement: second,
            points: [{ x: 10, y: 0 }, { x: 4, y: 0 }]
        });

        expect(first.getAttribute('d')).toBe('M 0 0 L 2 0');
        expect(second.getAttribute('d')).toBe('M 4 0 L 10 0');
    });
});
