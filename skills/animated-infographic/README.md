# animated-infographic

A Claude Code skill that turns a topic + content into a polished **animated GIF / APNG** or
**static PNG / JPEG** infographic — LinkedIn/X "carousel" style. Renders from code (HTML/CSS) via
headless Chromium; no AI image model required.

## Quick start
```bash
# one-time
cd ~/.claude/skills/animated-infographic && npm install   # see "Chromium" below if it fails

# render
node render.mjs examples/sample-spec.json --out ./out
```
Outputs `<name>.gif`, `<name>.png`, `<name>.jpg` (per the spec's `output.formats`).

## How it works
`render.mjs <spec.json>` → `lib/build-html.mjs` injects content into a `templates/*.mjs` template →
`lib/capture.mjs` drives headless Chrome through a deterministic staged-reveal animation
(`window.__seek(t)`, `t∈[0,1]`) capturing one frame per step → `lib/encode.mjs` encodes them:
GIF via `gifenc`, APNG via `upng-js`, PNG/JPEG (hi-res final frame) via `sharp`.

Templates: **flow** (stage cards + arrows), **ladder** (numbered tiers + formula), **comparison**
(side-by-side columns). See `SKILL.md` for the full spec schema and icon list.

## Chromium
Puppeteer's auto-download needs `unzip`, which isn't on this box. If `npm install` fails to fetch the
browser, a Chrome-for-Testing build was extracted manually to
`~/.cache/animated-infographic-chrome/chrome-linux64/chrome` and `lib/capture.mjs` auto-detects it.
To use a different Chrome, set `PUPPETEER_EXECUTABLE_PATH`.

To re-create the manual Chrome install:
```bash
DEST=~/.cache/animated-infographic-chrome; mkdir -p "$DEST"
curl -fsSL https://storage.googleapis.com/chrome-for-testing-public/<VER>/linux64/chrome-linux64.zip -o "$DEST/c.zip"
python3 -c "import zipfile;zipfile.ZipFile('$DEST/c.zip').extractall('$DEST')"
chmod -R u+x "$DEST/chrome-linux64"   # zipfile drops exec bits; chrome + chrome_crashpad_handler need them
```
(latest `<VER>` from https://googlechromelabs.github.io/chrome-for-testing/last-known-good-versions-with-downloads.json)
