// ladder.mjs — numbered tier bands stacking to a final "formula" row.
// Matches the "Evolution of AI Systems" example.
import { renderHeader, renderFooter } from './flow.mjs';

export const css = `
.lad-band {
  position: relative; overflow: hidden;
  display: flex; align-items: stretch; gap: 15px;
  background: var(--card); border-radius: 14px;
  box-shadow: var(--shadow-md);
  padding: 15px 18px 15px 24px;
}
.lad-band + .lad-band { margin-top: 13px; }
/* marching accent rail on the left — the only moving element; content stays still */
.lad-band::before {
  content: ''; position: absolute; left: 0; top: 0; bottom: 0; width: 7px;
  background: repeating-linear-gradient(180deg,
    var(--_c, var(--accent)) 0 12px, color-mix(in srgb, var(--_c) 35%, transparent) 12px 24px);
  background-position-y: calc(var(--dash, 0) * -24px);
}
.lad-num {
  flex: 0 0 auto; width: 42px; height: 42px; border-radius: 12px;
  background: var(--_c, var(--accent)); color: #fff;
  font-family: var(--font-display); font-weight: 700; font-size: 19px;
  display: flex; align-items: center; justify-content: center;
  box-shadow: 0 4px 10px color-mix(in srgb, var(--_c, var(--accent)) 35%, transparent);
}
.lad-main { flex: 1 1 auto; min-width: 0; }
.lad-h { font-family: var(--font-display); font-weight: 700; font-size: 20px; color: var(--text); letter-spacing: -0.01em; }
.lad-sub { margin-top: 4px; font-size: 13.5px; color: var(--muted); line-height: 1.32; }
.lad-items { display: flex; flex-wrap: wrap; gap: 6px; margin-top: 10px; }
.lad-item { display: flex; align-items: center; gap: 6px; font-size: 12px; font-weight: 600; color: var(--text);
  background: color-mix(in srgb, var(--_c, var(--accent)) 10%, #fff); border-radius: 8px; padding: 4px 10px; }
.lad-item .icon { width: 16px; height: 16px; color: var(--_c, var(--accent)); }
.lad-formula {
  margin-top: 18px; display: flex; flex-wrap: wrap; align-items: center; justify-content: center;
  gap: 10px; background: var(--card); box-shadow: var(--shadow-sm);
  border-radius: 14px; padding: 18px;
}
.lad-formula .term { font-family: var(--font-display); font-weight: 700; font-size: 16px; }
.lad-formula .op { font-weight: 700; font-size: 18px; color: var(--muted); }
.lad-formula .result { color: var(--accent); }
`;

const COLORVARS = { accent: 'var(--accent)', accent2: 'var(--accent2)', accent3: 'var(--accent3)' };

export function render(spec, { esc, icon }) {
  const head = renderHeader(spec, esc);
  const bands = (spec.sections || []).map((sec, i) => {
    const c = COLORVARS[sec.color] || sec.color || 'var(--accent)';
    const items = (sec.items || []).map((it) =>
      `<span class="lad-item">${icon(it.icon)}${esc(it.label)}</span>`).join('');
    return `<div class="lad-band reveal" data-band="${i}" data-from="left" style="--_c:${c}">
      <div class="lad-num">${sec.number ?? i + 1}</div>
      <div class="lad-main">
        <div class="lad-h">${esc(sec.heading)}</div>
        ${sec.sub ? `<div class="lad-sub">${esc(sec.sub)}</div>` : ''}
        ${items ? `<div class="lad-items">${items}</div>` : ''}
      </div></div>`;
  }).join('');

  let formula = '';
  if (Array.isArray(spec.formula) && spec.formula.length) {
    const terms = spec.formula.map((t, i) => {
      const cls = i === spec.formula.length - 1 ? 'term result' : 'term';
      const op = i === 0 ? '' : `<span class="op">${i === spec.formula.length - 1 ? '=' : '+'}</span>`;
      return `${op}<span class="${cls}">${esc(t)}</span>`;
    }).join('');
    formula = `<div class="lad-formula reveal" data-from="up">${terms}</div>`;
  }

  return `${head}<div class="ig-body">${bands}${formula}</div>${renderFooter(spec, esc)}`;
}
