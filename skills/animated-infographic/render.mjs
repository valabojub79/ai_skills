#!/usr/bin/env node
// render.mjs — CLI: render.mjs <spec.json> [--out DIR] [--name SLUG]
// Turns an infographic spec into animated GIF / APNG and/or static PNG / JPEG.
import { readFile, writeFile, mkdir, rm, rename, stat } from 'node:fs/promises';
import { join, resolve, basename } from 'node:path';
import { buildHtml } from './lib/build-html.mjs';
import { captureFrames } from './lib/capture.mjs';
import { encodeGif, encodeApng, encodePng, encodeJpeg } from './lib/encode.mjs';
import { resolveBinaries, encodeGifFFmpeg, fitToBudget, gifsicleOptimize, PRESETS } from './lib/encode-ffmpeg.mjs';
import { validateSpec } from './lib/validate.mjs';

// Named canvas sizes (platform-ready). Borrowed from common infographic presets.
const SIZES = {
  'instagram-post': [1080, 1080], 'instagram-story': [1080, 1920], 'pinterest': [1000, 1500],
  'twitter': [1200, 675], 'linkedin': [1200, 627], 'facebook': [1200, 630],
  'a4': [2480, 3508], 'letter': [2550, 3300], 'blog': [800, 1000], 'landing': [1200, 900],
};

const VALUE_FLAGS = {
  '--out': 'out', '--name': 'name',
  '--preset': 'preset', '--format': 'format', '--formats': 'format',
  '--animation': 'animation', '--lossy': 'lossy', '--fps': 'fps',
  '--colors': 'colors', '--gif-scale': 'gifScale', '--duration': 'duration',
  '--width': 'width', '--height': 'height', '--size': 'size', '--raw-html': 'rawHtml',
};
function parseArgs(argv) {
  const a = { _: [] };
  for (let i = 0; i < argv.length; i++) {
    const t = argv[i];
    if (t === '--html') a.html = true;             // dump HTML for debugging
    else if (t === '--no-validate') a.noValidate = true;
    else if (VALUE_FLAGS[t]) a[VALUE_FLAGS[t]] = argv[++i];
    else a._.push(t);
  }
  return a;
}

// CLI flags override the spec's output/dimensions so size can be re-targeted without editing JSON.
function applyOverrides(spec, args) {
  spec.output = spec.output || {};
  const o = spec.output;
  if (args.preset) o.preset = args.preset;
  if (args.format) o.formats = args.format.split(',').map((s) => s.trim()).filter(Boolean);
  if (args.animation) o.animation = args.animation;
  if (args.lossy != null) o.lossy = Number(args.lossy);
  if (args.fps) o.fps = Number(args.fps);
  if (args.colors) o.colors = Number(args.colors);
  if (args.gifScale) o.gifScale = Number(args.gifScale);
  if (args.duration) o.durationSec = Number(args.duration);
  // named size preset sets canvas dims (explicit width/height still win)
  if (args.size) spec.size = args.size;
  const sz = SIZES[spec.size];
  if (sz) { if (spec.width == null) spec.width = sz[0]; if (spec.height == null) spec.height = sz[1]; }
  if (args.width) spec.width = Number(args.width);
  if (args.height) spec.height = Number(args.height);
}

const slugify = (s) => (s || 'infographic').toLowerCase()
  .replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 48) || 'infographic';

async function main() {
  const args = parseArgs(process.argv.slice(2));

  // Raw-HTML mode: render a bespoke scripted animation (must define window.__seek(t))
  // straight through the capture + encode pipeline — for explainer/simulation animations
  // that don't fit a template. Sizing/output come from flags.
  let spec, rawHtml = null;
  if (args.rawHtml) {
    rawHtml = await readFile(resolve(args.rawHtml), 'utf8');
    spec = { output: {} };
    applyOverrides(spec, args);
    spec.width = spec.width || 960;
    spec.height = spec.height || 1100;
    if (!spec.output.animation) spec.output.animation = 'motion';
  } else {
    const specPath = args._[0];
    if (!specPath) {
      console.error('usage: render.mjs <spec.json> [--out DIR] [--name SLUG] [--preset NAME]\n' +
        '       [--format gif,png] [--animation reveal|motion] [--lossy N] [--fps N]\n' +
        '       [--colors N] [--gif-scale F] [--duration SEC] [--width N] [--height N]\n' +
        '   or: render.mjs --raw-html FILE.html --width N --height N [output flags]');
      process.exit(1);
    }
    spec = JSON.parse(await readFile(resolve(specPath), 'utf8'));
    applyOverrides(spec, args);
    if (!args.noValidate) {
      const { errors, warnings } = validateSpec(spec);
      for (const w of warnings) console.warn(`  ⚠ ${w}`);
      if (errors.length) {
        console.error(`\n✗ Spec has ${errors.length} error(s) — fix these or pass --no-validate:`);
        for (const e of errors) console.error(`  ✗ ${e}`);
        process.exit(1);
      }
    }
  }

  const width = spec.width || 800;
  const height = spec.height || 1000;
  const o = spec.output || {};
  const fps = o.fps || 12;
  const durationSec = o.durationSec || 4;
  const loop = o.loop !== false;
  const formats = (o.formats && o.formats.length ? o.formats : ['gif', 'png']).map((f) =>
    f.toLowerCase() === 'jpeg' ? 'jpg' : f.toLowerCase());
  const frames = Math.max(2, Math.round(fps * durationSec));

  const outDir = resolve(args.out || '.');
  await mkdir(outDir, { recursive: true });
  const name = args.name || slugify(spec.name || spec.title);

  const html = rawHtml != null ? rawHtml : await buildHtml(spec);
  if (args.html && rawHtml == null) await writeFile(join(outDir, `${name}.html`), html);

  const needAnim = formats.some((f) => f === 'gif' || f === 'apng');
  const needStill = formats.some((f) => f === 'png' || f === 'jpg');

  console.log(`Rendering "${spec.title || name}" — ${width}x${height}, ${rawHtml != null ? 'raw-html' : 'template=' + (spec.template || 'flow')}`);
  console.log(`  formats: ${formats.join(', ')} | ${needAnim ? `${frames} frames @ ${fps}fps` : 'still only'}`);

  const cap = await captureFrames(html, {
    width, height,
    frames: needAnim ? frames : 2,
    scale: 1, stillScale: 2,
  });

  const written = [];
  // Motion mode loops seamlessly, so no end-frame hold; reveal mode pauses on the result.
  const isMotion = (o.animation || 'reveal') === 'motion';
  const holdMs = Math.round((o.holdSec ?? (isMotion ? 0 : 1.1)) * 1000) || Math.round(1000 / fps);

  if (formats.includes('gif')) {
    const p = join(outDir, `${name}.gif`);
    const { ffmpeg, gifsicle } = await resolveBinaries();
    const preset = o.preset ? (PRESETS[o.preset] || {}) : {};
    if (ffmpeg) {
      // FFmpeg two-pass palette → optional gifsicle optimize / budget fit.
      const colors = o.colors || preset.colors || 200;
      const scale = o.gifScale || preset.scale || 1;
      const raw = join(outDir, `${name}.raw.gif`);
      await encodeGifFFmpeg(ffmpeg, cap.frames, { fps, holdMs, scale, colors, outPath: raw });
      let size;
      if (gifsicle) {
        const lossy = o.lossy ?? preset.lossy ?? 30;
        size = await fitToBudget(gifsicle, raw, p, { maxKB: preset.maxKB || 0, colors, lossy });
        await rm(raw, { force: true });
      } else {
        await rename(raw, p);
        size = (await stat(p)).size;
      }
      written.push([p, size, gifsicle ? 'ffmpeg+gifsicle' : 'ffmpeg']);
    } else {
      const buf = await encodeGif(cap.frames, { fps, loop, holdMs });
      await writeFile(p, buf); written.push([p, buf.length, 'gifenc']);
    }
  }
  if (formats.includes('apng')) {
    const buf = await encodeApng(cap.frames, { fps, loop, holdMs });
    const p = join(outDir, `${name}.apng.png`); await writeFile(p, buf); written.push([p, buf.length]);
  }
  if (formats.includes('png')) {
    const buf = await encodePng(cap.still);
    const p = join(outDir, `${name}.png`); await writeFile(p, buf); written.push([p, buf.length]);
  }
  if (formats.includes('jpg')) {
    const buf = await encodeJpeg(cap.still, { quality: o.jpegQuality || 92 });
    const p = join(outDir, `${name}.jpg`); await writeFile(p, buf); written.push([p, buf.length]);
  }

  console.log('\nWrote:');
  for (const [p, sz, enc] of written) console.log(`  ${p}  (${(sz / 1024).toFixed(0)} KB)${enc ? `  [${enc}]` : ''}`);
}

main().catch((e) => { console.error(e); process.exit(1); });
