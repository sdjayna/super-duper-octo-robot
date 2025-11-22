# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
- Shared straight-skeleton hatching helper that drives bisector spokes from every polygon apex, keeps the toolpath continuous, and ships as the new global “Skeleton” hatch-style option (Photo Triangles, Voronoi, and Bouwkamp already use it for rich corner coverage).
- Photo Triangles gained a Polygon Margin slider (0–3 mm in 0.1 mm steps) that insets each triangle before hatching so adjacent colors leave a clean gutter like Simple Perfect Rectangle.
- Photo Triangles drawing: upload a reference image, sample it at configurable resolution, run a Delaunay triangulation, and map each triangle to the nearest palette color so photo mosaics can be plotted layer-by-layer.
- Per-layer travel optimizer reorders each color layer’s segments so pen-up moves between polygons shrink before the next color loads.
- Drawing builder/context now accept `strokeColor` overrides so modules can explicitly target medium palette entries when assigning geometry to layers.
- Drawing controls gained a `file` input type with base64 persistence so image-driven modules can keep their source data inside the standard control/state flow.
- Medium panel multi-select that lets users disable/re-enable individual pen colors per medium, backed by a reusable palette-filter helper, persisted localStorage state, and unit tests.
- Collapsible wrappers for Drawing Settings, Paper & Margin, and Medium sections so control stacks stay compact regardless of how many sliders a drawing exposes.
- Palette filtering utility + Vitest coverage to ensure disabled-color subsets never wipe out an entire palette.
- Polygon scanline hatching utility plus per-drawing hatch-style selector (Serpentine / Scanline / None) for Simple Perfect Rectangle so future drawings can reuse consistent fill strategies.
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
