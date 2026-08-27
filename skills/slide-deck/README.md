# slide-deck

Generate professional, **editable** `.pptx` decks (via [pptxgenjs](https://gitbrent.github.io/PptxGenJS/))
that embed **animated-infographic** GIFs as hero visuals.

## Quick start
```bash
cd ~/.claude/skills/slide-deck
npm install
node render-deck.mjs examples/sample-deck.json --out ./out
```
Outputs:
- `out/<name>.pptx` — the editable deck (animated GIF embedded on diagram slides)
- `out/assets/` — the generated hero GIF/PNG assets
- `out/<name>-preview.png` — an **approximate** contact sheet for quick QA (final rendering in PowerPoint)

## How it works
`render-deck.mjs` reads a `deck.json`, and for each slide with a `visual.spec` it invokes the sibling
**`animated-infographic`** renderer (`../animated-infographic/render.mjs`) to produce a GIF + PNG, then
builds the deck with **pptxgenjs** using one layout builder per slide type
(`title`, `section`, `bullets`, `two-column`, `hero-visual`, `stat`, `comparison`, `quote`, `closing`).
A Chromium contact-sheet preview (reusing the animated-infographic skill's Chromium) gives best-effort
QA on machines without LibreOffice.

See [`SKILL.md`](SKILL.md) for the full `deck.json` schema, design rules, and limitations.

## Dependencies
- `pptxgenjs` (npm, installed here)
- The **`animated-infographic`** skill installed alongside (for hero visuals + preview). No
  LibreOffice/Python required.

## Limitations
- The final `.pptx` can't be visually rendered on a box without LibreOffice — the preview is an
  approximation; open the deck in PowerPoint for the real thing.
- Embedded GIFs animate in PowerPoint 2016+/365 and LibreOffice Impress; older viewers / Google Slides
  show the GIF's first frame (poster).
- Creates fresh decks; does not edit existing `.pptx`.
