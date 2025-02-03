export const svgNS = "http://www.w3.org/2000/svg";

/**
 * Creates an SVG element with standard attributes
 * @param {number} width - Width in mm
 * @param {number} height - Height in mm
 * @param {number} contentWidth - Width of the content to be centered
 * @param {number} contentHeight - Height of the content to be centered
 * @returns {SVGElement} The created SVG element
 */
export function createSVG(drawingConfig, contentWidth, contentHeight) {
    const svg = document.createElementNS(svgNS, "svg");
    const { width, height, margin } = drawingConfig.paper;
    
    // Add margin to overall dimensions
    const totalWidth = width + (2 * margin);
    const totalHeight = height + (2 * margin);
    
    svg.setAttribute("width", `${totalWidth}mm`);
    svg.setAttribute("height", `${totalHeight}mm`);
    
    // Calculate centering offsets including margin
    const offsetX = ((totalWidth - contentWidth) / 2);
    const offsetY = ((totalHeight - contentHeight) / 2);
    
    // Set initial viewBox
    setViewBox(svg, totalWidth, totalHeight);
    svg.setAttribute("xmlns", "http://www.w3.org/2000/svg");
    svg.setAttribute("xmlns:svg", "http://www.w3.org/2000/svg");
    svg.setAttribute("xmlns:inkscape", "http://www.inkscape.org/namespaces/inkscape");
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

    for (const [key, color] of Object.entries(colorPalette)) {
        const group = document.createElementNS(svgNS, "g");
        group.setAttribute("stroke", color.hex);
        group.setAttribute("inkscape:groupmode", "layer");
        group.setAttribute("inkscape:label", `${index}-${color.name}`);
        groups[color.hex] = group;
        svg.appendChild(group);
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

export function setViewBox(svg, width, height, isPortrait = false) {
    // Calculate offsets for centering
    const offsetX = (parseFloat(height) - parseFloat(width))/2;
    const offsetY = (parseFloat(width) - parseFloat(height))/2;
    
    // Set viewBox based on orientation
    const viewBox = isPortrait ? 
        `${offsetX} ${offsetY} ${height} ${width}` :
        `${offsetX} ${offsetY} ${width} ${height}`;
    
    svg.setAttribute('viewBox', viewBox);
}

export function setOrientation(svg, isPortrait) {
    // Get or create content group
    let contentGroup = svg.querySelector('g.content-group');
    if (!contentGroup) {
        contentGroup = document.createElementNS(svgNS, "g");
        contentGroup.setAttribute('class', 'content-group');
        while (svg.firstChild) {
            contentGroup.appendChild(svg.firstChild);
        }
        svg.appendChild(contentGroup);
    }

    // Get dimensions without units
    const width = svg.getAttribute('width').replace('mm', '');
    const height = svg.getAttribute('height').replace('mm', '');

    // Set dimensions based on orientation
    if (isPortrait) {
        svg.setAttribute('width', height + 'mm');
        svg.setAttribute('height', width + 'mm');
        contentGroup.setAttribute('transform', `translate(${height} 0) rotate(90)`);
    } else {
        svg.setAttribute('width', width + 'mm');
        svg.setAttribute('height', height + 'mm');
        contentGroup.removeAttribute('transform');
    }
    
    // Set viewBox after dimensions are updated
    setViewBox(svg, width, height, isPortrait);

    return contentGroup;
}
