// preview.mjs — best-effort QA on this box (no LibreOffice): render an APPROXIMATE
// HTML contact sheet of the slides via the Chromium already installed for the sibling
// animated-infographic skill. This is NOT pixel-parity with pptxgenjs — it's a quick
// way to eyeball content/overflow. Final rendering happens in PowerPoint.
import { createRequire } from 'node:module';
import { existsSync, readFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { fileURLToPath } from 'node:url';
import { dirname, resolve, join } from 'node:path';
import { hx, mix } from './theme.mjs';

const __dir = dirname(fileURLToPath(import.meta.url));
const sibling = resolve(__dir, '..', '..', 'animated-infographic');

function chromePath() {
  if (process.env.PUPPETEER_EXECUTABLE_PATH) return process.env.PUPPETEER_EXECUTABLE_PATH;
  const p = join(homedir(), '.cache/animated-infographic-chrome/chrome-linux64/chrome');
  return existsSync(p) ? p : undefined;
}

const esc = (s) => (s == null ? '' : String(s)).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

function slideCard(s, assets, T) {
  const dark = ['title', 'section', 'closing'].includes(s.layout);
  const bg = s.layout === 'quote' ? hx(T.light)
    : dark ? (s.layout === 'section' ? mix(T.dominant, '#000000', 0.12) : hx(T.dominant)) : hx(T.bg);
  const fg = dark ? 'ffffff' : hx(T.text);
  let img = '';
  if (assets && assets.png && existsSync(assets.png)) {
    try { img = `<img src="data:image/png;base64,${readFileSync(assets.png).toString('base64')}">`; } catch {}
  }
  const bullets = (s.bullets || []).slice(0, 6).map((b) => `<li>${esc(b)}</li>`).join('');
  const cols = (s.columns || []).map((c) =>
    `<div class="col"><b>${esc(c.heading)}</b><ul>${(c.items || []).slice(0, 4).map((i) => `<li>${esc(i)}</li>`).join('')}</ul></div>`).join('');
  const stats = (s.stats || []).map((st) =>
    `<div class="stat"><div class="v">${esc(st.value)}</div><div class="l">${esc(st.label)}</div></div>`).join('');
  let body = '';
  if (s.layout === 'hero-visual') body = `<div class="hero">${img}</div>`;
  else if (s.layout === 'two-column') body = `<div class="two"><ul>${bullets}</ul><div class="hero">${img}</div></div>`;
  else if (s.layout === 'comparison') body = `<div class="cols">${cols}</div>`;
  else if (s.layout === 'stat') body = `<div class="stats">${stats}</div>`;
  else if (bullets) body = `<ul>${bullets}</ul>`;
  return `<div class="card" style="--bg:#${bg};--fg:#${fg};--ac:${T.accent}">
    <div class="ct" ${dark ? 'style="color:#fff"' : ''}>${esc(s.title)}</div>
    ${s.subtitle ? `<div class="cs">${esc(s.subtitle)}</div>` : ''}
    <div class="cb">${body}</div>
    <div class="tag">${esc(s.layout)}</div>
  </div>`;
}

export async function buildPreview(deck, assetsByIndex, T, outPath) {
  const exe = chromePath();
  const require = createRequire(join(sibling, 'package.json'));
  let puppeteer;
  try { puppeteer = require('puppeteer'); }
  catch { throw new Error('puppeteer not available (needs the animated-infographic skill installed)'); }

  const cards = (deck.slides || []).map((s, i) => slideCard(s, assetsByIndex[i], T)).join('');
  const html = `<meta charset="utf-8"><style>
    *{margin:0;padding:0;box-sizing:border-box;font-family:Arial,Helvetica,sans-serif;}
    body{background:#e9edf3;padding:24px;}
    h1{font-size:20px;color:#0f172a;margin-bottom:4px;}
    .sub{font-size:12px;color:#64748b;margin-bottom:18px;}
    .grid{display:grid;grid-template-columns:repeat(3,1fr);gap:16px;}
    .card{position:relative;aspect-ratio:16/9;background:var(--bg);color:var(--fg);border-radius:8px;
      box-shadow:0 3px 10px rgba(16,24,40,.12);padding:14px 16px;overflow:hidden;border:1px solid #dbe1ea;}
    .ct{font-weight:800;font-size:15px;line-height:1.1;}
    .cs{font-size:11px;opacity:.8;margin-top:3px;}
    .cb{margin-top:8px;font-size:11px;}
    ul{margin-left:16px;} li{margin:2px 0;line-height:1.25;}
    .hero{height:100%;display:flex;align-items:center;justify-content:center;}
    .hero img{max-width:100%;max-height:118px;border-radius:6px;box-shadow:0 2px 6px rgba(0,0,0,.15);}
    .two{display:grid;grid-template-columns:1fr 1fr;gap:8px;} .two .hero img{max-height:110px;}
    .cols{display:grid;grid-template-columns:repeat(auto-fit,minmax(0,1fr));gap:6px;}
    .col{background:rgba(15,23,42,.05);border-radius:5px;padding:5px 7px;font-size:10px;}
    .stats{display:flex;gap:8px;} .stat{flex:1;text-align:center;background:rgba(15,23,42,.05);border-radius:6px;padding:6px;}
    .stat .v{font-size:24px;font-weight:800;color:var(--ac);} .stat .l{font-size:9px;margin-top:2px;}
    .tag{position:absolute;bottom:8px;right:10px;font-size:9px;font-weight:700;color:var(--ac);text-transform:uppercase;letter-spacing:.05em;}
  </style>
  <h1>${esc(deck.title || 'Deck')} — preview</h1>
  <div class="sub">Approximate layout · ${(deck.slides || []).length} slides · final rendering is in PowerPoint</div>
  <div class="grid">${cards}</div>`;

  const b = await puppeteer.launch({ headless: 'new', executablePath: exe, args: ['--no-sandbox'] });
  try {
    const page = await b.newPage();
    await page.setViewport({ width: 1280, height: 900, deviceScaleFactor: 1.5 });
    await page.setContent(html, { waitUntil: 'load' });
    const h = await page.evaluate(() => document.body.scrollHeight);
    await page.setViewport({ width: 1280, height: Math.ceil(h), deviceScaleFactor: 1.5 });
    await page.screenshot({ path: outPath });
  } finally { await b.close(); }
  return outPath;
}
