# Jupiter Jayna's Plotter Art Control Centre
*A plotter-first generative art workstation that goes from browser math to multi-pen AxiDraw output without leaving the keyboard.*

If you have an AxiDraw (or any plotter that can digest SVG layers) and love algorithmic art, this repo gives you a complete local studio: mm-accurate previews, color-aware layering, a Python server that proxies the axicli, and a set of battle-tested drawing algorithms (Bouwkamp perfect squares, Delaunay triangulations, Hilbert curves). Everything ships as source, so you can bend it to your own plotting rituals or hack on it live during a stream.

![Plotter Art UI](ui-screenshot.png)

> Optimized for the AxiDraw SE/A3 (penlift 3, SE servo), but nothing prevents you from wiring in another model by editing `server/plotter_config.py`.

## Why This Tool Exists

- **Bridges UI + hardware** - front-end sliders talk to a Python server that shells out to `axicli`, streaming progress back over SSE, so you can iterate fast without babysitting the machine.
- **Obsessive paper + pen modeling** - paper margins, nib widths, and medium presets are first-class citizens, so the SVG matches the sheet on your desk.
- **Algorithm playground** - the drawing registry is tiny, modern JavaScript; adding a new tiling or curve takes one module and hot reload.
- **Transparency-first** - no cloud, no hidden binaries; everything from the Makefile to the SSE heartbeat loop is readable and hackable.

## What Ships in This Repo

- **Client** - vanilla JS + CSS app (`client/js`, `client/templates`) with live preview, layer toggles, debug console, and mm ruler overlay.
- **Server** - Python `http.server` wrapper (`server/server.py`) that serves the UI, streams `/plot-progress`, and runs `bin/axicli` commands for each layer.
- **Shared data** - `shared/paper_config.json` and `shared/medium_config.json` describing margins, stroke widths, nib metadata, and color palettes.
- **Output pipeline** - timestamped SVGs in `output/` with configuration comments plus Inkscape-compatible layers ready for plotting or archival.
- **Docs + tooling** - Makefile, Vitest setup, TODO/CHANGELOG/CONTRIBUTING, and a reference screenshot so people know what they’re installing.
- **Drawings** - a top-level `drawings/` directory split into `core/` (maintained algorithms), `community/` (user-contributed experiments), and `shared/` helpers so contributions don’t need to dig through the client bundle.

```
├── client/
│   ├── js/…                 # Drawing registry, color utils, configs
│   ├── static/css/styles.css
│   └── templates/plotter.html
├── drawings/
│   ├── core/                # First-party drawing definitions
│   ├── community/           # User contributed drawings
│   └── shared/              # Config bases + helpers + adapters
├── server/
│   ├── server.py            # HTTP + axicli bridge + SSE
│   ├── plotter_config.py    # Pen heights, penlift, model ids
│   └── server_runner.py     # Dev server with autoreload
├── shared/
│   ├── paper_config.json    # ISO + Bristol presets w/ margins
│   └── medium_config.json   # Pen brands, nib widths, stroke styles
└── Makefile / tests / docs  # Tooling, Vitest config, server docs
```

## Quick Start (macOS, local-first)

### Prerequisites

- macOS (project currently tested on Apple Silicon)
- Python 3.x
- Node.js 18+
- Git, Make, and a modern browser
- An AxiDraw SE/A3 (recommended) or any plotter that consumes layered SVGs

### Bootstrap the dev environment

```bash
make install   # virtualenv + pip deps + npm install
make run       # serves http://localhost:8000 with live reload
```

Then open <http://localhost:8000>, pick a drawing preset, tweak the sliders, and hit “Save SVG” or “Plot layer”.

### Tests & linting

```bash
make test      # runs the Vitest suite (client + helpers)
```

### Useful Make targets

| Command      | What it does                                                        |
|--------------|---------------------------------------------------------------------|
| `make install` | Sets up the Python venv and installs npm deps                       |
| `make run`     | Launches the Python dev server with live reload                     |
| `make dev`     | Shortcut for `install` + `run`                                      |
| `make test`    | Executes Vitest (JS unit tests)                                     |
| `make clean`   | Removes temp files, venv, and `node_modules`                        |

## Plotting Pipeline

1. **Pick a drawing** - Bouwkamp codes, Delaunay triangulations, or Hilbert curves ship as presets; each exposes paper, margin, and color controls.
2. **Preview in mm** - the UI shows paper outlines, rulers, and margin sliders so the SVG framing matches your tape on the physical board.
3. **Generate layered SVG** - the client writes an Inkscape-ready SVG where each color sits in its own layer with stroke widths pulled from the selected medium preset (e.g., Sakura 0.45 mm round tip, Molotow ONE4ALL 2 mm).
4. **Stream to hardware** - pressing “Plot layer” posts the SVG + layer id to `/plotter`; the Python server writes a temp file, shells out to `bin/axicli`, and forwards stdout/stderr lines as SSE events.
5. **Monitor progress** - the log panel shows real-time output, estimated times, and completion/error markers; SSE keeps the UI hot even if the process is long-running.
6. **Archive outputs** - every successful save lands in `output/<drawing>/<timestamp>.svg` with configuration comments so you can reproduce the run later.

## Drawing Algorithms & Customization

Drop new experiments in `drawings/core/` (first-party) or `drawings/community/` (user-contributed) and they auto-register with the UI on the next reload. Each module exports a definition built with `defineDrawing`, so there’s very little wiring:

```javascript
import { defineDrawing, SizedDrawingConfig, createDrawingRuntime, colorPalettes } from '../shared/kit.js';

class MoireConfig extends SizedDrawingConfig {
  constructor(params = {}) {
    super({ width: 420, height: 297, ...params });
    this.seed = params.seed ?? 42;
  }
}

function drawMoireGrid(drawingConfig, renderContext) {
  const { svg, builder } = createDrawingRuntime({ drawingConfig, renderContext });
  // build geometry, append paths, etc.
  return svg;
}

export const moireDrawing = defineDrawing({
  id: 'moireGrid',
  name: 'Moire Grid',
  configClass: MoireConfig,
  drawFunction: drawMoireGrid,
  presets: [
    {
      key: 'moireDefault',
      name: 'Moire Default',
      params: {
        type: 'moireGrid',
        seed: 42,
        line: { strokeWidth: 0.45 },
        colorPalette: colorPalettes.sakuraPalette
      }
    }
  ]
});
```

- **Hot reload** - `server/server_runner.py` watches files so your new drawing appears after a save.
- **Constraint-aware helpers** - shared adapters expose color, geometry, and SVG utilities so modules don’t need deep client imports.
- **Paper + medium presets** - drop in a new pen brand or sheet size via JSON and it immediately appears in the UI selectors.

## Color & Multi-Pen Layering

- Smart palette selection prevents adjacent fills from sharing a color, reducing smears on real paper.
- Layers map directly to pen labels (e.g., `Black-0.5mm`, `Copper-2mm`), so you can queue them in AxiDraw’s layer mode.
- Medium presets store nib geometry, stroke widths, and suggested pressure settings, matching actual pen behavior.
- Margin slider locks framing numerically + visually, so orientation swaps keep the artwork centered on both portrait and landscape sheets.

## Server & Plotter Controls

- `server/server.py` extends `SimpleHTTPRequestHandler`, serving the UI and exposing JSON commands at `/plotter`.
- Supported commands include `plot`, `stop_plot`, `raise_pen`, `toggle`, `align`, `cycle`, `home`, and `disable_motors` (see `docs/server_commands.md` for payloads).
- `/plot-progress` streams Server-Sent Events with heartbeats plus `PLOT_COMPLETE` / `PLOT_ERROR` markers so the UI can recover automatically.
- `plotter_config.py` defines model numbers, servo behavior, and pen heights for each supported device; switch models by editing `CURRENT_PLOTTER`.

## Roadmap & Known Issues

This is live code, and we keep the paper cuts documented:

- `/plot-progress` currently uses a single-threaded `HTTPServer`; long-lived SSE requests block other endpoints until we move to `ThreadingHTTPServer` or a worker thread.
- Plot streaming reads `axicli` stderr synchronously; if stderr blocks, stdout stalls and the subprocess can hang. Needs non-blocking IO.
- Static asset and SVG export endpoints trust path parameters, allowing `../` traversal. We need canonicalization + validation.
- Auto-refresh in `client/templates/plotter.html` can fire overlapping async `draw()` calls. Guard refreshes with an “in-flight” flag.
- Python server endpoints (`/plotter`, `/plot-progress`, `/save-svg`) lack automated tests; coverage is on the TODO list.

Additional backlog items live in `TODOs.md`.

## Community, Support & Contributions

- Check or open issues on GitHub: <https://github.com/sdjayna/super-duper-octo-robot/issues>
- Contribution guidelines cover workflow, docs, and code style: [CONTRIBUTING.md](CONTRIBUTING.md)
- For support, please include browser version, error logs, reproduction steps, and (if relevant) the SVG configuration snippet with your issue.

## License & Credits

- MIT License - see [LICENSE](LICENSE)
- Uses Evil Mad Scientist’s AxiDraw CLI (`bin/axicli`) under their terms.
- Huge thanks to C.J. Bouwkamp for the perfect square research, the Clipper library for polygon ops, and the broader algorithmic art community for years of shared techniques.
- Developed by Jupiter Jayna with heavy inspiration from acrylic plotter workflows; sample work: <https://plotter.art>

## Built with AI Pair Programming

Development leaned on AI copilots (aider.chat, DeepSeek R1, Claude 3 Sonnet) for fast iteration while keeping humans in the loop for aesthetics, safety, and hardware testing.
