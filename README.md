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
