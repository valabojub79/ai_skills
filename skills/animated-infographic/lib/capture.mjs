// capture.mjs — render HTML in headless Chromium and grab animation frames.
import puppeteer from 'puppeteer';
import { existsSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';

// Resolve a Chrome binary. Prefer an explicit env var, then the manually-extracted
// Chrome-for-Testing this skill installs (when puppeteer's own download is blocked),
// then fall back to puppeteer's bundled browser.
function resolveExecutable() {
  if (process.env.PUPPETEER_EXECUTABLE_PATH) return process.env.PUPPETEER_EXECUTABLE_PATH;
  const candidates = [
    join(homedir(), '.cache/animated-infographic-chrome/chrome-linux64/chrome'),
    '/usr/bin/google-chrome', '/usr/bin/chromium', '/usr/bin/chromium-browser',
  ];
  return candidates.find((p) => existsSync(p));
}

export async function captureFrames(html, opts) {
  const { width, height, frames, scale = 1, stillScale = 2 } = opts;
  const executablePath = resolveExecutable();
  const browser = await puppeteer.launch({
    headless: 'new',
    executablePath: executablePath || undefined,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--force-color-profile=srgb'],
  });
  try {
    const page = await browser.newPage();
    await page.setViewport({ width, height, deviceScaleFactor: scale });
    await page.setContent(html, { waitUntil: 'load', timeout: 30000 });
    // Best-effort wait for web fonts; never let it stall the render.
    await page.evaluate(() =>
      Promise.race([document.fonts.ready, new Promise((r) => setTimeout(r, 8000))]));

    const clip = { x: 0, y: 0, width, height };
    const out = [];
    const n = Math.max(2, frames);
    for (let i = 0; i < n; i++) {
      const t = i / (n - 1);
      await page.evaluate((tt) => window.__seek(tt), t);
      out.push(await page.screenshot({ type: 'png', clip }));
    }

    // High-res final still (for static PNG/JPEG deliverables).
    await page.setViewport({ width, height, deviceScaleFactor: stillScale });
    await page.evaluate(() => window.__seek(1));
    const still = await page.screenshot({ type: 'png', clip });

    return { frames: out, still, width, height };
  } finally {
    await browser.close();
  }
}
