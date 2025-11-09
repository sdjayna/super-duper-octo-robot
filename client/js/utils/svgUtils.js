export const svgNS = "http://www.w3.org/2000/svg";

/**
 * Creates an SVG element with standard attributes
 * @param {number} width - Width in mm
 * @param {number} height - Height in mm
 * @param {number} contentWidth - Width of the content to be centered
 * @param {number} contentHeight - Height of the content to be centered
 * @returns {SVGElement} The created SVG element
 */
export function createSVG(renderContext) {
    const svg = document.createElementNS(svgNS, "svg");
    const { paperWidth, paperHeight } = renderContext;
    
    svg.setAttribute("width", `${paperWidth}mm`);
    svg.setAttribute("height", `${paperHeight}mm`);
    svg.setAttribute('viewBox', `0 0 ${paperWidth} ${paperHeight}`);
    svg.dataset.orientation = renderContext.orientation;
    
    svg.setAttribute("xmlns", "http://www.w3.org/2000/svg");
    svg.setAttribute("xmlns:svg", "http://www.w3.org/2000/svg");
    svg.setAttribute("xmlns:inkscape", "http://www.inkscape.org/namespaces/inkscape");

    appendDrawingGroup(svg);
    appendGuides(svg, renderContext);

    return svg;
}

/**
 * Creates color-grouped layers in the SVG
 * @param {SVGElement} svg - The SVG element to add groups to
 * @param {Object} colorPalette - Dictionary of color objects with hex and name properties
 * @returns {Object} Map of hex colors to their group elements
 */
export function createColorGroups(svg, colorPalette) {
    const groups = {};
    let index = 0;
    const drawingLayer = getDrawingLayer(svg);

    for (const [key, color] of Object.entries(colorPalette)) {
        const group = document.createElementNS(svgNS, "g");
        group.setAttribute("stroke", color.hex);
        group.setAttribute("inkscape:groupmode", "layer");
        group.setAttribute("inkscape:label", `${index}-${color.name}`);
        groups[color.hex] = group;
        drawingLayer.appendChild(group);
        index++;
    }
    return groups;
}

/**
 * Creates a path element from a series of points
 * @param {Array<{x: number, y: number}>} points - Array of point coordinates
 * @param {number} strokeWidth - Width of the path stroke
 * @returns {SVGPathElement} The created path element
 */
export function createPath(points) {
    const pathElement = document.createElementNS(svgNS, "path");
    let pathData = `M ${points[0].x} ${points[0].y}`;
    for (let i = 1; i < points.length; i++) {
        pathData += ` L ${points[i].x} ${points[i].y}`;
    }
    pathElement.setAttribute("d", pathData);
    pathElement.setAttribute("fill", "none");
    return pathElement;
}

function appendDrawingGroup(svg) {
    const drawingLayer = document.createElementNS(svgNS, 'g');
    drawingLayer.setAttribute('data-role', 'drawing-content');
    svg.appendChild(drawingLayer);
    return drawingLayer;
}

function appendGuides(svg, renderContext) {
    const { paperWidth, paperHeight, margin } = renderContext;
    const marginRect = document.createElementNS(svgNS, "rect");
    marginRect.setAttribute("x", margin);
    marginRect.setAttribute("y", margin);
    marginRect.setAttribute("width", paperWidth - (2 * margin));
    marginRect.setAttribute("height", paperHeight - (2 * margin));
    marginRect.setAttribute("fill", "none");
    marginRect.setAttribute("stroke", "#ff0000");
    marginRect.setAttribute("stroke-width", "0.5");
    marginRect.setAttribute("stroke-dasharray", "2,2");
    marginRect.setAttribute("data-debug", "margin-rect");
    marginRect.setAttribute("class", "preview-only");
    svg.appendChild(marginRect);

    const rulerGroup = document.createElementNS(svgNS, "g");
    rulerGroup.setAttribute("class", "preview-only");

    for (let i = 20; i <= paperWidth; i += 10) {
        const tick = document.createElementNS(svgNS, "line");
        tick.setAttribute("x1", i);
        tick.setAttribute("y1", 0);
        tick.setAttribute("x2", i);
        tick.setAttribute("y2", i % 50 === 0 ? 5 : (i % 10 === 0 ? 3 : 2));
        tick.setAttribute("stroke", "#ff9999");
        tick.setAttribute("stroke-width", "0.5");
        rulerGroup.appendChild(tick);

        if (i % 10 === 0) {
            const text = document.createElementNS(svgNS, "text");
            text.setAttribute("x", i);
            text.setAttribute("y", 10);
            text.setAttribute("text-anchor", "middle");
            text.setAttribute("font-size", "3");
            text.setAttribute("fill", i % 20 === 0 ? "#cc0000" : "#ff6666");
            text.textContent = i;
            rulerGroup.appendChild(text);
        }
    }

    for (let i = 20; i <= paperHeight; i += 10) {
        const tick = document.createElementNS(svgNS, "line");
        tick.setAttribute("x1", 0);
        tick.setAttribute("y1", i);
        tick.setAttribute("x2", i % 50 === 0 ? 5 : (i % 10 === 0 ? 3 : 2));
        tick.setAttribute("y2", i);
        tick.setAttribute("stroke", "#ff9999");
        tick.setAttribute("stroke-width", "0.5");
        rulerGroup.appendChild(tick);

        if (i % 10 === 0) {
            const text = document.createElementNS(svgNS, "text");
            text.setAttribute("x", 6);
            text.setAttribute("y", i + 1);
            text.setAttribute("text-anchor", "start");
            text.setAttribute("font-size", "3");
            text.setAttribute("fill", i % 20 === 0 ? "#cc0000" : "#ff6666");
            text.textContent = i;
            rulerGroup.appendChild(text);
        }
    }

    svg.appendChild(rulerGroup);
}

export function getDrawingLayer(svg) {
    const layer = svg.querySelector('[data-role="drawing-content"]');
    if (!layer) {
        throw new Error('Drawing layer not initialized. Call createSVG(renderContext) first.');
    }
    return layer;
}
