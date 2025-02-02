# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.0.0] - 2025-02-02

### Added
- Initial release of the Plotter Art Generator
- Support for Bouwkamp codes and Delaunay triangulations
- Real-time preview with automatic refresh
- Automatic SVG file saving with organized directory structure
- Multi-pen plotting support with color separation
- Layer visibility toggle in UI
- Layer selection dropdown with Inkscape layer names
- Automatic refresh pausing when selecting layers

### Fixed
- Layer selection now handles exact index matching (prevents 1/10 confusion)
- Drawing selector maintains state during refresh
- Layer selection maintains state during refresh

### Changed
- Unified select element styling across the application
- Improved UI layout with consistent spacing
- Enhanced error handling for drawing generation

[1.0.0]: https://github.com/yourusername/plotter-art/releases/tag/v1.0.0
