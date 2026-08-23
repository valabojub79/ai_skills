// validate.mjs — check a spec before rendering so failures are actionable
// (unknown template/icon/logo/color/preset, malformed sections) instead of raw traces.
// Returns { errors: [...], warnings: [...] }. Warnings never block; errors do.
import { ICON_NAMES } from './build-html.mjs';

const TEMPLATES = ['flow', 'ladder', 'comparison', 'roadmap', 'poster', 'dataflow'];
const PRESET_NAMES = ['discord', 'slack', 'twitter', 'web', 'hq'];
const FORMAT_NAMES = ['gif', 'apng', 'png', 'jpg', 'jpeg'];
const COLOR_TOKENS = ['accent', 'accent2', 'accent3'];
const POSTER_KINDS = ['steps', 'cards', 'columns', 'callouts'];

// nearest-name suggestion via Levenshtein, for "did you mean…"
function closest(word, list) {
  let best = null, bd = Infinity;
  for (const c of list) {
    const d = lev(String(word).toLowerCase(), c.toLowerCase());
    if (d < bd) { bd = d; best = c; }
  }
  return bd <= 3 ? best : null;
}
function lev(a, b) {
  const m = a.length, n = b.length, dp = Array.from({ length: m + 1 }, (_, i) => [i, ...Array(n).fill(0)]);
  for (let j = 0; j <= n; j++) dp[0][j] = j;
  for (let i = 1; i <= m; i++) for (let j = 1; j <= n; j++)
    dp[i][j] = Math.min(dp[i - 1][j] + 1, dp[i][j - 1] + 1, dp[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
  return dp[m][n];
}
const isHex = (s) => typeof s === 'string' && /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(s);
const colorOk = (c) => c == null || COLOR_TOKENS.includes(c) || isHex(c);

export function validateSpec(spec) {
  const errors = [], warnings = [];
  const E = (m) => errors.push(m), W = (m) => warnings.push(m);

  const tmpl = spec.template || 'flow';
  if (!TEMPLATES.includes(tmpl)) {
    const s = closest(tmpl, TEMPLATES);
    E(`template "${tmpl}" is not valid${s ? ` — did you mean "${s}"?` : ''} (one of: ${TEMPLATES.join(', ')})`);
  }

  const o = spec.output || {};
  if (o.preset && !PRESET_NAMES.includes(o.preset)) {
    const s = closest(o.preset, PRESET_NAMES);
    E(`output.preset "${o.preset}" is not valid${s ? ` — did you mean "${s}"?` : ''} (one of: ${PRESET_NAMES.join(', ')})`);
  }
  for (const f of (o.formats || [])) {
    if (!FORMAT_NAMES.includes(String(f).toLowerCase())) {
      const s = closest(f, FORMAT_NAMES);
      E(`output.formats has "${f}"${s ? ` — did you mean "${s}"?` : ''} (allowed: ${FORMAT_NAMES.join(', ')})`);
    }
  }
  if (o.animation && !['reveal', 'motion'].includes(o.animation))
    E(`output.animation "${o.animation}" is not valid (reveal | motion)`);

  for (const k of ['accent', 'accent2', 'accent3', 'bg', 'text', 'muted', 'card', 'line']) {
    const v = spec.theme && spec.theme[k];
    if (v && !isHex(v)) W(`theme.${k} "${v}" is not a hex color (#rgb / #rrggbb)`);
  }

  const checkItem = (it, where) => {
    if (it.icon && !ICON_NAMES.includes(it.icon)) {
      const s = closest(it.icon, ICON_NAMES);
      W(`${where}: unknown icon "${it.icon}"${s ? ` — did you mean "${s}"?` : ''} (falls back to sparkles)`);
    }
    if (!it.label && !it.logo && !it.icon) W(`${where}: item has no label/icon/logo`);
    if (it.color && !colorOk(it.color)) W(`${where}: color "${it.color}" is not a token or hex`);
  };

  if (tmpl === 'dataflow') {
    if (!Array.isArray(spec.zones) || !spec.zones.length) E('dataflow template needs a non-empty "zones" array');
    (spec.zones || []).forEach((z, i) => {
      if (!z.label) W(`zones[${i}] has no label`);
      if (!colorOk(z.color)) W(`zones[${i}].color "${z.color}" is not a token or hex`);
      if (!Array.isArray(z.rows) || !z.rows.length) E(`zones[${i}] ("${z.label || ''}") needs a non-empty "rows" array (array of arrays of nodes)`);
      (z.rows || []).forEach((row, j) => {
        if (!Array.isArray(row)) { E(`zones[${i}].rows[${j}] must be an array of nodes`); return; }
        row.forEach((it, k) => checkItem(it, `zones[${i}].rows[${j}][${k}]`));
      });
    });
  } else if (tmpl === 'poster') {
    if (!Array.isArray(spec.blocks) || !spec.blocks.length) E('poster template needs a non-empty "blocks" array');
    (spec.blocks || []).forEach((b, i) => {
      if (!POSTER_KINDS.includes(b.kind)) {
        const s = closest(b.kind, POSTER_KINDS);
        E(`blocks[${i}].kind "${b.kind}" is not valid${s ? ` — did you mean "${s}"?` : ''} (one of: ${POSTER_KINDS.join(', ')})`);
      }
      if (!colorOk(b.color)) W(`blocks[${i}].color "${b.color}" is not a token or hex`);
      (b.items || []).forEach((it, j) => checkItem(it, `blocks[${i}].items[${j}]`));
      (b.sections || []).forEach((sec, j) => (sec.items || []).forEach((it, k) => checkItem(it, `blocks[${i}].sections[${j}].items[${k}]`)));
    });
  } else {
    if (!Array.isArray(spec.sections) || !spec.sections.length) E(`${tmpl} template needs a non-empty "sections" array`);
    (spec.sections || []).forEach((sec, i) => {
      if (!sec.heading) W(`sections[${i}] has no heading`);
      if (!colorOk(sec.color)) W(`sections[${i}].color "${sec.color}" is not a token or hex`);
      (sec.items || []).forEach((it, j) => checkItem(it, `sections[${i}].items[${j}]`));
      if (sec.annotation && sec.annotation.tone && !['info', 'warn', 'danger', 'success'].includes(sec.annotation.tone))
        W(`sections[${i}].annotation.tone "${sec.annotation.tone}" is not info|warn|danger|success`);
    });
  }

  if (spec.width && (spec.width < 200 || spec.width > 4000)) W(`width ${spec.width} is unusual (200–4000 expected)`);
  if (spec.height && (spec.height < 200 || spec.height > 8000)) W(`height ${spec.height} is unusual (200–8000 expected)`);

  return { errors, warnings };
}
