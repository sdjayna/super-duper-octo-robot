# TODOs

## Known Issues

- [ ] Add visual regression to ensure preview/export parity stays intact.
- [ ] `/plot-progress` SSE responses run inside the single-threaded `HTTPServer`, so the long-lived heartbeat loop blocks every other request. Switch to `ThreadingHTTPServer` or push SSE streaming into its own worker thread.
- [x] Plot thread streams both stdout and stderr with blocking `readline()` calls that deadlock when stderr is quiet. Use non-blocking reads (e.g., `select`, `asyncio`, or reader threads). ✓
- [ ] Static asset serving and SVG export trust user-supplied paths/names; `../` segments allow access outside `output/`. Normalize and validate paths.
- [ ] Auto-refresh in `plotter.html` spawns overlapping `draw()` calls. Gate refreshes with an "in-flight" flag so only one render runs at a time.
- [ ] `/resume-status` is polled manually after commands. Push resume availability over SSE (or another async channel) so the UI reflects pause/resume state even when the plotter tab isn’t active.
- [x] Persist per-medium disabled color selections so the new multi-select survives reloads (localStorage or config override). ✓

## High Priority

1. Finalize paper/medium handling  
   - [x] Centralize paper configuration management  
   - [ ] Add paper size validation  
   - [x] Improve margin handling consistency  
- [ ] Add paper size preview/overlay  
- [x] Standardize paper size changes across drawing types  
 - [ ] Surface estimated per-layer travel so the new cap slider is less guesswork  

2. Lower the barrier for new drawings  
   - [x] Autoload drawing modules (manifest-driven)  
   - [ ] Provide a CLI or scaffold script (`npm run scaffold:drawing`)  
   - [x] Surface per-drawing settings in UI (spacing, vertex gap, etc.)  
   - [x] Document registry/helpers in README/CONTRIBUTING  

3. Enhance hatching algorithms for Simple Perfect Rectangle  
   - [x] Add parallel line hatching  
   - [ ] Add cross-hatching  
   - [ ] Add contour hatching  
   - [ ] Add stippling  
   - [x] Make hatching type configurable per drawing instance  
   - [ ] Add hatching angle control  
   - [ ] Add density/spacing controls

## Medium Priority

4. Finish testing story  
   - [ ] Add integration tests (UI ↔ server)  
   - [ ] Add server-side tests for `/plotter`, `/plot-progress`, and `/save-svg`  
   - [ ] Add visual regression tests  
   - [ ] Add DOM-focused tests for collapsible panels + medium color select interactions  

5. TypeScript adoption (longer-term)  
   - [ ] Convert core files to TypeScript  
   - [ ] Add type definitions  
   - [ ] Add compile-time checks  

## Low Priority

6. Documentation improvements  
   - [x] Add high-level README, architecture map, and control examples  
   - [ ] Add API documentation  
   - [ ] Improve code comments in the server/drawing helpers  
   - [ ] Add step-by-step tutorials for custom drawings (with registry workflow)  
