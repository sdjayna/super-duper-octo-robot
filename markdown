# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.2.0] - 2025-02-03

### Added
- Portrait/Landscape orientation toggle
- Debug panel with real-time logging
- Content-aware SVG scaling
- Dynamic viewBox calculation

### Fixed
- SVG dimension handling in portrait mode
- Layer selection state preservation
- Orientation state during refresh
- Content centering in both orientations

### Changed
- Improved button styling and consistency
- Enhanced debug logging clarity
- Simplified SVG transformation logic
- Centralized viewBox calculations

## [1.1.0] - 2025-02-02

### Added
- Layer visibility controls in UI
  - Dropdown to select individual layers or show all
  - Layer names from Inkscape metadata
  - Auto-pause refresh when selecting layers
  - Auto-resume refresh after selection
- Smart layer selection behavior
  - Maintains layer selection during refresh
  - Exact index matching to prevent 1/10 confusion
  - Auto-blur after selection to close dropdown

### Changed
- Unified select element styling
- Improved UI controls layout
- Enhanced error handling for SVG generation

## [1.0.0] - 2025-02-02

### Added
- Initial release of the Plotter Art Generator
- Support for Bouwkamp codes and Delaunay triangulations
- Real-time preview with automatic refresh
- Automatic SVG file saving
  - Organized directory structure
  - Timestamp-based filenames
  - Pretty-printed SVG output
  - Configuration preserved in comments
- Multi-pen plotting support
  - Automatic color separation into layers
  - Smart color selection to avoid adjacent same-color shapes
  - Inkscape-compatible layer naming

### Changed
- Initial UI layout and styling
- Basic error handling implementation

[1.1.0]: https://github.com/yourusername/plotter-art/compare/v1.0.0...v1.1.0
[1.0.0]: https://github.com/yourusername/plotter-art/releases/tag/v1.0.0
