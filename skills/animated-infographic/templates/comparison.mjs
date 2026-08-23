// comparison.mjs — 2-3 side-by-side columns with icon+label rows.
// Matches the "Traditional vs Agentic vs Agentic RAG" example.
import { renderHeader, renderFooter } from './flow.mjs';

export const css = `
.cmp-cols { display: flex; gap: 16px; flex: 1 1 auto; align-items: stretch; }
.cmp-col {
  flex: 1 1 0; min-width: 0; display: flex; flex-direction: column;
  background: var(--card); border-radius: var(--radius);
  box-shadow: var(--shadow-md); overflow: hidden;
}
.cmp-head {
  background: linear-gradient(135deg, var(--_c, var(--accent)), color-mix(in srgb, var(--_c) 72%, #000 12%));
  color: #fff; font-family: var(--font-display); font-weight: 700; font-size: 20px;
  padding: 16px; text-align: center; letter-spacing: -0.01em;
}
.cmp-sub { font-size: 12.5px; color: var(--muted); padding: 12px 16px 0; text-align: center; line-height: 1.32; font-weight: 500; }
.cmp-list { padding: 16px; display: flex; flex-direction: column; gap: 14px; }
.cmp-item { display: flex; align-items: flex-start; gap: 11px; }
.cmp-item .ibadge { flex: 0 0 auto; width: 36px; height: 36px; border-radius: 10px; }
.cmp-item .ibadge .icon { width: 20px; height: 20px; }
.cmp-item .ct { min-width: 0; }
.cmp-item .ct b { display: block; font-size: 14px; font-weight: 700; line-height: 1.2; color: var(--text); }
.cmp-item .ct span { display: block; font-size: 11.5px; color: var(--muted); line-height: 1.32; margin-top: 3px; }
`;

const COLORVARS = { accent: 'var(--accent)', accent2: 'var(--accent2)', accent3: 'var(--accent3)' };

export function render(spec, { esc, icon, logo }) {
  const head = renderHeader(spec, esc);
  const cols = (spec.sections || []).map((sec) => {
    const c = COLORVARS[sec.color] || sec.color || 'var(--accent)';
    const rows = (sec.items || []).map((it) =>
      `<div class="cmp-item reveal" data-from="up" style="--_c:${c}">
        ${it.logo ? logo(it.logo) : `<span class="ibadge">${icon(it.icon)}</span>`}
        <div class="ct"><b>${esc(it.label)}</b>${it.note ? `<span>${esc(it.note)}</span>` : ''}</div>
      </div>`).join('');
    return `<div class="cmp-col reveal" data-from="up" style="--_c:${c}">
      <div class="cmp-head">${esc(sec.heading)}</div>
      ${sec.sub ? `<div class="cmp-sub">${esc(sec.sub)}</div>` : ''}
      <div class="cmp-list">${rows}</div></div>`;
  }).join('');
  return `${head}<div class="ig-body"><div class="cmp-cols">${cols}</div></div>${renderFooter(spec, esc)}`;
}
