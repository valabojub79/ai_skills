---
name: animated-infographic
description: Turn a topic plus content/data into a polished animated GIF / APNG or static PNG / JPEG infographic (LinkedIn/X "carousel" style — flow diagrams, numbered ladders, comparison columns). Renders from code via headless Chromium; no AI image model needed. Use when the user asks to create/generate an infographic, an animated GIF infographic, an explainer graphic, a "carousel" image, or wants something similar to example infographic files. Not for AI-painted/photographic art.
---

# Animated Infographic

Generate animated (GIF / APNG) or static (PNG / JPEG) infographics from user-supplied content.
You write a `spec.json` from the user's topic + points; the bundled renderer turns it into image files.

## What this is good for
Designed, diagram-style infographics: stage flows, numbered tier ladders, and side-by-side
comparisons — clean typography, icons, accent colors, and a staged reveal animation.

**Not** for AI-painted or photographic imagery (no diffusion model here). If the user needs that,
say so and offer an image-generation tool instead.

## One-time setup
The skill needs its npm deps (this downloads Chromium once; requires network):

```bash
cd ~/.claude/skills/animated-infographic && npm install
```

Check whether `node_modules/` already exists before running it. If `npm install` fails to fetch
Chromium, run `npx puppeteer browsers install chrome` in the same dir.

## Workflow
1. **Get the content.** Ask for / read the topic and the key points (or a doc the user points to).
   Keep labels short (1–4 words) and notes to one line — infographics are scannable, not paragraphs.
2. **Pick a template** that matches the structure of the content:
   - `roadmap` — **a connected journey**: Start + numbered stations + Goal, wired by a routed path
     with directional arrows in a serpentine (snake) layout. Use this when the point is *how stages
     connect / evolve into each other* (the most "visual roadmap" option; pairs best with `motion`).
     Each station shows a number, title, one-line sub, and `items` rendered as small tool chips.
   - `flow` — a process with stages and steps (icon nodes + arrow connectors). Multiple stage cards.
   - `ladder` — levels/tiers that build up, optionally to a final "formula" row.
   - `comparison` — 2–3 things contrasted in side-by-side columns.
   - `dataflow` — **a zoned top-down data-flow diagram** (like a Mermaid `graph TD` with subgraphs).
     Stacks labeled `zones`, each holding one or more `rows` of nodes; connectors between consecutive
     rows are auto-inferred (1→N diverge, N→1 converge, N→N parallel pair, else all-to-all). Best for
     technical pipelines/architectures with grouped stages and branching. Pairs with `animation: motion`
     (data streams down the flow). Schema: `zones:[{label, tag?, color, rows:[[{label, icon, sub?,
     code?, color?, edgeLabel?, edgeTone?}]]}]`; `edgeLabel` is SOURCE-side (annotates edges leaving
     that node), `edgeTone:"warn"` tints it amber.
   - `poster` — **a dense multi-section poster**: stacks several `blocks` under section headers.
     Each block has a `kind`: `steps` (icon/logo row + arrows), `cards` (grid of cards with chips),
     `columns` (mini side-by-side lists), `callouts` (row of benefit/stat tiles). Use for the busy
     "everything in one image" originals. Pairs with `animation: reveal`.
3. **Write `spec.json`** (see schema below). Choose 2–3 accent colors and an `icon` name per item
   from the icon set listed below.
4. **Render** into the user's working directory:
   ```bash
   node ~/.claude/skills/animated-infographic/render.mjs /path/to/spec.json --out "$PWD/out"
   ```
5. **Show the result.** Read/open the output files so the user can see them, and offer quick tweaks
   (colors, fps, template, formats, longer/shorter animation).

## Spec schema
```jsonc
{
  "template": "flow | ladder | comparison",
  "width": 800, "height": 1000,                  // portrait carousel by default
  "eyebrow": "SECTION LABEL",                                 // optional small tracked label above title
  "title": "Main headline",
  "titleHtml": "Use <span class=\"hl\">accent</span> words",  // optional; overrides title, allows highlight
  "subtitle": "One-line deck", "author": "name / handle", "footer": "CTA bar text",  // all optional
  "theme": { "accent": "#FF5722", "accent2": "#22A06B", "accent3": "#2D7FF9",
             "bg": "#ffffff", "text": "#1d2330" },           // hex; only accent is required
  "output": { "formats": ["gif","png"], "animation": "reveal",
              "fps": 12, "durationSec": 4, "holdSec": 1.1, "loop": true, "jpegQuality": 92,
              "preset": "web", "colors": 200, "lossy": 30, "gifScale": 1 },  // gif encoding (see below)
  "sections": [
    { "heading": "Stage / Tier / Column name",
      "color": "accent | accent2 | accent3 | #hex",
      "sub": "optional one-liner (ladder/comparison)",
      "number": 1,                                            // optional, ladder only
      "transition": "edge label",                             // roadmap only: label on the arrow INTO this station
      "annotation": { "tone": "info|warn|danger|success", "badge": "Watch out",
                      "text": "explain the WHY", "icon": "flag" },  // roadmap only: side-panel callout
      "items": [ { "icon": "target", "label": "Specify Task", "note": "optional one-liner" },
                 { "logo": "github", "label": "GitHub" } ] }   // use "logo" for a brand/tool mark
  ],
  "blocks": [ /* poster template only — see the poster entry above for block kinds */ ],
  "formula": ["LLM", "Knowledge", "Production AI"],           // optional, ladder only: A + B = result
  "columns": 2,                                               // roadmap only: stations per row (snake)
  "stagger": 0,                                               // roadmap only: px offset of odd columns → visible curved connectors (needs extra height)
  "start": { "label": "Start", "icon": "flag" },              // roadmap only: entry terminal
  "goal":  { "label": "Production Agent", "sub": "Ship it", "icon": "rocket", "color": "accent" }  // roadmap only: exit terminal
}
```
- `formats`: any of `gif` (animated), `apng` (animated, sharper/bigger; written as `*.apng.png`),
  `png` (static, hi-res), `jpg` (static, hi-res). Default `["gif","png"]`.
- `animation` (default `reveal`):
  - `reveal` — one-shot staged slide-in of each block, then a `holdSec` pause. Good for a "builds up" feel.
  - `motion` — **the content stays completely still and readable; only the connectors flow**
    (the roadmap path / the ladder's accent rail march with a seamless looping dash). This matches how
    polished infographic GIFs animate — ~0.5% of pixels change per frame. **Do NOT animate the boxes
    themselves** (no scaling/glowing/sweeping of cards or text — it makes content jitter and is hard to
    read). Use `fps` 20, `durationSec` ~1.5 (≈30 frames) for the reference cadence.
- Frame count `= round(fps * durationSec)`. More frames = smoother but larger GIF (motion changes most
  pixels each frame, so keep loops short).
- **GIF encoding** (borrowed from the claude-gif skill): if FFmpeg is present (vendored via npm) the GIF
  is encoded with a two-pass palette (`palettegen`/`paletteuse`) and optimized with gifsicle — ~10–15×
  smaller than the pure-JS fallback at the same quality (e.g. 1.9 MB → 113 KB). Falls back to `gifenc`
  automatically if the binaries are missing.
  - `preset`: `discord` (≤256 KB), `slack` (≤500 KB), `twitter` (≤15 MB), `web` (≤1.5 MB), `hq` (lossless).
    Sets target size + colors + lossy + scale, and shrinks to fit the budget.
  - `colors` (max palette, default 200), `lossy` (gifsicle lossy level, default 30; higher = smaller),
    `gifScale` (downscale factor for the GIF only; static PNG/JPEG stay full-res).

## CLI flags (override the spec without editing JSON)
`render.mjs <spec.json>` accepts: `--out DIR`, `--name SLUG`, `--preset discord|slack|twitter|web|hq`,
`--format gif,png`, `--animation reveal|motion`, `--lossy N`, `--fps N`, `--colors N`,
`--gif-scale F`, `--duration SEC`, `--width N`, `--height N`, `--html`, `--no-validate`. Flags win over `output`.
Example: `node render.mjs spec.json --out ./out --preset discord --format gif`.

## Raw-HTML mode (scripted explainer / walkthrough animations)
For animations that *teach a mechanism* (moving tokens, step-by-step simulation) rather than present
static content — e.g. "how does this algorithm actually decide?" — a template's ambient motion isn't
enough. Author a self-contained HTML file that defines `window.__seek(t)` (t∈[0,1] → sets element
positions/state deterministically for that frame; keep the diagram static and move small tokens +
captions), then render it through the same GIF pipeline:
```bash
node render.mjs --raw-html FILE.html --out DIR --name SLUG \
  --width 960 --height 1100 --format gif,png --fps 15 --duration 13 --preset web
```
Pattern: define per-token position keyframes `[[t,x,y,scale,opacity],…]`, interpolate with smoothstep in
`__seek`, drive a caption bar through timed "scenes", and use color/pulse for state changes (e.g. a
request whose deadline expires). Example: `recreations/mq-deadline-explainer.html` (mq-deadline I/O
scheduler — requests dispatch in LBA order until one expires and the FIFO overrides). `--animation
reveal` adds a ~1s hold on the final frame; `motion` loops seamlessly.

## Spec validation
Every render validates the spec first: unknown `template`/`preset`/`format`/`animation`, bad poster
`kind`, and unknown `icon` names are reported with "did you mean…?" suggestions. Errors (invalid
template/preset/format) abort; warnings (unknown icon → falls back to sparkles, non-hex theme color,
missing heading) print but continue. Pass `--no-validate` to skip.

## Brand / tool logos
Items take `"logo": "<name>"` instead of `"icon"`. Drop real SVGs in `logos/<name>.svg` (they win);
otherwise a brand-colored monogram tile is used. See `logos/README.md` for the built-in brand list.

## Icon names
`target, database, layers, folder, rocket, chart, trending, search, check, refresh, wrench, tools,
brain, cpu, network, book, code, mail, shield, zap, users, settings, sparkles, file, branch, cloud,
terminal, link, bulb, lock, eye, flag, clock, arrow`. Unknown names fall back to `sparkles`.

## Design system (templates/base.css)
Refined editorial-tech look: display font **Bricolage Grotesque** + body **Hanken Grotesk**,
atmospheric background (tint wash + faint dot grid), white cards with layered soft shadows and a
colored top/left accent, filled tinted **icon badges** (`.ibadge`) instead of bare line icons, and a
gradient footer bar. Keep this language when adding templates: depth + color-blocking + strong type,
content always static. Per-infographic palette is set via `theme` — vary the accent so designs don't
all look the same (avoid defaulting to purple-on-white).

## Tips
- 3–7 items per section reads best; more than ~7 gets cramped at 800×1000.
- For a wider/landscape look set `"width": 1200, "height": 675`.
- GIF keeps file size down (256-color, 1× scale); use `apng` when you need full-color gradients.
- Quick preview: add `--html` to also dump the rendered HTML next to the images.

## Adding a template
Drop a `templates/<name>.mjs` exporting `css` and `render(spec, { esc, icon })`, then reference it
via `"template": "<name>"`. Reuse `renderHeader` / `renderFooter` from `templates/flow.mjs`.
