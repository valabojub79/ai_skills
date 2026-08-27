// infographic.mjs — generate a slide's hero visual by invoking the existing
// animated-infographic renderer (reused as-is, by path). Returns {gif, png} paths.
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { writeFile, mkdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join, resolve } from 'node:path';

const run = promisify(execFile);
const __dir = dirname(fileURLToPath(import.meta.url));
// ../animated-infographic/render.mjs (sibling skill)
const IG = resolve(__dir, '..', '..', 'animated-infographic', 'render.mjs');

export function infographicAvailable() { return existsSync(IG); }

// visual: { spec:{…} } (animated-infographic spec) or { rawHtml:"file.html", width,height }
// size:  { w, h } target pixels for the hero region.
export async function makeVisual(visual, size, outDir, name) {
  await mkdir(outDir, { recursive: true });
  const w = size?.w || 1600, h = size?.h || 900;
  const args = ['--out', outDir, '--name', name, '--format', 'gif,png',
    '--width', String(w), '--height', String(h)];

  if (visual.rawHtml) {
    args.unshift('--raw-html', resolve(visual.rawHtml));
  } else {
    const specPath = join(outDir, `${name}.spec.json`);
    // strip any size/width/height in the spec so our CLI dims win
    const spec = { ...(visual.spec || {}) };
    delete spec.size; delete spec.width; delete spec.height;
    spec.output = { ...(spec.output || {}) };
    if (spec.output.formats) delete spec.output.formats; // CLI --format wins
    await writeFile(specPath, JSON.stringify(spec, null, 2));
    args.unshift(specPath);
  }
  await run('node', [IG, ...args], { maxBuffer: 1 << 24 });
  return { gif: join(outDir, `${name}.gif`), png: join(outDir, `${name}.png`) };
}
