// theme.mjs — deck geometry, palette resolution, and safe fonts for pptxgenjs.
// pptxgenjs wants hex WITHOUT '#'. Native slide text uses the viewer's installed
// fonts, so we stick to a safe family; brand fonts live only inside rendered images.

export const GEO = {
  W: 13.333, H: 7.5,          // widescreen 16:9 (inches)
  margin: 0.5,
  gap: 0.35,
  titleY: 0.45, titleH: 1.0,
  bodyY: 1.6,
  footerY: 6.98,
};
GEO.contentW = GEO.W - 2 * GEO.margin;
GEO.contentH = GEO.H - GEO.bodyY - 0.5;

export const FONT = { head: 'Calibri', body: 'Calibri', mono: 'Consolas' };

export const hx = (c) => String(c || '').replace('#', '') || '000000';

// Mix two hex colors (t in 0..1) — for tints/shades without alpha.
export function mix(a, b, t) {
  const pa = hx(a), pb = hx(b);
  const n = (s, i) => parseInt(s.substr(i, 2), 16);
  const r = Math.round(n(pa, 0) + (n(pb, 0) - n(pa, 0)) * t);
  const g = Math.round(n(pa, 2) + (n(pb, 2) - n(pa, 2)) * t);
  const bl = Math.round(n(pa, 4) + (n(pb, 4) - n(pa, 4)) * t);
  return [r, g, bl].map((v) => v.toString(16).padStart(2, '0')).join('');
}

export function resolveTheme(t = {}) {
  const dominant = t.dominant || '#0B3D91';
  const supporting = (t.supporting && t.supporting.length ? t.supporting : ['#1E6FEB']);
  return {
    dominant, supporting,
    accent: t.accent || '#EA580C',
    bg: t.bg || '#FFFFFF',
    text: t.text || '#0F172A',
    muted: t.muted || '#64748B',
    light: t.light || '#F1F5F9',       // soft panel fill
    onDark: '#FFFFFF',
  };
}

// Slugify for file names.
export const slug = (s) => (s || 'deck').toLowerCase()
  .replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 60) || 'deck';
