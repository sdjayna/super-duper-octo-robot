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
    
    // Set SVG dimensions to paper size without margins
    svg.setAttribute("width", `${width}mm`);
    svg.setAttribute("height", `${height}mm`);
    
    // Set initial viewBox including margins
    setViewBox(svg, width, height, contentWidth, contentHeight, margin, isPortrait);
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

export function setViewBox(svg, paperWidth, paperHeight, contentWidth, contentHeight, margin, isPortrait = false) {
    // Parse all dimensions to ensure we're working with numbers
    const width = parseFloat(paperWidth);
    const height = parseFloat(paperHeight);
    const drawingWidth = parseFloat(contentWidth);
    const drawingHeight = parseFloat(contentHeight);
    const marginValue = parseFloat(margin);

    // Calculate available space for content (paper size minus margins)
    const availableWidth = width - (2 * marginValue);
    const availableHeight = height - (2 * marginValue);

    // Scale content to fit within margins while maintaining aspect ratio
    const scale = Math.min(
        availableWidth / drawingWidth,
        availableHeight / drawingHeight
    );

    const scaledWidth = drawingWidth * scale;
    const scaledHeight = drawingHeight * scale;

    // Create a group for the content
    const contentGroup = document.createElementNS(svgNS, "g");
    svg.appendChild(contentGroup);

    // Add a visible margin rectangle for debugging
    const marginRect = document.createElementNS(svgNS, "rect");
    marginRect.setAttribute("x", marginValue);
    marginRect.setAttribute("y", marginValue);
    marginRect.setAttribute("width", width - (2 * marginValue));
    marginRect.setAttribute("height", height - (2 * marginValue));
    marginRect.setAttribute("fill", "none");
    marginRect.setAttribute("stroke", "#ccc");
    marginRect.setAttribute("stroke-width", "0.5");
    marginRect.setAttribute("stroke-dasharray", "2,2");
    svg.insertBefore(marginRect, contentGroup);

    // Calculate centering offsets for the scaled content
    const horizontalOffset = marginValue + (availableWidth - scaledWidth) / 2;
    const verticalOffset = marginValue + (availableHeight - scaledHeight) / 2;

    if (isPortrait) {
        const viewBox = `0 0 ${height} ${width}`;
        svg.setAttribute('viewBox', viewBox);
        contentGroup.setAttribute("transform", 
            `scale(${scale}) translate(${horizontalOffset/scale}, ${verticalOffset/scale})`);
    } else {
        const viewBox = `0 0 ${width} ${height}`;
        svg.setAttribute('viewBox', viewBox);
        contentGroup.setAttribute("transform", 
            `scale(${scale}) translate(${horizontalOffset/scale}, ${verticalOffset/scale})`);
    }

    // Move all existing content (except margin rect) into the content group
    Array.from(svg.children).forEach(child => {
        if (child !== marginRect && child !== contentGroup) {
            contentGroup.appendChild(child);
        }
    });

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
