const SVG_NS = 'http://www.w3.org/2000/svg';

export function applyPreviewEffects(svg, profile) {
    if (!svg || !profile) {
        return;
    }
    const defs = ensureDefs(svg);
    const filter = ensureFilter(defs);
    updateFilter(filter, profile);
    svg.setAttribute('data-preview-filter', filter.id);
    svg.style.filter = `url(#${filter.id})`;
}

function ensureDefs(svg) {
    let defs = svg.querySelector('defs');
    if (!defs) {
        defs = document.createElementNS(SVG_NS, 'defs');
        svg.insertBefore(defs, svg.firstChild);
    }
    return defs;
}

function ensureFilter(defs) {
    let filter = defs.querySelector('#previewInkFilter');
    if (!filter) {
        filter = document.createElementNS(SVG_NS, 'filter');
        filter.setAttribute('id', 'previewInkFilter');
        filter.setAttribute('x', '-5%');
        filter.setAttribute('y', '-5%');
        filter.setAttribute('width', '110%');
        filter.setAttribute('height', '110%');

        const blur = document.createElementNS(SVG_NS, 'feGaussianBlur');
        blur.setAttribute('in', 'SourceGraphic');
        blur.setAttribute('stdDeviation', '0');
        blur.setAttribute('result', 'blurred');

        const turbulence = document.createElementNS(SVG_NS, 'feTurbulence');
        turbulence.setAttribute('type', 'fractalNoise');
        turbulence.setAttribute('baseFrequency', '0.9');
        turbulence.setAttribute('numOctaves', '2');
        turbulence.setAttribute('seed', '2');
        turbulence.setAttribute('result', 'noise');

        const displacement = document.createElementNS(SVG_NS, 'feDisplacementMap');
        displacement.setAttribute('in', 'blurred');
        displacement.setAttribute('in2', 'noise');
        displacement.setAttribute('scale', '0');
        displacement.setAttribute('xChannelSelector', 'R');
        displacement.setAttribute('yChannelSelector', 'G');

        filter.append(blur, turbulence, displacement);
        defs.appendChild(filter);
    }
    return filter;
}

function updateFilter(filter, profile) {
    const blur = filter.querySelector('feGaussianBlur');
    const displacement = filter.querySelector('feDisplacementMap');
    if (blur) {
        blur.setAttribute('stdDeviation', String(profile.bleedRadius || 0));
    }
    if (displacement) {
        displacement.setAttribute('scale', String((profile.jitter || 0) * 120));
    }
}
