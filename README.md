# Plotter Art Generator

## Color Palette

The project includes a comprehensive color palette based on common plotter pen colors. Colors are defined in `js/colorPalette.js` and include:

- Standard colors (black, white)
- Metallic colors (gold, silver, metallic blue)
- Neon/fluorescent colors
- Pastel shades
- Nature-inspired colors

Each color is defined with both a hex value and a human-readable name:

```javascript
{
    hex: '#7a9b7a',
    name: 'Amazonas Light'
}
```

### Using Colors

Colors are automatically:
- Separated into different SVG layers for multi-pen plotting
- Named with index numbers for easy ordering
- Given Inkscape-compatible layer names
- Managed to avoid adjacent shapes having the same color

### Available Colors

The palette includes over 40 colors commonly available for plotting pens, including:
- Amazonas Light
- Blue Grey (Dark and Light)
- Burgundy
- Metallic variants
- Neon Fluorescent colors
- And many more

See `js/colorPalette.js` for the complete list of available colors.

## Drawing Types

### Bouwkamp Codes

Bouwkamp codes represent perfect square subdivisions of rectangles. Each code is an array of numbers where:
- First number (order) indicates how many squares are used
- Second number is the width of the rectangle
- Third number is the height of the rectangle
- Remaining numbers represent the sizes of the squares used

Example:
```javascript
[4, 100, 100, 50, 50, 25, 25]  // 4 squares forming a 100x100 rectangle
```

This creates a pattern where:
- Two 50x50 squares form the left side
- Two 25x25 squares form the right side
- The result is a perfect subdivision with no gaps or overlaps

### Delaunay Triangulation

A Delaunay triangulation creates a pattern of triangles from a set of points where:
- No point lies inside the circumcircle of any triangle
- The minimum angle of all triangles is maximized
- The triangulation is unique for points in general position

Our implementation:
- Takes a set of 2D points as input
- Creates triangles using point combinations
- Applies color rules to avoid adjacent same-color triangles
- Scales and centers the pattern on the paper

Example configuration:
```javascript
{
    points: [
        { x: 10, y: 10 },   // Points defining the triangulation
        { x: 90, y: 10 },
        { x: 50, y: 86.6 }
    ],
    width: 100,    // Bounding box width
    height: 100    // Bounding box height
}
```

## Example Outputs

[Would include images here showing example outputs from both drawing types]

## Paper Sizes and Configuration

The project supports any paper size, with defaults set to common formats:
- A3: 420x297mm (default)
- A4: 297x210mm
- Custom sizes via configuration

Margins and drawing parameters can be adjusted for different pen types and plotting needs:
- Line width: Matches your pen width
- Spacing: Controls density of fill patterns
- Vertex gap: Prevents pen damage at direction changes
- Stroke width: Fine-tunes the SVG output
