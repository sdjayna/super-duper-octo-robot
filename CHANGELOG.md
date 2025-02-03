# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.2.0] - 2025-02-03

### Added
- Portrait/Landscape orientation toggle with automatic content rotation
- Debug panel with real-time logging and error tracking
- Content-aware SVG scaling for optimal paper fit
- Dynamic viewBox calculation based on orientation
- Layer visibility controls with color name display
- Auto-pause refresh during layer selection
- Comprehensive color palette with 45+ plotter pen colors

### Changed
- Improved SVG transformation logic for cleaner output
- Enhanced UI controls layout and consistency
- Centralized viewBox calculations in svgUtils
- Optimized color selection algorithm for better distribution
- Updated documentation with new features and examples

### Fixed
- SVG dimension handling in portrait orientation
- Layer selection state preservation during refresh
- Content centering in both orientations
- Color adjacency detection accuracy
- Debug panel overflow handling

## [1.1.0] - 2025-02-02

### Added
- Layer visibility controls in UI
  - Color-specific layer selection
  - Layer names from Inkscape metadata
  - Auto-pause refresh during selection
- Smart color selection system
  - Adjacent color avoidance
  - Usage balancing algorithm
  - Recent color tracking
- Enhanced SVG output
  - Pretty-printed format
  - Configuration preservation in comments
  - Inkscape-compatible layer naming

### Changed
- Refactored drawing configuration system
- Improved color management architecture
- Enhanced error handling and logging
- Updated UI styling for better usability

### Fixed
- Layer selection index matching
- Drawing state preservation
- SVG viewBox calculations
- Color distribution in complex patterns

## [1.0.0] - 2025-02-01

### Added
- Initial release of Plotter Art Generator
- Core drawing algorithms:
  - Bouwkamp codes (perfect square subdivisions)
  - Delaunay triangulations
- Real-time preview with auto-refresh
- Basic SVG file generation
- Multi-pen plotting support
- Simple color separation
- Development server with hot reload

[1.2.0]: https://github.com/yourusername/plotter-art/compare/v1.1.0...v1.2.0
[1.1.0]: https://github.com/yourusername/plotter-art/compare/v1.0.0...v1.1.0
[1.0.0]: https://github.com/yourusername/plotter-art/releases/tag/v1.0.0
