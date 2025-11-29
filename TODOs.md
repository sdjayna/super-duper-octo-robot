# TODOs

## High Priority

1. Finalize paper/medium handling  
   - [x] Centralize paper configuration management  
   - [x] Add paper size validation  
   - [x] Improve margin handling consistency  
   - [x] Add paper size preview/overlay  
   - [x] Standardize paper size changes across drawing types  
   - [ ] Order-safe fill clipping for overlapping polygons: before layer optimization/splitting, compute the visible portion of each polygon (subtract union of those above in the original render order) so color reordering never puts paint on top of paint. Needs robust polygon boolean ops and a fast path for non-overlapping cases.
   - [x] Minimize pen-up travel within each layer: for every color layer, build a graph using polygon centroids/endpoints and reorder the elements via a nearest-neighbor insertion pass (no path reversals) so pen-up moves between polygons/segments shrink.

2. Lower the barrier for new drawings  
   - [x] Autoload drawing modules (manifest-driven)  
   - [ ] Provide a CLI or scaffold script (`npm run scaffold:drawing`)  
   - [x] Surface per-drawing settings in UI (spacing, vertex gap, etc.)  
   - [x] Document registry/helpers in README/CONTRIBUTING  

3. Enhance hatching algorithms  
   - [ ] Acute-angle cleanup pass for serpentine (emit corner “spoke” stitches”): detect polygons/triangles with interior angles below ~30° and, after the serpentine pass, inject a supplemental line aligned to the angle bisector so ink reaches the apex. Should reuse existing path builders so color assignments stay consistent.
   - [x] Skeleton-field hatching: compute a straight-skeleton/medial axis for each polygon, trace a single continuous path that enters/exits via the nearest apex, walks every skeleton branch without lifting the pen, and reorders polygons so the closest apex jump is next. Requires: skeleton library or custom wavefront solver, nearest-apex entry planning, “one toolpath per polygon” guarantee, and UI hook (`hatchStyle: 'skeleton'` + options for spacing/tension).
   - [x] Add parallel line hatching  
   - [ ] Add cross-hatching  
   - [ ] Add contour hatching  
   - [ ] Add stippling  
   - [x] Make hatching type configurable per drawing instance  
   - [ ] Add hatching angle control  
   - [ ] Add density/spacing controls

4. Plotter presets & hardware docs  
   - [ ] Add a dedicated Bantam Tools NextDraw preset (and any popular custom rigs) to `config/plotters.json` with penlift, pen rate, and travel envelope defaults.  
   - [ ] Document the “switching from AxiDraw to NextDraw” workflow (JSON tweaks, servo settings, calibration tips) in README + docs.  
   - [ ] Surface presets in the UI so users can swap hardware without editing JSON.

## Medium Priority

5. Finish testing story  
   - [x] Add integration tests (UI ↔ server)  
   - [x] Add server-side tests for `/plotter`, `/plot-progress`, and `/save-svg`  
   - [ ] Add visual regression tests  
   - [ ] Add DOM-focused tests for collapsible panels + medium color select interactions  
   - [ ] Extend integration coverage to resume logs, stop/start, and multi-layer sequencing.

6. TypeScript adoption (longer-term)  
   - [ ] Convert core files to TypeScript  
   - [ ] Add type definitions  
   - [ ] Add compile-time checks  

## Low Priority

7. Documentation improvements  
   - [x] Add high-level README, architecture map, and control examples  
   - [ ] Add API documentation  
   - [ ] Improve code comments in the server/drawing helpers  
   - [ ] Add step-by-step tutorials for custom drawings (with registry workflow)  
   - [ ] Publish a lightweight “integration test harness” walkthrough so contributors can run the new endpoint suite locally.
