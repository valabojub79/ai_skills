// encode.mjs — turn captured PNG frames into GIF / APNG / PNG / JPEG.
import sharp from 'sharp';
import gifenc from 'gifenc';
import UPNG from 'upng-js';

const { GIFEncoder, quantize, applyPalette } = gifenc;

// Decode a PNG buffer to flat RGBA pixels.
async function toRGBA(pngBuffer) {
  const { data, info } = await sharp(pngBuffer)
    .ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  return { data, width: info.width, height: info.height };
}

export async function encodeGif(frameBuffers, { fps, loop = true, holdMs = 900 }) {
  const gif = GIFEncoder();
  const delay = Math.round(1000 / fps);
  for (let i = 0; i < frameBuffers.length; i++) {
    const { data, width, height } = await toRGBA(frameBuffers[i]);
    const palette = quantize(data, 256);
    const index = applyPalette(data, palette);
    const last = i === frameBuffers.length - 1;
    const opts = { palette, delay: last ? holdMs : delay };
    if (i === 0) opts.repeat = loop ? 0 : -1; // 0 = loop forever
    gif.writeFrame(index, width, height, opts);
  }
  gif.finish();
  return Buffer.from(gif.bytes());
}

export async function encodeApng(frameBuffers, { fps, loop = true, holdMs = 900 }) {
  const rgbaFrames = [];
  let W = 0, H = 0;
  for (const b of frameBuffers) {
    const { data, width, height } = await toRGBA(b);
    W = width; H = height;
    rgbaFrames.push(data.buffer.slice(data.byteOffset, data.byteOffset + data.byteLength));
  }
  const frameDelay = Math.round(1000 / fps);
  const dels = rgbaFrames.map((_, i) => (i === rgbaFrames.length - 1 ? holdMs : frameDelay));
  // cnum 0 = lossless full colour. loop count lives in the acTL chunk; UPNG loops forever.
  const ab = UPNG.encode(rgbaFrames, W, H, 0, dels);
  return Buffer.from(ab);
}

export async function encodePng(stillBuffer) {
  return sharp(stillBuffer).png({ compressionLevel: 9 }).toBuffer();
}

export async function encodeJpeg(stillBuffer, { quality = 92 } = {}) {
  return sharp(stillBuffer).flatten({ background: '#ffffff' })
    .jpeg({ quality, mozjpeg: true }).toBuffer();
}
