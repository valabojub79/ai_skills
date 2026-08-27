---
name: slide-deck
description: Generate a professional, editable PowerPoint (.pptx) deck whose content slides feature animated infographics from the animated-infographic skill. Builds real editable slides (titles, bullets, columns, stat callouts, comparisons) with pptxgenjs and embeds animated GIF diagrams as hero visuals. Use when the user asks to create slides, a presentation, a pptx/PowerPoint deck, a talk, or a slide-based explainer. Not for editing an existing .pptx (this creates fresh decks).
---

# Slide Deck

Turn a topic + outline into an **editable `.pptx`** (via pptxgenjs) with **animated-infographic GIFs as
the hero visuals** on content slides. Hybrid: native editable text/shapes + our rendered diagrams.

## Requirements & one-time setup
```bash
cd ~/.claude/skills/slide-deck && npm install     # installs pptxgenjs
```
- Reuses the sibling **`animated-infographic`** skill (must be installed at `~/.claude/skills/
  animated-infographic/` with its `node_modules` + Chromium) to render hero visuals and the preview.
- No LibreOffice/Python needed. (This box has none — see Limitations.)

## Workflow
0. **Design-brief first.** Decide the **narrative arc** and the **one message per slide** before
   authoring. Vary layouts across the deck; every slide should carry a visual, stat, or structure —
   no bare text-only slides. Lead with the highest-impact point; cite a `source` on data slides.
1. **Author `deck.json`** (schema below): deck-level title/theme + a `slides[]` array. Pick a
   **topic-specific palette** (a dominant color at 60–70%, 1–2 supporting tones, one accent — avoid
   default blue-on-white unless it fits).
2. For any slide that benefits from a diagram, add a `visual.spec` — a normal **animated-infographic
   spec** (any template, or `rawHtml`). It renders to a GIF (motion) + PNG (poster) and becomes the
   slide's hero.
3. **Build:** `node render-deck.mjs deck.json --out <dir>` → writes `<name>.pptx`, the generated hero
   assets under `out/assets/`, and `<name>-preview.png` (an **approximate** contact sheet for QA here).
4. **Review** the preview PNG for overflow/content; iterate on `deck.json`. Final visual QA is in
   PowerPoint (this box can't render `.pptx`).

## `deck.json` schema
```jsonc
{
  "title": "Deck title", "subtitle": "…", "author": "…",
  "theme": { "dominant": "#0B3D91", "supporting": ["#2563EB"], "accent": "#EA580C",
             "bg": "#ffffff", "text": "#0f172a" },
  "slides": [
    { "layout": "title",       "title": "…", "subtitle": "…", "author": "…" },
    { "layout": "section",     "title": "…" },
    { "layout": "bullets",     "title": "…", "bullets": ["…","…"], "notes": "speaker notes" },
    { "layout": "two-column",  "title": "…", "bullets": ["…"], "caption": "…",
      "visual": { "spec": { "template": "comparison", "sections": [ … ] } } },
    { "layout": "hero-visual", "title": "…", "caption": "…",
      "visual": { "spec": { "template": "dataflow", "zones": [ … ] } } },
    { "layout": "stat",        "title": "…", "stats": [ { "value": "5×", "label": "smaller GIFs" } ] },
    { "layout": "comparison",  "title": "…", "columns": [ { "heading": "A", "items": ["…"] }, … ] },
    { "layout": "quote",       "title": "the quote text", "author": "attribution" },
    { "layout": "closing",     "title": "…", "bullets": ["…"], "source": "…" }
  ]
}
```
- **Layouts:** `title`, `section`, `bullets`, `two-column`, `hero-visual`, `stat`, `comparison`,
  `quote`, `closing`. Mix them — don't repeat one layout back-to-back.
- **`visual`:** `{ "spec": {…animated-infographic spec…} }` (rendered), or `{ "rawHtml": "file.html" }`,
  or `{ "image": "path.gif|png" }` for a pre-made asset. `hero-visual` renders 16:9 (1600×900);
  `two-column` renders a portrait hero (900×1050).
- **`notes`:** speaker notes (added via `addNotes`, not on the slide).

## Design rules (baked into the layouts)
Left-align body text (center only title/section); 0.5" margins, 0.3–0.5" gaps; palette dominance; no
accent stripes/underlines; large stat callouts, comparison columns; **safe fonts** for native text
(Calibri) — the deck's fancy typography lives *inside* the rendered infographic images. Speaker notes,
not text boxes, for narration.

## Motion & viewers
The hero **GIF animates in PowerPoint 2016+/365 and LibreOffice Impress** slideshow; older viewers and
Google Slides show the GIF's **first frame** (the poster). Keep hero infographics using the readable
"content static, connectors flow" style so the poster frame still reads well.

## Limitations (be honest with the user)
- **No final-deck visual QA here** (no LibreOffice). The `-preview.png` contact sheet is an
  *approximation* of layout/content — the real rendering is in PowerPoint.
- Native slide **text uses the viewer's installed fonts** → safe fonts only for pptxgenjs text.
- This skill **creates** decks; it doesn't edit existing `.pptx` (for that, use Anthropic's `pptx`
  skill's unpack→edit-XML flow, which needs python-pptx/LibreOffice).

## CLI
`node render-deck.mjs <deck.json> [--out DIR] [--name SLUG] [--no-preview]`
