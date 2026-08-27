#!/usr/bin/env node
// render-deck.mjs — CLI: render-deck.mjs <deck.json> [--out DIR] [--name SLUG]
// Builds an editable .pptx (pptxgenjs) with animated-infographic GIFs as hero visuals.
import { readFile, mkdir } from 'node:fs/promises';
import { resolve, join } from 'node:path';
import pkg from 'pptxgenjs';
import { GEO, resolveTheme, slug } from './lib/theme.mjs';
import { LAYOUTS } from './lib/layouts.mjs';
import { makeVisual, infographicAvailable } from './lib/infographic.mjs';
import { buildPreview } from './lib/preview.mjs';

const PptxGenJS = pkg.default || pkg;

function parseArgs(argv) {
  const a = { _: [] };
  for (let i = 0; i < argv.length; i++) {
    const t = argv[i];
    if (t === '--out') a.out = argv[++i];
    else if (t === '--name') a.name = argv[++i];
    else if (t === '--no-preview') a.noPreview = true;
    else a._.push(t);
  }
  return a;
}

// Pixel size for a slide's hero visual, by layout.
function heroSize(layout) {
  if (layout === 'two-column') return { w: 900, h: 1050 };   // portrait right column
  return { w: 1600, h: 900 };                                 // 16:9 hero
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const deckPath = args._[0];
  if (!deckPath) { console.error('usage: render-deck.mjs <deck.json> [--out DIR] [--name SLUG] [--no-preview]'); process.exit(1); }

  const deck = JSON.parse(await readFile(resolve(deckPath), 'utf8'));
  const T = resolveTheme(deck.theme);
  const outDir = resolve(args.out || '.');
  const assetsDir = join(outDir, 'assets');
  await mkdir(assetsDir, { recursive: true });
  const name = args.name || slug(deck.name || deck.title);

  const pres = new PptxGenJS();
  pres.defineLayout({ name: 'W16x9', width: GEO.W, height: GEO.H });
  pres.layout = 'W16x9';
  pres.author = deck.author || 'slide-deck';
  pres.title = deck.title || name;

  const slides = deck.slides || [];
  console.log(`Building "${deck.title || name}" — ${slides.length} slides`);
  if (!infographicAvailable()) console.warn('  ⚠ animated-infographic renderer not found — hero visuals will be skipped');

  const assetsByIndex = [];
  for (let i = 0; i < slides.length; i++) {
    const s = slides[i];
    let assets = null;
    if (s.visual && (s.visual.spec || s.visual.rawHtml) && infographicAvailable()) {
      process.stdout.write(`  slide ${i + 1}: rendering hero visual…`);
      try {
        assets = await makeVisual(s.visual, heroSize(s.layout), assetsDir, `${name}-s${i + 1}`);
        console.log(' ok');
      } catch (e) { console.log(' FAILED —', e.message.split('\n')[0]); }
    } else if (s.visual && s.visual.image) {
      assets = { gif: resolve(s.visual.image), png: resolve(s.visual.image) };
    }
    assetsByIndex[i] = assets;

    const slide = pres.addSlide();
    const build = LAYOUTS[s.layout] || LAYOUTS.bullets;
    build(pres, slide, s, T, assets, { index: i, total: slides.length, deckTitle: deck.title || name });
    if (s.notes) slide.addNotes(String(s.notes));
  }

  const pptxPath = join(outDir, `${name}.pptx`);
  await pres.writeFile({ fileName: pptxPath });

  let previewPath = null;
  if (!args.noPreview) {
    try { previewPath = await buildPreview(deck, assetsByIndex, T, join(outDir, `${name}-preview.png`)); }
    catch (e) { console.warn('  ⚠ preview skipped:', e.message.split('\n')[0]); }
  }

  console.log('\nWrote:');
  console.log(`  ${pptxPath}`);
  if (previewPath) console.log(`  ${previewPath}   (approximate — final rendering is in PowerPoint)`);
}

main().catch((e) => { console.error(e); process.exit(1); });
