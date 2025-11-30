# Hatching Algorithm Review

Working notes on the current fill routines in `drawings/shared/utils/hatchingUtils.js` so we can align on where each algorithm excels, what geometry it prefers, and whether it minimizes retrace and keeps margins even.

## Scanline (`generatePolygonScanlineHatch`)

- **Best target shapes:** axis-aligned rectangles/squares and any polygon where a horizontal sweep is acceptable.
- **Margins:** uses consistent insets derived from `spacing` both vertically (`startY`/`endY`) and horizontally (`horizontalInset`), so squares keep equal borders on all sides.
- **Retrace risk:** low. The path snakes back and forth, flipping direction each row, and only re-traces when the optional `includeBoundary` loop kicks in at the end.
- **Notes:** For diamond/rotated squares the margins won’t be perpendicular to each edge. If necessary, rotate the geometry before passing it to the hatch helper.

## Serpentine (`generatePolygonSerpentineHatch`)

- **Best target shapes:** tall rectangles or cases where vertical serpentine motion looks better.
- **Margins:** identical behavior to scanline because it simply rotates the polygon 90° before running the scanline routine.
- **Retrace risk:** same as scanline—continuous sweep with an optional boundary pass.
- **Notes:** Use when you need the same even spacing as scanline but along the orthogonal axis.

## Skeleton (`generatePolygonSkeletonHatch`)

- **Best target shapes:** irregular polygons with pronounced vertices (Voronoi cells, triangles, concave shapes).
- **Margins:** not uniform; this routine prioritizes coverage by shooting bisector “spokes” into the interior from each vertex.
- **Retrace risk:** moderate. The path revisits the centroid multiple times but `pushUniquePoint` collapses overlapping samples, so the pen rarely rides the same line twice; expect a single continuous loop.
- **Notes:** Useful when you want a single path per polygon without pen-up travel, even if the inset near each edge varies. Works well for testing corner coverage.

## Contour (`generatePolygonContourHatch`)

- **Best target shapes:** circles, rounded rectangles, and organic blobs where concentric rings make sense.
- **Margins:** maintains even offsets by repeatedly calling `offsetPolygonInward`, rejecting loops that exit or intersect the boundary. Spacing is controlled via `spacing`/`inset` rather than by per-row sweep.
- **Retrace risk:** low. Each ring is continuous; the only overlap happens on the short bridges connecting one ring to the next.
- **Notes:** Narrow channels or sharp corners can halt the offsetting early, so set expectations for how many rings survive. Great for the “hatched circles” study we want to ship.

---

### Next steps

- Validate these notes against actual plots (especially skeleton on skinny polygons).
- When adding new algorithms (cross-hatching, stippling) append a similar section here so we know which drawings should adopt them.
