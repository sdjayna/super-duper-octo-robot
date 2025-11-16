# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
- Medium panel multi-select that lets users disable/re-enable individual pen colors per medium, backed by a reusable palette-filter helper, persisted localStorage state, and unit tests.
- Collapsible wrappers for Drawing Settings, Paper & Margin, and Medium sections so control stacks stay compact regardless of how many sliders a drawing exposes.
- Palette filtering utility + Vitest coverage to ensure disabled-color subsets never wipe out an entire palette.
- Completely rewrote the README with a tangible pitch, architecture map, and hands-on onboarding plus an expanded customization example.
- Introduced a top-level `drawings/` workspace split into `core/`, `community/`, and `config/`, along with a reusable drawing kit (runtime wrapper, geometry/pattern/validation helpers, shared adapters).
- Added a manifest build pipeline (`scripts/build-drawings-manifest.mjs`, `drawings/manifest.json`) and a background watcher (`npm run watch:drawings`) that rebuilds the manifest automatically.
- Added `client/js/drawingsLoader.js` so the UI dynamically imports drawings from the manifest, plus a dedicated `client/js/main.js` module in place of the inline `<script>`.
- Documented and wired a new `make manifest` target; `make dev` now installs deps, runs the manifest watcher, and starts the server in a single command.
- Added a preview paper colour picker (with per-paper defaults via `config/papers.json`) so dark or toned stock can be visualized before plotting.
- Added per-drawing control descriptors plus a reusable “Drawing Settings” panel so modules can expose arbitrary sliders/selects without touching shared UI (Hilbert curve now surfaces level, wavy amplitude, frequency, and segment size).
- Added tabbed Drawing/Plotter panels, a combined “Paper & Margin” section, and log-scale slider plumbing so the UI feels cohesive on large control sets.
- Added `attachControls` helper + unit tests so drawings like Bouwkamp and Hilbert can expose controls with a single call.
- Added paper/medium-aware preview profiles (`client/js/utils/paperProfile.js`) plus SVG filter helpers/tests so the on-screen render simulates bleed, jitter, and warns about risky combinations.
- Added pen-rate defaults per paper/medium combo so the Plotter Control slider snaps to sensible values (fast for acrylic markers, gentler for fragile stock).
- Added a “Calibration Patterns” drawing with Axidraw SE/A3-aware spacing annotations, micro-spacing stress rows, speed guides, serpentine polygon hatching, and documentation so users can test ink behavior across primitives (lines, arcs, waves, Beziers, radial fans, tessellations) before committing to a plot; covered by unit tests.
- Added new drawing modules for Lissajous curves, Superformula shapes, Clifford attractors, and Gray-Scott (Turing) patterns, each with configurable controls and presets, plus accompanying tests.
- Added phyllotaxis, spirograph, Voronoi sketch, flow-field, and (now dedicated) Lorenz, Ikeda, and Peter de Jong attractor modules to broaden the algorithm playground.

### Changed
- Control-section spacing is now consistent across the console, preventing collapsed panels from clipping their content.
- Drawings now export declarative definitions (config class + draw fn + presets) instead of self-registering, which removes duplicate registration errors during hot reloads.
- Browser-agnostic utilities were moved into `drawings/shared/`, so drawing modules import from one kit instead of deep `client/` paths, and the Python server simply serves a precomputed manifest.
- CONTRIBUTING.md now walks through adding drawings, presets, tests, and regenerating the manifest; README sections highlight the new structure and workflow.
- `make run` now depends on an up-to-date manifest, and the server caches manifest contents by mtime to avoid rebuilding per request.
- Paper + margin controls now share a single panel with a simplified slider display that mirrors the Drawing Settings UI.
- Hilbert generation uses an iterative bitwise algorithm (rather than deeply recursive calls) to keep high recursion levels responsive.
- Simple Perfect Rectangle controls use descriptive names (“Square Margin”, “Hatch Spacing”) and slider widgets for better UX.
- README + docs now explain the paper descriptions, preview heuristics, and new slider styling so contributors know how to extend them.
- Plotter metadata now lives in `config/plotters.json`, and the server reads it dynamically via `plotter_config.py` so switching hardware only requires editing JSON.
- Preview filters now include a morphology dilation stage, so bleed radius renders as soft ink expansion.

### Removed
- Deprecated the original Delaunay triangulation module in favor of the Voronoi sketch and other generative drawings.
- Removed the Diffusion-Limited Aggregation (Dendrite Cluster) drawing because its simulation never finished in practice; future dendrite experiments should ship with stricter performance budgets.

### Fixed
- Eliminated manifest endpoint crashes by ensuring `load_drawings_manifest` is a properly declared class method and by stripping query strings in the HTTP handler.
- Avoided OS watch descriptor limits by switching the manifest watcher to polling/digest mode instead of `fs.watch`.
- Drawing Settings panel now correctly surfaces controls (e.g., Hilbert level/amplitude) by attaching descriptor metadata to each `DrawingConfig`.
- Drawing manifest loader now appends a cache-busting timestamp when importing modules so new drawing definitions (and their controls) appear immediately after a reload.
- Drawing definitions now attach controls directly to their config classes, guaranteeing the UI can discover per-drawing settings even if the manifest loader or cache misses an earlier registration.
- Hatch spacing now honors a slider value of zero instead of falling back to the default spacing, so tight hatching is possible.
- Margin slider/value updates occur in one place, preventing mismatched slider/input states when toggling paper presets.
- Preview tests run offline by mocking medium metadata, preventing accidental network fetches during Vitest runs.

## [1.4.8] - 2025-02-16

### Added
- Added support for custom paper configurations
- Added dynamic SVG scaling based on paper size
- Added improved margin handling for all drawing types
- Added paper size validation checks

### Changed
- Enhanced SVG viewBox calculations for better precision
- Improved paper configuration loading system
- Updated margin visualization for clarity
- Refined drawing area calculations

### Fixed
- Paper size handling edge cases
- SVG scaling issues with custom paper sizes
- Margin calculation precision
- ViewBox updates during paper size changes

## [1.4.7] - 2025-02-16

### Added
- Added debug message filtering with "All" and "Just Plots" tabs
- Added bold highlighting for most recent debug message
- Added automatic cleanup of temporary SVG files
- Added error message highlighting in red
- Added improved SSE connection management
- Added automatic control re-enabling after plot completion
- Added completion sound with mute toggle

### Changed
- Enhanced error handling and recovery for plot commands
- Improved thread and resource cleanup
- Better error reporting in debug panel
- More robust SSE connection handling
- Updated UI with tabbed message filtering

### Fixed
- Button re-enable logic when plot fails to start
- Temporary file cleanup on server restart
- Thread management for failed plot commands
- SSE connection cleanup on errors

## [1.4.6] - 2025-02-16

### Added
- Added completion sound with mute toggle
- Added Bristol paper size (432×279mm)
- Added icon-based controls for plotter operations
- Added tooltips to all control buttons
- Added pen rate lower control slider

### Changed
- Updated UI controls to use intuitive icons
- Simplified plotter control button labels
- Improved paper size handling with dynamic configuration
- Enhanced setup controls with larger icons
- Centralized paper configuration management

## [1.4.5] - 2025-02-16

### Added
- Enhanced error handling for invalid Hilbert curve levels
- Safety checks for Hilbert curve generation parameters
- Improved debug logging for drawing operations
- Added Known Issues section to README
- Added A4 paper size support
- Added paper size selection in UI
- Added mm ruler visualization for preview
- Added centralized paper configuration

### Changed
- Optimized color selection algorithm performance
- Updated Hilbert curve generation to prevent stack overflow
- Refined wavy effect parameters for smoother curves
- Standardized margin configuration across drawing types
- Centralized paper configuration in shared JSON
- Improved margin visualization with red dashed line

### Fixed
- Stack overflow risk with high Hilbert curve levels
- Color adjacency detection edge cases
- SVG viewBox calculation precision issues
- Paper margin consistency across drawing types

### Known Issues
- Portrait mode orientation is not working correctly
- Margin handling needs improvement for consistent scaling

## [1.4.4] - 2025-02-09

### Added
- "Just Plots" tab to filter debug messages
- Note about Mac-only testing in README prerequisites

### Changed
- Renamed "Preview Control" section to "Drawing Control"
- Moved "Update SVG" button to Preview section and renamed to "Update Preview"
- Improved handling of "estimated print time" messages to not show as errors

### Fixed
- Error logging for successful plot completion messages

## [1.4.3] - 2025-02-08

### Added
- Automatic cleanup of temporary SVG files on server startup
- Error message highlighting in red in debug panel
- Improved error handling and recovery for plot commands

### Changed
- Enhanced button state management during plotting operations
- Improved thread and resource cleanup
- Better error reporting in debug panel
- More robust SSE connection handling

### Fixed
- Button re-enable logic when plot fails to start
- Temporary file cleanup on server restart
- Thread management for failed plot commands
- SSE connection cleanup on errors

[1.4.8]: https://github.com/sdjayna/super-duper-octo-robot/compare/v1.4.7...v1.4.8
[1.4.5]: https://github.com/sdjayna/super-duper-octo-robot/compare/v1.4.4...v1.4.5
[1.4.4]: https://github.com/sdjayna/super-duper-octo-robot/compare/v1.4.3...v1.4.4
[1.4.3]: https://github.com/sdjayna/super-duper-octo-robot/compare/v1.4.2...v1.4.3

## [1.4.2] - 2025-02-07

### Added
- Disable Motors button for manual plotter adjustment
- Enhanced homing sequence with pen-up safety check

### Changed
- Improved plotter control button organization
- Updated debug messages for motor control operations

## [1.4.1] - 2025-02-06

### Added
- Stop Plot button to terminate running plot commands
- Bold highlighting for most recent debug message

### Changed
- Simplified UI button labels ("Hide/Show Panel" to "Hide/Show")
- Removed redundant "Last updated" message from preview section
- Improved debug message panel scrolling behavior

[1.4.1]: https://github.com/sdjayna/super-duper-octo-robot/compare/v1.4.0...v1.4.1

## [1.4.0] - 2025-02-05

### Added
- New plotter configuration system in `plotter_config.py`
- Support for configurable plotter model settings
- Pen position control (up/down positions)
- Penlift servo configuration
- Progress reporting for plot commands

### Changed
- Moved plotter-specific settings to dedicated configuration file
- Enhanced plot command to use configured pen positions
- Improved plotter command logging and feedback

[1.4.0]: https://github.com/sdjayna/super-duper-octo-robot/compare/v1.3.0...v1.4.0

## [1.3.0] - 2025-02-04

### Added
- Hilbert curve drawing implementation
- Hot-reloading development server with watchdog
- Python virtual environment setup
- Server auto-restart on file changes
- AxiDraw plotter integration with direct controls

### Changed
- Updated development server to use hot-reloading
- Improved server process management
- Enhanced documentation for Python environment setup
- Server startup now shows emoji status indicators

### Fixed
- Server shutdown handling
- Process cleanup on restart
- Documentation clarity for first-time setup

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

[1.3.0]: https://github.com/sdjayna/super-duper-octo-robot/compare/v1.2.0...v1.3.0
[1.2.0]: https://github.com/sdjayna/super-duper-octo-robot/compare/v1.1.0...v1.2.0
[1.1.0]: https://github.com/sdjayna/super-duper-octo-robot/compare/v1.0.0...v1.1.0
[1.0.0]: https://github.com/sdjayna/super-duper-octo-robot/releases/tag/v1.0.0
