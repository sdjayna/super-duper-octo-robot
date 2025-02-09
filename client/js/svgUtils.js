export const svgNS = "http://www.w3.org/2000/svg";

/**
 * Creates an SVG element with standard attributes
 * @param {number} width - Width in mm
 * @param {number} height - Height in mm
 * @param {number} contentWidth - Width of the content to be centered
 * @param {number} contentHeight - Height of the content to be centered
 * @returns {SVGElement} The created SVG element
 */
export function createSVG(drawingConfig, contentWidth, contentHeight, isPortrait) {
    const svg = document.createElementNS(svgNS, "svg");
    const { width, height, margin } = drawingConfig.paper;
    
    // Add margin to overall dimensions
    const totalWidth = width + (2 * margin);
    const totalHeight = height + (2 * margin);
    
    svg.setAttribute("width", `${totalWidth}mm`);
    svg.setAttribute("height", `${totalHeight}mm`);
    
    // Set initial viewBox
    setViewBox(svg, totalWidth, totalHeight, contentWidth, contentHeight, isPortrait);
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

export function setViewBox(svg, paperWidth, paperHeight, contentWidth, contentHeight, isPortrait = false) {
    // Parse all dimensions to ensure we're working with numbers
    const totalWidth = parseFloat(paperWidth);
    const totalHeight = parseFloat(paperHeight);
    const drawingWidth = parseFloat(contentWidth);
    const drawingHeight = parseFloat(contentHeight);

    // Calculate centering offsets
    const horizontalOffset = (totalWidth - drawingWidth) / 2;
    const verticalOffset = (totalHeight - drawingHeight) / 2;

    if (isPortrait) {
        // In portrait mode:
        // - Content is rotated 90 degrees clockwise
        // - Paper dimensions are swapped
        // - Horizontal offset becomes negative to account for rotation
        const viewBox = `${verticalOffset} ${-horizontalOffset} ${totalHeight} ${totalWidth}`;
        svg.setAttribute('viewBox', viewBox);
    } else {
        // In landscape mode:
        // - No rotation
        // - Use negative offsets to move content into view from origin
        const viewBox = `${-horizontalOffset} ${-verticalOffset} ${totalWidth} ${totalHeight}`;
        svg.setAttribute('viewBox', viewBox);
    }
}

export function setOrientation(svg, isPortrait, drawingWidth, drawingHeight) {
    // Get or create the content group that will be rotated
    let contentGroup = svg.querySelector('g.content-group');
    if (!contentGroup) {
        contentGroup = document.createElementNS(svgNS, "g");
        contentGroup.setAttribute('class', 'content-group');
        // Move all existing content into the group
        while (svg.firstChild) {
            contentGroup.appendChild(svg.firstChild);
        }
        svg.appendChild(contentGroup);
    }

    // Get paper dimensions without units
    const paperWidth = svg.getAttribute('width').replace('mm', '');
    const paperHeight = svg.getAttribute('height').replace('mm', '');

    if (isPortrait) {
        // In portrait mode:
        // - Swap paper dimensions
        // - Translate content to new origin then rotate
        svg.setAttribute('width', paperHeight + 'mm');
        svg.setAttribute('height', paperWidth + 'mm');
        setViewBox(svg, paperWidth, paperHeight, drawingWidth, drawingHeight, true);
        contentGroup.setAttribute('transform', `translate(${paperHeight} 0) rotate(90)`);
    } else {
        // In landscape mode:
        // - Keep original dimensions
        // - Remove any transformation
        svg.setAttribute('width', paperWidth + 'mm');
        svg.setAttribute('height', paperHeight + 'mm');
        setViewBox(svg, paperWidth, paperHeight, drawingWidth, drawingHeight, false);
        contentGroup.removeAttribute('transform');
    }

    return contentGroup;
}
