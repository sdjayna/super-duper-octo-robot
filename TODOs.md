# TODOs

## Known Issues

- Add visual regression to ensure preview/export parity stays intact

## High Priority

1. Finalize paper/medium handling ✅
   - Centralize paper configuration management ✅
   - Add paper size validation (pending)
   - Improve margin handling consistency ✅
   - Add paper size preview in UI (pending)
   - Standardize paper size changes across drawing types ✅

2. Lower the barrier for new drawings
   - Autoload drawing modules (no manual imports)
   - Provide a CLI or scaffold script (`npm run scaffold:drawing`)
   - Surface per-drawing settings in UI (spacing, vertex gap, etc.)
   - Document registry/helpers in CONTRIBUTING

3. Enhance hatching algorithms for Simple Perfect Rectangle
   - Add parallel line hatching
   - Add cross-hatching
   - Add contour hatching
   - Add stippling
   - Make hatching type configurable per drawing instance
   - Add hatching angle control
   - Add density/spacing controls

## Medium Priority

4. Finish testing story
   - Add integration tests (UI ↔ server)
   - Add visual regression tests

5. TypeScript adoption (longer-term)
   - Convert core files to TypeScript
   - Add type definitions
   - Add compile-time checks

## Low Priority

6. Documentation improvements
   - Add API documentation
   - Improve code comments
   - Add examples for custom drawings (with registry workflow)
