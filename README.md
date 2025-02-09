# Plotter Art Generator

A web-based tool for generating algorithmic art optimized for AxiDraw pen plotters. This project creates SVG files with separated layers for multi-pen plotting, featuring perfect square subdivisions (Bouwkamp codes) and Delaunay triangulations.

> **Note:** While this tool works with any AxiDraw plotter, it has been specifically developed and tested with the AxiDraw SE/A3 Special Edition model.

For examples of artwork created using similar techniques, visit [plotter.art](https://plotter.art), which showcases algorithmic plotter art with an emphasis on acrylic paint application and geometric patterns.

![Plotter Art UI](ui-screenshot.png)

## Contents

- [Features](#features)
- [Project Structure](#project-structure)
- [Getting Started](#getting-started)
  - [Prerequisites](#prerequisites)
  - [Installation](#installation)
- [Usage](#usage)
  - [Basic Operation](#basic-operation)
  - [File Output](#file-output)
  - [Creating Custom Drawings](#creating-custom-drawings)
- [Development](#development)
  - [Adding New Drawing Types](#adding-new-drawing-types)
  - [Code Style](#code-style)
- [Color System](#color-system)
- [Plotter Configuration](#plotter-configuration)
- [Contributing](#contributing)
- [License](#license)
- [Support](#support)
- [Changelog](#changelog)
- [Acknowledgments](#acknowledgments)

## Features

- **Multiple Drawing Algorithms**
  - Bouwkamp codes (perfect square subdivisions)
  - Delaunay triangulations
  - Portrait/Landscape orientation support
  - Content-aware SVG scaling

- **Real-time Development**
  - Live preview with auto-refresh
  - Debug panel with real-time logging
    - Color-coded error messages
    - Automatic error recovery
  - Hot module reloading
  - Layer visibility controls

- **SVG Generation**
  - Automatic file saving with timestamps
  - Pretty-printed SVG output
  - Configuration preserved in comments
  - Dynamic viewBox calculation

- **Multi-pen Support**
  - Smart color separation into layers
  - Intelligent color selection system
  - Adjacent color avoidance
  - Inkscape-compatible layer naming

## Project Structure

```
├── js/
│   ├── app.js              # Main application logic
│   ├── DrawingConfig.js    # Base drawing configuration
│   ├── BouwkampConfig.js   # Perfect square subdivision config
│   ├── DelaunayConfig.js   # Triangulation configuration
│   ├── ColorManager.js     # Smart color selection system
│   ├── drawings/
│   │   ├── bouwkamp.js    # Perfect square drawing implementation
│   │   └── delaunay.js    # Triangulation drawing implementation
│   ├── bouwkampUtils.js    # Square subdivision utilities
│   ├── svgUtils.js        # SVG generation and manipulation
│   └── colorPalette.js    # Color definitions and palettes
├── server.py             # Python development server
├── plotter.html         # Main application interface
├── .eslintrc.json      # JavaScript linting rules
├── CHANGELOG.md        # Version history
└── README.md
```

## Getting Started

### Prerequisites

- Python 3.x (for the development server)
- Modern web browser (Chrome, Firefox, Safari)
- Git

### Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/sdjayna/super-duper-octo-robot.git
   cd super-duper-octo-robot
   ```

2. Create and activate Python virtual environment in current directory:
   ```bash
   # Create virtual environment
   python3 -m venv .
   
   # Activate it
   source ./bin/activate
   ```

3. Install required Python packages:
   ```bash
   # Install requirements including watchdog
   python3 -m pip install -r requirements.txt
   
   # Install AxiDraw API separately (not in PyPI)
   python3 -m pip install https://cdn.evilmadscientist.com/dl/ad/public/AxiDraw_API.zip
   ```

4. Start the development server:
   ```bash
   python3 server_runner.py
   ```

5. Open in your browser:
   ```
   http://localhost:8000/plotter.html
   ```

## Plotter Configuration

The project includes specific support for the AxiDraw SE/A3 plotter through `plotter_config.py`. This configuration file contains model-specific settings:

```python
PLOTTER_CONFIGS = {
    'AxiDraw SE/A3': {
        'model': 2,   # Model number for AxiDraw SE/A3
        'pen_pos_up': 90,    # Pen up position (0-100)
        'pen_pos_down': 10,  # Pen down position (0-100)
        'penlift': 3    # Narrow-band brushless servo (3rd position up)
    }
}
```

### Configuration Parameters

- `model`: Specifies the plotter model (2 for AxiDraw SE/A3)
- `pen_pos_up`: Height of the pen when raised (0-100)
- `pen_pos_down`: Height of the pen when drawing (0-100)
- `penlift`: Servo type configuration (3 for narrow-band brushless servo)

These settings are automatically applied to all plotter commands, ensuring consistent behavior across plotting sessions.

## Usage

### Basic Operation

1. Select a drawing type from the dropdown
2. Use the controls to:
   - Toggle orientation (Portrait/Landscape)
   - Show/hide the debug panel
   - Pause/resume auto-refresh
   - Save the current SVG
3. Use the layer selector to view specific pen colors

### File Output

SVG files are saved to the `output` directory:
```
output/
    simplePerfectRectangle/
        20250203-153022.svg
    delaunayExample/
        20250203-153024.svg
```

Each SVG includes:
- Configuration details in comments
- Inkscape-compatible layers
- Timestamp-based filename
- Pretty-printed SVG code

### Creating Custom Drawings

Add new drawings in `js/drawings.js`:

```javascript
export const drawings = {
    myNewDrawing: new DrawingConfig(
        'My Drawing Name',
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
                spacing: 2.5,    // space between lines
                strokeWidth: 0.45,// SVG stroke width
                vertexGap: 0.5   // gap at vertices
            },
            colorPalette
        }
    )
};
```

## Development

### Adding New Drawing Types

1. Create a new file in `js/drawings/mynewtype.js`:
```javascript
import { createSVG, createColorGroups, createPath } from '../svgUtils.js';
import { ColorManager } from '../ColorManager.js';
import { BaseConfig } from '../configs/BaseConfig.js';

// Configuration class for this drawing type
export class MyNewConfig extends BaseConfig {
    constructor(params) {
        super(params);
        // Add type-specific parameters
        this.myParam = params.myParam || defaultValue;
        // BaseConfig provides:
        // this.width = params.paper?.width || 420;
        // this.height = params.paper?.height || 297;
    }

    toArray() {
        // Optional: Return array representation if needed
        return [this.myParam];
    }
}

// Drawing implementation
export function drawMyNewType(drawingConfig, isPortrait = false) {
    const config = drawingConfig.drawingData;
    
    // Create SVG with proper dimensions and viewBox
    const svg = createSVG(drawingConfig, config.width, config.height, isPortrait);
    
    // Set up color management
    const colorGroups = createColorGroups(svg, drawingConfig.colorPalette);
    const colorManager = new ColorManager(drawingConfig.colorPalette);
    
    // Your drawing logic here
    // Example of creating a colored path:
    const points = [/* your points */];
    const path = createPath(points);
    path.setAttribute('stroke-width', drawingConfig.line.strokeWidth);
    
    // Get a color that works well with adjacent shapes
    const color = colorManager.getValidColor({ 
        x: points[0].x, 
        y: points[0].y,
        width: 1,
        height: 1
    });
    
    // Add path to the appropriate color group
    colorGroups[color].appendChild(path);
    
    return svg;
}
```

2. Register the type in `js/drawings/types.js`:
```javascript
import { drawMyNewType, MyNewConfig } from './mynewtype.js';

export const drawingTypes = {
    // ... existing types ...
    mynewtype: {
        name: 'My New Drawing Type',
        configClass: MyNewConfig,
        drawFunction: drawMyNewType
    }
};
```

3. Add an example drawing to `js/drawings.js`:
```javascript
export const drawings = {
    // ... existing drawings ...
    myNewDrawing: new DrawingConfig(
        'My New Drawing',
        {
            type: 'mynewtype',
            myParam: 42,          // Type-specific parameters
            paper: {
                width: 420,       // A3 width in mm
                height: 297,      // A3 height in mm
                margin: 12.5      // margin in mm
            },
            line: {
                spacing: 1.5,     // space between lines
                strokeWidth: 0.5, // SVG stroke width
                vertexGap: 0      // gap at vertices
            },
            colorPalette         // from colorPalette.js
        }
    )
};
```

The framework provides:
- Automatic SVG creation with proper dimensions and viewBox
- Smart color management that:
  - Avoids adjacent shapes having the same color
  - Tracks color usage for balanced distribution
  - Maintains recent color history
- Layer organization with Inkscape compatibility
- Portrait/landscape orientation support
- Real-time preview updates
- Debug logging

### Error Handling and Recovery

The system provides comprehensive error handling:
- Automatic cleanup of temporary files on server startup
- Robust thread management for plot operations
- Visual error highlighting in debug panel
- Automatic control re-enabling on errors
- Resource cleanup on plot failures
- SSE connection management

### Code Style

The project uses ESLint with specific rules for:
- Consistent indentation (4 spaces)
- Single quotes for strings
- Semicolon usage
- JSDoc documentation
- Max line length (100 chars)

See `.eslintrc.json` for complete configuration.

## Color System

The project includes a comprehensive color palette based on common plotter pen colors:

- Smart color selection to avoid adjacent shapes having the same color
- Automatic layer creation for each color
- Support for metallic, fluorescent, and pastel colors
- Easy addition of new colors to the palette

See `colorPalette.js` for the complete list of available colors.

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Submit a pull request

Please:
- Follow the existing code style
- Add JSDoc comments
- Update documentation
- Test thoroughly

## License

This project is licensed under the MIT License - see [LICENSE](LICENSE) for details.

## Support

For support:
1. Check existing [Issues](https://github.com/sdjayna/super-duper-octo-robot/issues)
2. Open a new issue with:
   - Browser version
   - Complete error message
   - Steps to reproduce
   - Example configuration (if applicable)

## Changelog

See [CHANGELOG.md](CHANGELOG.md) for version history and updates.

## Acknowledgments

- Inspired by C.J. Bouwkamp's work on perfect square subdivisions
- Built for pen plotter art generation
- Color palette based on common plotter pen sets
