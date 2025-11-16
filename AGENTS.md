# Repository Guidelines

## Project Structure & Module Organization
Source for the browser UI lives in `client/js` with templates under `client/templates/plotter.html` and static assets in `client/static`. Drawing definitions are split between `drawings/core`, `drawings/community`, and shared helpers in `drawings/shared`; rebuild `drawings/manifest.json` whenever you add a module. The Python bridge plus CLI wrappers reside inside `server/` and `bin/`, while paper and medium presets sit in `config/`. Automated tests live beside the client code in `client/js/__tests__`, and generated SVGs are written to `output/` for archival. Preview heuristics live in `client/js/utils/paperProfile.js` and `client/js/utils/previewEffects.js`; any change there should be mirrored with tests under `drawings/shared/__tests__` or `client/js/utils/__tests__`. When adding new papers or mediums, update the corresponding JSON entry, adjust preview+plotter overrides in `paperProfile.js`, and expand `drawings/shared/__tests__/previewProfile.test.js` with representative cases.

## Build, Test, and Development Commands
- `make install`: Creates the Python venv, installs Node modules, and builds the drawings manifest so the UI can boot.
- `make run`: Launches `server/server_runner.py` with the AxiDraw proxy on <http://localhost:8000>.
- `make dev`: Runs the manifest watcher (`npm run watch:drawings`) and the server together for hot reload workflows.
- `npm run build:drawings`: Rebuilds `drawings/manifest.json` manually after touching presets.
- `npm test` / `make test`: Executes the Vitest suite in `client/js/__tests__`.
- Tests must run offline. Mock `colorUtils.mediumMetadata` (via `vi.hoisted`) in any spec that exercises paper/medium logic so Vitest never attempts to `fetch` JSON at test time. Use jsdom when working with DOM helpers such as `previewEffects`.

## Coding Style & Naming Conventions
JavaScript files are ES modules with 4-space indentation, `camelCase` functions (e.g., `startProgressListener`) and `PascalCase` classes (`DrawingConfig`). Constants that cross files use `UPPER_SNAKE_CASE` (`DEFAULT_MARGIN`). Keep modules pure where possible and prefer small helpers in `client/js/utils`. Python code follows PEP 8 spacing; reuse existing logging helpers in `server/server.py` instead of `print` to stay consistent. Run `npm run build:drawings` before committing to ensure generated manifests reflect new modules.

### Drawing Controls
- All drawings should expose user-facing settings through the shared controls system. Use `attachControls` from `drawings/shared/controlsUtils.js` to append descriptors (`id`, `label`, `target`, `inputType`, `min/max/step`, `default`, `description`).
- Reuse naming established in the UI (“Hatch Spacing”, “Square Margin”, etc.) and provide concise descriptions that match what the control actually does in the drawing code.
- Stroke width is dictated solely by the selected medium; do **not** add manual stroke-width controls to individual drawings.
- When a control governs how many layers or offsets are emitted, cap or expand its range using the palette-aware helpers in `drawings/shared/kit.js` (`useAvailableColorCountOr`, `ensureColorReachableLimit`) so the UI can reach, but never exceed, the largest medium’s color count.
- When introducing new slider styles (logarithmic, dual-range), keep the data model declarative so the client UI can stay generic.
- For complex control sets, look at `drawings/core/calibration.js` for an example of combining multiple primitives under a single config class with well-described sliders.
- Wherever feasible, emit geometry in distinct layers mapped to the available colors in the selected medium by reusing the shared color-group helpers so each palette entry becomes its own layer.
- When polygons are present, provide a hatch-fill control when practical. Serpentine hatch is the only supported fill style today, so wire the option up to that routine until additional algorithms exist.

### Paper, Mediums, Preview Profiles, and Plotter Defaults
- Paper definitions belong in `config/papers.json` and must include descriptive metadata (`description`, `finish`, `absorbency`, `surfaceStrength`, weight, colour, notes). This copy renders directly in the UI, so keep it succinct and accurate. Set the `texture` field (`smooth`, `grain`, `vellum`, `gesso`, etc.) so the preview can layer the right texture overlay. Paper colour is driven only from config; there’s no manual paper-colour control in the UI. `client/js/utils/paperUtils.js` already exposes helpers for colour/texture and plotter warnings—reuse those instead of duplicating math in `main.js`.
- Medium definitions live in `config/mediums.json`; store preview hints inside `preview` (`pressure`, `hatchSpacing`, `jitter`, `bleedRadius`) and plotter tuning inside `plotterDefaults` (`penRateLower` baseline). When you add a new medium, ensure colors, preview values, and pen-rate defaults are all present.
- Plotter definitions belong in `config/plotters.json`; each entry needs at least `model`, `penlift`, and a `paper` object (width/height). Update `default` to swap hardware, and keep the JSON in sync with any hard-spec edits you make to `server/plotter_config.py`.
- The preview/plotter system merges paper + medium metadata via `client/js/utils/paperProfile.js`. Add or update overrides there (both visual and `PAPER_MEDIUM_PLOTTER_OVERRIDES`) whenever a new stock/pen combination needs special casing.
- Mirror any new combination in `drawings/shared/__tests__/previewProfile.test.js` so Vitest guards the heuristics. Tests must hoist mocks for `mediumMetadata`.
- Preview filters are applied only for the on-screen SVG. `previewEffects.js` must not mutate exported SVGs; add or update tests if you change that logic.

### Control Panel UX
- The “Drawing Settings” and “Paper & Margin” sections in `client/templates/plotter.html` are collapsible; keep them wrapped in the existing `collapsible` markup + toggle pattern so the control stack doesn’t push other dialogs off-screen. Use `registerSectionToggle` in `client/js/main.js` when wiring new collapsible panels.
- The Medium section is also collapsible and now exposes a multi-select (`#mediumColorSelect`) for disabling pens on the fly; keep the helper text + `aria-describedby` wiring intact so users know selected entries are disabled.
- The stroke-width block was removed from the UI because stroke width purely follows the selected medium. Don’t reintroduce a dedicated panel; reflect the width through logging/state only.

### Adding a New Drawing
1. Create `drawings/<core|community>/<name>.js` exporting a `defineDrawing` plus optional `attachControls` setup. Use existing modules (e.g., `drawings/core/calibration.js`) as templates.
2. Register at least one preset so the drawing appears in the UI by default.
3. Update `drawings/manifest.json` (or run `npm run build:drawings`) to include the new module, then add targeted unit tests in `drawings/__tests__` if behaviour is complex.
4. Document user-facing features in README/CHANGELOG when appropriate.

## Testing Guidelines
Use Vitest for client and drawing helpers; colocate specs as `*.test.js` under `client/js/__tests__` or a sibling `__tests__` directory near the module. For every new drawing or utility, add focused tests that stub paper configs the way `drawingRegistry.test.js` does. Aim for deterministic seeds, and cover boundary cases such as margin parsing or layer toggles. When changes touch the Python server, add integration mocks or doc updates explaining manual verification until a Python test harness is added.

## Commit & Pull Request Guidelines
Follow the Conventional Commit-style prefixes already in history (`feat:`, `fix:`, `chore:`). Provide imperative, present-tense summaries, e.g., `feat: add hilbert noise drawing`. PRs should describe the user-facing impact, link related GitHub issues, and include screenshots or SVG snippets when UI or output changes are visible (attach `ui-screenshot.png` updates when relevant). Note any manifest or config migrations in the PR body so reviewers know to regenerate assets, and tick off TODO items or docs you touched.

## Art Direction
- Assume every plot should maximize color usage. Prefer multi-layer treatments, dense fills, and rich palettes over minimalist strokes so the final SVG leaves little or no paper showing through.
- When tuning defaults or adding controls/presets, bias toward higher coverage (e.g., tighter spacing, more offsets, broader hatch fills) unless the user explicitly asks for negative space.
- When disabling colors temporarily (via the Medium multi-select), keep in mind the overall goal is still full-paper coverage—ensure the remaining palette can span many layers so the artwork feels saturated.
