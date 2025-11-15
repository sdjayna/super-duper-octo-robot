# Jupiter Jayna's Plotter Art Control Centre
*A plotter-first generative art workstation that goes from browser math to multi-pen AxiDraw output without leaving the keyboard.*

If you have an AxiDraw (or any plotter that can digest SVG layers) and love algorithmic art, this repo gives you a complete local studio: mm-accurate previews, color-aware layering, a Python server that proxies the axicli, and a set of battle-tested drawing algorithms (Bouwkamp perfect squares, Delaunay triangulations, Hilbert curves). Everything ships as source, so you can bend it to your own plotting rituals or hack on it live during a stream.

![Plotter Art UI](ui-screenshot.png)

> Optimized for the AxiDraw SE/A3 (penlift 3, SE servo), but nothing prevents you from wiring in another model by editing `server/plotter_config.py`.

## Why This Tool Exists

- **Bridges UI + hardware** - front-end sliders talk to a Python server that shells out to `axicli`, streaming progress back over SSE, so you can iterate fast without babysitting the machine.
- **Obsessive paper + pen modeling** - paper margins, nib widths, and medium presets are first-class citizens, so the SVG matches the sheet on your desk.
- **Algorithm playground** - the drawing registry is tiny, modern JavaScript; adding a new tiling or curve takes one module and hot reload, and any config knobs you expose are surfaced automatically in the “Drawing Settings” panel as sliders, selects, or number inputs.
- **Transparency-first** - no cloud, no hidden binaries; everything from the Makefile to the SSE heartbeat loop is readable and hackable.

## What Ships in This Repo

- **Client** - vanilla JS + CSS app (`client/js`, `client/templates`) with live preview, layer toggles, debug console, and mm ruler overlay.
- **Server** - Python `http.server` wrapper (`server/server.py`) that serves the UI, streams `/plot-progress`, and runs `bin/axicli` commands for each layer.
- **Config data** - `config/papers.json` and `config/mediums.json` describing margins, stroke widths, nib metadata, color palettes, and optional default preview colors.
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
│   ├── shared/              # Config bases + helpers + adapters
│   └── manifest.json        # Prebuilt manifest consumed by the loader
├── server/
│   ├── server.py            # HTTP + axicli bridge + SSE
│   ├── plotter_config.py    # Pen heights, penlift, model ids
│   └── server_runner.py     # Dev server with autoreload
├── config/
│   ├── papers.json          # ISO + Bristol presets w/ margins
│   └── mediums.json         # Pen brands, nib widths, stroke styles
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
| `make dev`     | Installs deps, runs the manifest watcher, and starts the dev server |
| `make test`    | Executes Vitest (JS unit tests)                                     |
| `make clean`   | Removes temp files, venv, and `node_modules`                        |
| `make manifest`| Rebuilds `drawings/manifest.json` after adding drawings             |

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
  controls: [
    {
      id: 'curveDensity',
      label: 'Curve Density',
      target: 'drawingData.seed',
      inputType: 'range',
      min: 2,
      max: 12,
      step: 1,
      default: 6
    }
  ],
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

After dropping a new file in `drawings/core/` or `drawings/community/`, run `make manifest` (or `npm run build:drawings`) so the manifest/loader refreshes without restarting the server. When you use `make dev`, this rebuild happens automatically in the background.

- **Hot reload** - `server/server_runner.py` watches files so your new drawing appears after a save.
- **Constraint-aware helpers** - shared adapters expose color, geometry, and SVG utilities so modules don’t need deep client imports.
- **Paper + medium presets** - drop in a new pen brand or sheet size via JSON and it immediately appears in the UI selectors. Papers can specify an optional `color` (3- or 6-digit hex) that seeds the preview background, and you can override it live with the colour picker that sits next to the Paper dropdown.

### Custom Drawing Controls

Expose any parameter you care about by declaring a `controls` array in your drawing definition. Each entry provides an `id`, `label`, `target` path (for example, `drawingData.level`), and UI metadata (`inputType`, `min`, `max`, `step`, `options`, etc.). The client automatically renders those sliders/selects under **Drawing Settings**, remembers the tweaks per drawing, and reapplies them whenever you change paper, margin, medium, or orientation.

```javascript
controls: [
  {
    id: 'wavyAmplitude',
    label: 'Wavy Amplitude',
    target: 'drawingData.wavyAmplitude',
    inputType: 'range',
    min: 0,
    max: 5,
    step: 0.1,
    default: 1,
    description: 'Offsets Hilbert segments for an organic feel'
  },
  {
    id: 'segmentSize',
    label: 'Segment Size',
    target: 'drawingData.segmentSize',
    inputType: 'number',
    min: 2,
    max: 10,
    step: 1,
    default: 3
  }
]
```

Overrides live alongside the drawing config, so a slider change sticks even if you swap stock, toggle rulers, or revisit the drawing later in the session.

### Preview Paper Colour

Need to simulate black stock or toned paper before the plotter moves? Each paper preset may include an optional `"color": "#fefefe"` property in `config/papers.json`, and the UI now exposes a colour picker plus reset button next to the paper selector. The current colour only affects the preview/export metadata, so feel free to match whatever sheet is taped down without touching the drawing config itself.

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
