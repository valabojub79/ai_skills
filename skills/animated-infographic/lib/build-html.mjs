// build-html.mjs — turn a spec into a full, self-contained HTML document.
// Templates live in ../templates/*.mjs and export { css, render(spec, helpers) }.
import { readFile } from 'node:fs/promises';
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __dir = dirname(fileURLToPath(import.meta.url));
const root = join(__dir, '..');

// ---- tiny helpers ----------------------------------------------------------
export const esc = (s = '') =>
  String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

// Inline Lucide-style icons (viewBox 24, stroke = currentColor via base.css).
const ICONS = {
  target: '<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="1"/>',
  database: '<ellipse cx="12" cy="5" rx="8" ry="3"/><path d="M4 5v6c0 1.7 3.6 3 8 3s8-1.3 8-3V5"/><path d="M4 11v6c0 1.7 3.6 3 8 3s8-1.3 8-3v-6"/>',
  layers: '<path d="M12 2 2 7l10 5 10-5-10-5Z"/><path d="m2 12 10 5 10-5"/><path d="m2 17 10 5 10-5"/>',
  folder: '<path d="M3 7a2 2 0 0 1 2-2h4l2 3h8a2 2 0 0 1 2 2v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7Z"/>',
  rocket: '<path d="M5 13c-1.5 1.5-2 5-2 5s3.5-.5 5-2"/><path d="M14 5c4 1 5 5 5 5s-4-1-5 5c-3-1-6-4-7-7 4-6 7-3 7-3Z"/><circle cx="14.5" cy="9.5" r="1.5"/>',
  chart: '<path d="M4 20V10"/><path d="M10 20V4"/><path d="M16 20v-7"/><path d="M3 20h18"/>',
  trending: '<path d="m3 17 6-6 4 4 8-8"/><path d="M17 7h4v4"/>',
  search: '<circle cx="11" cy="11" r="7"/><path d="m21 21-4.3-4.3"/>',
  check: '<circle cx="12" cy="12" r="9"/><path d="m8.5 12 2.5 2.5 4.5-5"/>',
  refresh: '<path d="M21 12a9 9 0 1 1-3-6.7L21 8"/><path d="M21 3v5h-5"/>',
  wrench: '<path d="M15 4a5 5 0 0 0-5 6l-6 6 3 3 6-6a5 5 0 0 0 6-6l-3 3-2-2 2-3a5 5 0 0 0-1-1Z"/>',
  tools: '<path d="m7 10-4 4 3 3 4-4"/><path d="M14 7l3-3 3 3-3 3"/><path d="m9 12 6 6"/>',
  brain: '<path d="M9 4a3 3 0 0 0-3 3 3 3 0 0 0-1 5 3 3 0 0 0 1 5 3 3 0 0 0 3 3 2 2 0 0 0 2-2V6a2 2 0 0 0-2-2Z"/><path d="M15 4a3 3 0 0 1 3 3 3 3 0 0 1 1 5 3 3 0 0 1-1 5 3 3 0 0 1-3 3 2 2 0 0 1-2-2V6a2 2 0 0 1 2-2Z"/>',
  cpu: '<rect x="6" y="6" width="12" height="12" rx="2"/><path d="M9 2v3M15 2v3M9 19v3M15 19v3M2 9h3M2 15h3M19 9h3M19 15h3"/>',
  network: '<circle cx="12" cy="5" r="2.5"/><circle cx="5" cy="19" r="2.5"/><circle cx="19" cy="19" r="2.5"/><path d="M12 7.5v4M11 13l-4 4M13 13l4 4"/>',
  book: '<path d="M4 5a2 2 0 0 1 2-2h12v16H6a2 2 0 0 0-2 2V5Z"/><path d="M6 17h12"/>',
  code: '<path d="m9 8-4 4 4 4"/><path d="m15 8 4 4-4 4"/>',
  mail: '<rect x="3" y="5" width="18" height="14" rx="2"/><path d="m3 7 9 6 9-6"/>',
  shield: '<path d="M12 3 5 6v6c0 4 3 6.5 7 9 4-2.5 7-5 7-9V6l-7-3Z"/>',
  zap: '<path d="M13 2 4 14h7l-1 8 9-12h-7l1-8Z"/>',
  users: '<circle cx="9" cy="8" r="3"/><path d="M3 20c0-3.3 2.7-6 6-6s6 2.7 6 6"/><path d="M16 5.3A3 3 0 0 1 18 11M21 20c0-2.5-1.3-4.7-3.3-5.6"/>',
  settings: '<circle cx="12" cy="12" r="3"/><path d="M19 12a7 7 0 0 0-.1-1.3l2-1.6-2-3.4-2.4 1a7 7 0 0 0-2.3-1.3L13.8 2h-3.6l-.4 2.5A7 7 0 0 0 7.5 5.8l-2.4-1-2 3.4 2 1.6A7 7 0 0 0 5 12c0 .4 0 .9.1 1.3l-2 1.6 2 3.4 2.4-1a7 7 0 0 0 2.3 1.3l.4 2.4h3.6l.4-2.5a7 7 0 0 0 2.3-1.3l2.4 1 2-3.4-2-1.6c.1-.4.1-.8.1-1.2Z"/>',
  sparkles: '<path d="M12 3l1.8 4.2L18 9l-4.2 1.8L12 15l-1.8-4.2L6 9l4.2-1.8L12 3Z"/><path d="M19 14l.8 1.8L21 17l-1.2.8L19 19l-.8-1.2L17 17l1.2-1.2L19 14Z"/>',
  file: '<path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8l-5-5Z"/><path d="M14 3v5h5"/>',
  branch: '<circle cx="6" cy="6" r="2.5"/><circle cx="6" cy="18" r="2.5"/><circle cx="18" cy="8" r="2.5"/><path d="M6 8.5v7M8.4 7.2C12 8 15 8 15.6 8"/>',
  cloud: '<path d="M7 18a4 4 0 0 1-.5-8 5 5 0 0 1 9.6-1A4 4 0 0 1 17 18H7Z"/>',
  terminal: '<rect x="3" y="4" width="18" height="16" rx="2"/><path d="m7 9 3 3-3 3M13 15h4"/>',
  link: '<path d="M9 14a4 4 0 0 0 6 .5l2-2a4 4 0 0 0-6-6l-1 1"/><path d="M15 10a4 4 0 0 0-6-.5l-2 2a4 4 0 0 0 6 6l1-1"/>',
  bulb: '<path d="M9 18h6M10 21h4"/><path d="M12 3a6 6 0 0 0-4 10.5c.6.6 1 1.3 1 2.1V16h6v-.4c0-.8.4-1.5 1-2.1A6 6 0 0 0 12 3Z"/>',
  lock: '<rect x="5" y="11" width="14" height="9" rx="2"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/>',
  eye: '<path d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7-10-7-10-7Z"/><circle cx="12" cy="12" r="3"/>',
  flag: '<path d="M5 21V4M5 4c3-1.5 6 1.5 9 0v8c-3 1.5-6-1.5-9 0"/>',
  clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
  arrow: '<path d="M5 12h14M13 6l6 6-6 6"/>',
};
export const ICON_NAMES = Object.keys(ICONS);
export const icon = (name) =>
  `<span class="icon"><svg viewBox="0 0 24 24">${ICONS[name] || ICONS.sparkles}</svg></span>`;

// Brand/tool logos. Real SVGs dropped into ../logos/<name>.svg win; otherwise a clean
// brand-coloured monogram tile is used (avoids shipping inaccurate trademarked marks).
const logoDir = join(root, 'logos');
const LOGO_FILES = existsSync(logoDir)
  ? Object.fromEntries(readdirSync(logoDir).filter((f) => f.endsWith('.svg'))
      .map((f) => [f.slice(0, -4).toLowerCase(), readFileSync(join(logoDir, f), 'utf8')]))
  : {};
const BRANDS = {
  claude: ['#D97757', 'C'], anthropic: ['#D97757', 'A'], openai: ['#10A37F', 'AI'], gpt: ['#10A37F', 'AI'],
  gemini: ['#1C69FF', 'G'], google: ['#4285F4', 'G'], meta: ['#0866FF', 'M'], llama: ['#0866FF', 'L'],
  microsoft: ['#5E5E5E', 'MS'], phi: ['#5E5E5E', 'φ'], github: ['#181717', 'GH'], gitlab: ['#FC6D26', 'GL'],
  docker: ['#2496ED', 'D'], kubernetes: ['#326CE5', 'K8'], postgres: ['#4169E1', 'PG'], postgresql: ['#4169E1', 'PG'],
  python: ['#3776AB', 'Py'], langchain: ['#1C3C3C', 'LC'], qwen: ['#615CED', 'Q'], alibaba: ['#FF6A00', 'A'],
  huggingface: ['#FFB000', 'HF'], aws: ['#FF9900', 'AWS'], mistral: ['#FF7000', 'M'], cohere: ['#39594C', 'Co'],
  nvidia: ['#76B900', 'N'], ollama: ['#111111', 'OL'], vercel: ['#111111', '▲'], slack: ['#4A154B', 'Sl'],
};
export const logo = (name) => {
  const key = String(name || '').toLowerCase();
  if (LOGO_FILES[key]) return `<span class="logo">${LOGO_FILES[key]}</span>`;
  const b = BRANDS[key];
  const color = b ? b[0] : 'var(--_c, var(--accent))';
  const txt = b ? b[1] : String(name || '?').slice(0, 2);
  return `<span class="logo mono" style="--lc:${color}">${esc(txt)}</span>`;
};

// Animation driver injected into the page, mapped from a single clock t in [0,1].
//  - mode "reveal": one-shot staged slide-in of every `.reveal` element, then hold.
//  - mode "motion": everything stays visible and a continuous, seamless-looping set of
//    effects runs — a travelling highlight that sweeps `[data-band]` elements, a sine
//    `--pulse`, a marching `--dash`, and a subtle float. Last frame == first frame.
const DRIVER = `
<script>
(function(){
  var TAU = Math.PI*2;
  function ease(p){ return p<0?0:p>1?1:1-Math.pow(1-p,3); } // easeOutCubic
  var mode = document.body.getAttribute('data-anim') || 'reveal';
  var els = Array.prototype.slice.call(document.querySelectorAll('.reveal'));
  var n = els.length || 1;
  var revealEnd = 0.82;
  els.forEach(function(el,i){
    el.__s = revealEnd * (i / n);
    el.__e = Math.min(revealEnd, el.__s + (revealEnd / n) * 2.2);
    if (el.__e <= el.__s) el.__e = el.__s + 0.001;
  });
  function off(el){
    var f = el.getAttribute('data-from') || 'up';
    var d = 22;
    if (f==='up')    return ['0px',  d+'px', 1];
    if (f==='down')  return ['0px', -d+'px', 1];
    if (f==='left')  return [ d+'px','0px',  1];
    if (f==='right') return [-d+'px','0px',  1];
    if (f==='scale') return ['0px','0px', 0.86];
    return ['0px','0px', 1]; // fade
  }
  var bands = Array.prototype.slice.call(document.querySelectorAll('[data-band]'));
  var root = document.documentElement.style;

  function continuous(t){
    root.setProperty('--t', t.toFixed(4));
    root.setProperty('--pulse', (0.5 + 0.5*Math.sin(t*TAU)).toFixed(4));
    root.setProperty('--dash', t.toFixed(4));
    var m = bands.length || 1;
    var pos = t * m;                       // travelling head, wraps 0..m
    bands.forEach(function(el,i){
      var d = Math.abs((i + 0.5) - pos);
      d = Math.min(d, m - d);              // circular distance => seamless
      var g = Math.max(0, 1 - d / 1.25);
      el.style.setProperty('--glow', g.toFixed(3));
    });
  }

  window.__seek = function(t){
    if (mode === 'motion'){
      els.forEach(function(el){
        el.style.setProperty('--rv-o', 1);
        el.style.setProperty('--rv-x', '0px');
        el.style.setProperty('--rv-y', '0px');
        el.style.setProperty('--rv-s', 1);
      });
      continuous(t);
    } else {
      els.forEach(function(el){
        var p = ease((t - el.__s) / (el.__e - el.__s));
        var o = off(el);
        el.style.setProperty('--rv-o', p.toFixed(3));
        el.style.setProperty('--rv-x', (parseFloat(o[0]) * (1-p)) + 'px');
        el.style.setProperty('--rv-y', (parseFloat(o[1]) * (1-p)) + 'px');
        el.style.setProperty('--rv-s', (o[2] + (1-o[2]) * p).toFixed(3));
      });
    }
    if (typeof window.__seekHook === 'function') { try { window.__seekHook(t); } catch(e){} }
    document.documentElement.setAttribute('data-ready','1');
  };
  window.__seek(0);
})();
</script>`;

export async function buildHtml(spec) {
  const tmplName = spec.template || 'flow';
  const baseCss = await readFile(join(root, 'templates', 'base.css'), 'utf8');
  const mod = await import(join(root, 'templates', `${tmplName}.mjs`));
  const helpers = { esc, icon, logo };
  const body = mod.render(spec, helpers);
  const tcss = mod.css || '';

  const th = spec.theme || {};
  const vars = Object.entries({
    '--accent': th.accent, '--accent2': th.accent2, '--accent3': th.accent3,
    '--bg': th.bg, '--text': th.text, '--muted': th.muted,
    '--card': th.card, '--line': th.line,
  }).filter(([, v]) => v).map(([k, v]) => `${k}:${v}`).join(';');

  const anim = (spec.output && spec.output.animation) || 'reveal';
  return `<!doctype html><html><head><meta charset="utf-8">
<style>${baseCss}\n${tcss}\n:root{${vars}}</style></head>
<body data-anim="${anim}"><div id="stage">${body}</div>${DRIVER}</body></html>`;
}
