export const svgNS = "http://www.w3.org/2000/svg";

/**
 * Creates an SVG element with standard attributes
 * @param {number} width - Width in mm
 * @param {number} height - Height in mm
 * @param {string} viewBox - ViewBox attribute value
 * @returns {SVGElement} The created SVG element
 */
export function createSVG(width, height, contentWidth, contentHeight) {
    const svg = document.createElementNS(svgNS, "svg");
    svg.setAttribute("width", `${width}mm`);
    svg.setAttribute("height", `${height}mm`);
    
    // Calculate centering offsets
    const offsetX = (width - contentWidth) / 2;
    const offsetY = (height - contentHeight) / 2;
    
    // Set viewBox to include the offset
    svg.setAttribute("viewBox", `${-offsetX} ${-offsetY} ${width} ${height}`);
    svg.setAttribute("xmlns", "http://www.w3.org/2000/svg");
    svg.setAttribute("xmlns:svg", "http://www.w3.org/2000/svg");
    svg.setAttribute("xmlns:inkscape", "http://www.inkscape.org/namespaces/inkscape");
    return svg;
}

/**
 * Creates color-grouped layers in the SVG
 * @param {SVGElement} svg - The SVG element to add groups to
 * @param {string[]} colors - Array of color values
 * @returns {Object} Map of colors to their group elements
 */
export function createColorGroups(svg, colors) {
    const groups = {};
    colors.forEach((color, index) => {
        const group = document.createElementNS(svgNS, "g");
        group.setAttribute("stroke", color);
        group.setAttribute("inkscape:groupmode", "layer");
        const colorName = ["orange", "brown", "red", "pink", "purple", "green", "blue", "black", "sepia"][index];
        group.setAttribute("inkscape:label", `${index}-${colorName}`);
        groups[color] = group;
        svg.appendChild(group);
    });
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
