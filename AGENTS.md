# Repository Guidelines

## Project Structure & Module Organization
Source for the browser UI lives in `client/js` with templates under `client/templates/plotter.html` and static assets in `client/static`. Drawing definitions are split between `drawings/core`, `drawings/community`, and shared helpers in `drawings/shared`; rebuild `drawings/manifest.json` whenever you add a module. The Python bridge plus CLI wrappers reside inside `server/` and `bin/`, while paper and medium presets sit in `config/`. Automated tests live beside the client code in `client/js/__tests__`, and generated SVGs are written to `output/` for archival. Preview heuristics live in `client/js/utils/paperProfile.js` and `client/js/utils/previewEffects.js`; any change there should be mirrored with tests under `drawings/shared/__tests__` or `client/js/utils/__tests__`.

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
- When introducing new slider styles (logarithmic, dual-range), keep the data model declarative so the client UI can stay generic.

### Paper, Mediums, and Preview Profiles
- Paper definitions belong in `config/papers.json` and must include descriptive metadata (`description`, `finish`, `absorbency`, `surfaceStrength`, weight, colour). This data is surfaced directly in the UI under the Paper dropdown—keep it accurate.
- Medium definitions live in `config/mediums.json`; store any preview-specific hints inside the `preview` block (`pressure`, `hatchSpacing`, `jitter`, `bleedRadius`).
- The preview system resolves a combined profile per paper/medium pair. Update `client/js/utils/paperProfile.js` when adding new overrides and ensure corresponding tests cover any new branches.
- Preview filters are applied only for the on-screen SVG. `previewEffects.js` must not mutate exported SVGs; add or update tests if you change that logic.

## Testing Guidelines
Use Vitest for client and drawing helpers; colocate specs as `*.test.js` under `client/js/__tests__` or a sibling `__tests__` directory near the module. For every new drawing or utility, add focused tests that stub paper configs the way `drawingRegistry.test.js` does. Aim for deterministic seeds, and cover boundary cases such as margin parsing or layer toggles. When changes touch the Python server, add integration mocks or doc updates explaining manual verification until a Python test harness is added.

## Commit & Pull Request Guidelines
Follow the Conventional Commit-style prefixes already in history (`feat:`, `fix:`, `chore:`). Provide imperative, present-tense summaries, e.g., `feat: add hilbert noise drawing`. PRs should describe the user-facing impact, link related GitHub issues, and include screenshots or SVG snippets when UI or output changes are visible (attach `ui-screenshot.png` updates when relevant). Note any manifest or config migrations in the PR body so reviewers know to regenerate assets, and tick off TODO items or docs you touched.
