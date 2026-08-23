// encode-ffmpeg.mjs — higher-quality / smaller GIFs via FFmpeg's two-pass palette
// pipeline (palettegen + paletteuse) plus an optional gifsicle compression pass.
// Borrowed approach from the claude-gif skill; binaries are vendored as npm deps,
// so everything degrades gracefully to the pure-JS gifenc encoder when absent.
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { mkdtemp, writeFile, rm, stat } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const run = promisify(execFile);

export async function resolveBinaries() {
  let ffmpeg = process.env.FFMPEG_PATH || null;
  let gifsicle = process.env.GIFSICLE_PATH || null;
  if (!ffmpeg) try { ffmpeg = (await import('@ffmpeg-installer/ffmpeg')).default.path; } catch {}
  if (!gifsicle) try { gifsicle = (await import('gifsicle')).default; } catch {}
  return { ffmpeg, gifsicle };
}

// Encode an array of PNG frame buffers to a GIF file using FFmpeg.
// Uniform frame delay (1/fps); the final frame is duplicated to create a hold.
export async function encodeGifFFmpeg(ffmpeg, frameBuffers, { fps, holdMs = 0, scale = 1, colors = 200, dither = 'bayer:bayer_scale=3', outPath }) {
  const dir = await mkdtemp(join(tmpdir(), 'ai-gif-'));
  try {
    const holdFrames = Math.max(0, Math.round((holdMs / 1000) * fps));
    let n = 0;
    for (let i = 0; i < frameBuffers.length; i++) {
      await writeFile(join(dir, `f${String(n++).padStart(4, '0')}.png`), frameBuffers[i]);
    }
    const last = frameBuffers[frameBuffers.length - 1];
    for (let h = 0; h < holdFrames; h++) {
      await writeFile(join(dir, `f${String(n++).padStart(4, '0')}.png`), last);
    }
    const pattern = join(dir, 'f%04d.png');
    const palette = join(dir, 'palette.png');
    const doScale = scale && scale !== 1;
    const sc = doScale ? `scale=iw*${scale}:-1:flags=lanczos,` : '';
    // pass 1 — generate an optimal palette from all frames
    await run(ffmpeg, ['-y', '-framerate', String(fps), '-i', pattern,
      '-vf', `${sc}palettegen=stats_mode=diff:max_colors=${colors}`, palette]);
    // pass 2 — map frames to the palette with dithering
    const use = `paletteuse=dither=${dither}:diff_mode=rectangle`;
    const lavfi = doScale
      ? `[0:v]scale=iw*${scale}:-1:flags=lanczos[x];[x][1:v]${use}`
      : `[0:v][1:v]${use}`;
    await run(ffmpeg, ['-y', '-framerate', String(fps), '-i', pattern, '-i', palette,
      '-lavfi', lavfi, '-loop', '0', outPath]);
    return (await stat(outPath)).size;
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
}

// Lossy + optimize pass. Re-runs from src each call so `lossy` isn't compounded.
export async function gifsicleOptimize(gifsicle, srcPath, dstPath, { lossy = 0, colors = 0 } = {}) {
  const args = ['-O3'];
  if (lossy) args.push(`--lossy=${lossy}`);
  if (colors) args.push('--colors', String(colors));
  args.push(srcPath, '-o', dstPath);
  await run(gifsicle, args);
  return (await stat(dstPath)).size;
}

// Platform/size presets → encoder + optimizer parameters.
export const PRESETS = {
  discord: { maxKB: 256,   colors: 128, lossy: 80, scale: 0.85 },
  slack:   { maxKB: 500,   colors: 160, lossy: 60, scale: 1 },
  twitter: { maxKB: 15000, colors: 256, lossy: 30, scale: 1 },
  web:     { maxKB: 1500,  colors: 200, lossy: 40, scale: 1 },
  hq:      { maxKB: 0,     colors: 256, lossy: 0,  scale: 1 },
};

// Shrink a gif toward maxKB by escalating gifsicle lossy/colors. No-op if already under.
export async function fitToBudget(gifsicle, ffmpegGifPath, outPath, { maxKB, colors, lossy }) {
  let size = await gifsicleOptimize(gifsicle, ffmpegGifPath, outPath, { lossy, colors });
  if (!maxKB || size <= maxKB * 1024) return size;
  for (const [l, c] of [[120, colors], [160, 96], [200, 64], [240, 48]]) {
    size = await gifsicleOptimize(gifsicle, ffmpegGifPath, outPath, { lossy: l, colors: c });
    if (size <= maxKB * 1024) break;
  }
  return size;
}
