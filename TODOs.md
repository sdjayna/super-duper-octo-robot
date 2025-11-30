# TODOs

## Hatching algorithm focus

- [ ] Acute-angle cleanup pass for serpentine fills so skinny polygon tips get stitched without ink gaps.
- [ ] Add cross-hatching as a second-pass option that respects palette/layer counts.
- [ ] Add contour-following hatching that hugs polygon perimeters.
- [ ] Add stippling/pointillism mode with density tied to palette layers.
- [ ] Add user-facing controls for hatching angle and spacing density.
- [ ] Ship a hatched-circles study drawing to ensure round geometry shares the same serpentine improvements as polygons.

## Drawing gallery focus

- [ ] Establish a minimal core gallery: keep only perfect rectangle, photo mosaic, Voronoi, and implicit line walkers (line study) while disabling the rest to concentrate on hatch quality.
- [ ] Rename the remaining drawing modules/files so their titles match the new core subjects for clarity in manifests and UI.

## UX polish

- [ ] Add a hover/scroll zoom mode that magnifies toward the pointer and shows the current zoom percentage for quick resets.
- [ ] Persist the last-used zoom and pan offsets in localStorage so refreshing the UI keeps the same framing.
- [x] Add a focus-layer toggle that dims other palette layers so a single color path can be inspected before plotting.
- [ ] Surface an estimated pen-travel distance and runtime in the Messages panel for better per-plot planning.
- [ ] Provide a stroke-density preview overlay for line drawings to highlight potential smudge zones.
