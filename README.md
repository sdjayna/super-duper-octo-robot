# Plotter Art Generator

A web-based tool for generating algorithmic art optimized for pen plotters. This project creates SVG files with separated layers for multi-pen plotting, featuring perfect square subdivisions (Bouwkamp codes) and Delaunay triangulations. It includes live preview, automatic file saving, and color separation for plotter-ready output.

## Features

- Multiple drawing algorithms:
  - Bouwkamp codes (perfect square subdivisions)
  - Delaunay triangulations
- Real-time preview with automatic refresh
- Automatic SVG file saving:
  - Organized directory structure
  - Timestamp-based filenames
  - Pretty-printed SVG output
  - Configuration preserved in file comments
- Multi-pen plotting support:
  - Automatic color separation into layers
  - Smart color selection to avoid adjacent same-color shapes
  - Inkscape-compatible layer naming
- Configurable drawing parameters:
  - Paper sizes and margins
  - Line widths and spacing
  - Vertex gaps for clean pen lifts
- Live development environment with hot reload

## Getting Started

### Prerequisites

- Python 3.x (for the development server)
- Modern web browser (Chrome, Firefox, Safari)
- Git

### Installation

1. Clone the repository:
```bash
git clone https://github.com/yourusername/plotter-art.git
cd plotter-art
```

2. Start the Python server:
```bash
python3 server.py
```

3. Open your browser and navigate to:
```
http://localhost:8000/plotter.html
```

## Usage

### Basic Usage

1. Open `plotter.html` in your browser
2. Select a drawing type from the dropdown menu
3. The preview updates automatically
4. Click "Save SVG" to save the current drawing

### File Output

SVG files are automatically saved to an `output` directory, organized by drawing type:
```
output/
    simplePerfectRectangle/
        20231124-153022.svg
    delaunayExample/
        20231124-153024.svg
```

Each SVG file includes:
- Pretty-printed SVG code
- Configuration details in comments
- Inkscape-compatible layer names
- Timestamp-based filename

### Creating Custom Drawings

Add new drawings in `js/drawings.js`:

```javascript
myNewDrawing: new DrawingConfig(
    'My New Drawing',
    {
        type: 'bouwkamp',  // or 'delaunay'
        code: [...],       // for bouwkamp
        // or
        triangulation: {   // for delaunay
            points: [{x: 0, y: 0}, ...],
            width: 100,
            height: 100
        },
        paper: {
            width: 420,    // A3 width in mm
            height: 297,   // A3 height in mm
            margin: 12.5   // margin in mm
        },
        line: {
            width: 0.3,      // line width in mm
            spacing: 2.5,    // space between lines
            strokeWidth: 0.45,// SVG stroke width
            vertexGap: 0.5   // gap at vertices
        },
        colorPalette      // imported from colorPalette.js
    }
)
```

## Project Structure

```
├── js/
│   ├── app.js              # Main application logic
│   ├── DrawingConfig.js    # Drawing configuration classes
│   ├── BouwkampConfig.js   # Bouwkamp-specific configuration
│   ├── DelaunayConfig.js   # Delaunay-specific configuration
│   ├── drawings.js         # Drawing definitions
│   ├── svgUtils.js         # SVG creation utilities
│   ├── bouwkampUtils.js    # Bouwkamp-specific utilities
│   └── colorPalette.js     # Color definitions
├── plotter.html           # Main application page
├── .eslintrc.json        # ESLint configuration
└── README.md
```

## Development

### Code Style

The project uses ESLint with specific rules. See `.eslintrc.json` for the complete configuration.

### Adding New Drawing Types

To add a new drawing type to the system, follow these steps:

1. Create a new configuration class in `js/MyNewConfig.js`:
```javascript
export class MyNewConfig {
    constructor(params) {
        // Define the properties needed for your drawing
        this.width = params.width;
        this.height = params.height;
        // Add any other required properties
    }
}
```

2. Create a new drawing module in `js/drawings/myNew.js`:
```javascript
import { createSVG, createColorGroups, createPath } from '../svgUtils.js';
import { ColorManager } from '../ColorManager.js';

export function drawMyNewType(drawingConfig) {
    const myDrawing = drawingConfig.drawingData;
    const svg = createSVG(drawingConfig, myDrawing.width, myDrawing.height);
    
    const colorGroups = createColorGroups(svg, drawingConfig.colorPalette);
    const colorManager = new ColorManager(drawingConfig.colorPalette);
    
    // Implement your drawing logic here
    // Use colorGroups for different pen colors
    // Use colorManager.getValidColor() for color selection
    
    return svg;
}
```

3. Update `DrawingConfig.js` to include your new type:
```javascript
import { MyNewConfig } from './MyNewConfig.js';

export class DrawingConfig {
    createDrawingData(params) {
        const configs = {
            bouwkamp: () => new BouwkampConfig(params.code),
            delaunay: () => new DelaunayConfig(params.triangulation),
            mynew: () => new MyNewConfig(params.myParams)  // Add your type
        };
        
        const creator = configs[params.type];
        if (!creator) {
            throw new Error(`Unsupported drawing type: ${params.type}`);
        }
        return creator();
    }
}
```

4. Update `app.js` to handle the new drawing type:
```javascript
import { drawMyNewType } from './drawings/myNew.js';

export function generateSVG(drawingConfig) {
    try {
        let svg;
        switch (drawingConfig.type) {
            case 'bouwkamp':
                validateBouwkampCode(drawingConfig.drawingData.toArray());
                svg = drawBouwkampCode(drawingConfig);
                break;
            case 'delaunay':
                svg = drawDelaunayTriangulation(drawingConfig);
                break;
            case 'mynew':
                svg = drawMyNewType(drawingConfig);  // Add your case
                break;
            default:
                throw new Error(`Unsupported drawing type: ${drawingConfig.type}`);
        }
        return svg;
    } catch (error) {
        console.error('Error generating visualization:', error);
        throw error;
    }
}
```

5. Add an example configuration in `drawings.js`:
```javascript
myNewExample: new DrawingConfig(
    'My New Drawing Type',
    {
        type: 'mynew',
        myParams: {
            width: 200,
            height: 200,
            // Add any other parameters your drawing needs
        },
        paper: {
            width: 420,
            height: 297,
            margin: 12.5
        },
        line: {
            width: 0.3,
            spacing: 2.5,
            strokeWidth: 0.45,
            vertexGap: 0.5
        },
        colorPalette
    }
)
```

### Drawing Type Guidelines

When creating a new drawing type:

1. **Configuration Class**
   - Keep drawing-specific parameters separate from general configuration
   - Use clear parameter names
   - Document the expected parameter formats

2. **Drawing Function**
   - Use the provided SVG utilities (`createSVG`, `createPath`)
   - Implement color separation using `colorGroups`
   - Use `colorManager` for smart color selection
   - Scale output to fit the paper size
   - Center the drawing appropriately

3. **Color Management**
   - Use the `ColorManager` class for color selection
   - Define shapes with proper bounds for adjacency checking
   - Consider color distribution in your pattern

4. **SVG Output**
   - Ensure paths are properly closed
   - Use appropriate stroke widths
   - Consider pen movement optimization
   - Add any necessary metadata to layers

### Example Drawing Types

The project includes two reference implementations:

1. **Bouwkamp** (`js/drawings/bouwkamp.js`)
   - Demonstrates perfect square subdivisions
   - Shows how to handle complex geometry
   - Includes utility functions for pattern generation

2. **Delaunay** (`js/drawings/delaunay.js`)
   - Shows point-based drawing
   - Demonstrates scaling and centering
   - Implements triangle-based patterns

Use these as references when implementing your own drawing types.

## Color System

The project includes a comprehensive color palette based on common plotter pen colors. See the [Color Documentation](docs/colors.md) for details about:
- Available colors
- Layer separation
- Color selection algorithm
- Adding new colors

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

### Development Guidelines

- Follow the ESLint configuration
- Maintain modular code structure
- Add JSDoc comments for new functions
- Update documentation for new features

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Support

For support:
1. Check existing [Issues](https://github.com/yourusername/plotter-art/issues)
2. Open a new issue with:
   - Browser version
   - Complete error message
   - Steps to reproduce
   - Example configuration (if applicable)

## Roadmap

- [ ] Add more drawing algorithms
- [ ] Implement true Delaunay triangulation
- [ ] Add export options for different plotter types
- [ ] Create a configuration UI
- [ ] Add SVG optimization options
- [ ] Support for curved lines and bezier paths

## Acknowledgments

- Inspired by the work of C.J. Bouwkamp on perfect square subdivisions
- Built for use with pen plotters
- Color palette inspired by common plotter pen sets

## Authors

- **Your Name** - *Initial work* - [YourGithub](https://github.com/yourusername)

See also the list of [contributors](https://github.com/yourusername/plotter-art/contributors) who participated in this project.
