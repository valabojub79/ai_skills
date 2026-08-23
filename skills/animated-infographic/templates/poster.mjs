// poster.mjs — a multi-section poster: stacks several heterogeneous "blocks" (steps,
// cards, columns, callouts) under section headers, like the dense reference infographics.
// Each block: { kind, heading, color, columns?, items?/sections? }.
import { renderHeader, renderFooter } from './flow.mjs';

export const css = `
.po-body { display: flex; flex-direction: column; gap: 22px; }
.po-block { }
.po-sec { display: flex; align-items: center; gap: 12px; margin-bottom: 14px; }
.po-sec .lbl {
  font-family: var(--font-display); font-weight: 700; font-size: 16px; color: #fff;
  background: var(--_c, var(--accent)); padding: 7px 16px; border-radius: 999px;
  box-shadow: var(--shadow-sm); letter-spacing: -0.01em;
}
.po-sec .ln { flex: 1 1 auto; height: 2px; background: var(--line); border-radius: 2px; }

/* media: icon badge or logo tile */
.po-media .ibadge { width: 44px; height: 44px; }
.po-media .logo { width: 44px; height: 44px; }

/* steps */
.po-steps { display: flex; flex-wrap: wrap; align-items: flex-start; justify-content: center; gap: 6px 2px; }
.po-step { width: 122px; text-align: center; display: flex; flex-direction: column; align-items: center; }
.po-step .t { margin-top: 9px; font-weight: 700; font-size: 13.5px; color: var(--text); line-height: 1.15; }
.po-step .s { margin-top: 3px; font-size: 11px; color: var(--muted); line-height: 1.28; }
.po-sarrow { align-self: flex-start; margin-top: 14px; color: color-mix(in srgb, var(--_c, var(--accent)) 55%, var(--muted)); }
.po-sarrow .icon { width: 20px; height: 20px; }

/* cards */
.po-cards { display: grid; grid-template-columns: repeat(var(--bc, 2), 1fr); gap: 14px; }
.po-card { background: var(--card); border-radius: 16px; box-shadow: var(--shadow-md);
  border-top: 4px solid var(--_c, var(--accent)); padding: 15px 16px; }
.po-card .ch { display: flex; align-items: center; gap: 11px; }
.po-card .ch .t { font-family: var(--font-display); font-weight: 700; font-size: 16px; color: var(--text); line-height: 1.1; }
.po-card .cs { font-size: 12.5px; color: var(--muted); margin-top: 7px; line-height: 1.34; }
.po-chips { display: flex; flex-wrap: wrap; gap: 6px; margin-top: 10px; }

/* columns */
.po-cols { display: flex; gap: 14px; }
.po-col { flex: 1 1 0; min-width: 0; background: var(--card); border-radius: 16px; box-shadow: var(--shadow-md); overflow: hidden; }
.po-col .h { background: linear-gradient(135deg, var(--_c, var(--accent)), color-mix(in srgb, var(--_c) 72%, #000 12%));
  color: #fff; font-family: var(--font-display); font-weight: 700; font-size: 16px; padding: 12px 14px; text-align: center; }
.po-col ul { list-style: none; padding: 12px 14px; display: flex; flex-direction: column; gap: 9px; }
.po-col li { display: flex; gap: 9px; align-items: flex-start; font-size: 12.5px; }
.po-col li .icon { width: 17px; height: 17px; color: var(--_c, var(--accent)); flex: 0 0 auto; margin-top: 1px; }
.po-col li b { font-weight: 700; color: var(--text); }
.po-col li span { color: var(--muted); }

/* callouts */
.po-calls { display: flex; flex-wrap: wrap; gap: 12px; }
.po-call { flex: 1 1 0; min-width: 150px; display: flex; gap: 11px; align-items: flex-start;
  background: var(--card); border-radius: 14px; box-shadow: var(--shadow-sm); padding: 14px; }
.po-call .ct b { display: block; font-size: 14px; font-weight: 700; color: var(--text); line-height: 1.18; }
.po-call .ct span { display: block; font-size: 11.5px; color: var(--muted); margin-top: 3px; line-height: 1.3; }
`;

const COLORVARS = { accent: 'var(--accent)', accent2: 'var(--accent2)', accent3: 'var(--accent3)' };
const cv = (c) => COLORVARS[c] || c || 'var(--accent)';

export function render(spec, h) {
  const { esc } = h;
  const head = renderHeader(spec, esc);
  const blocks = (spec.blocks || []).map((b) => renderBlock(b, h)).join('');
  return `${head}<div class="ig-body"><div class="po-body">${blocks}</div></div>${renderFooter(spec, esc)}`;
}

function media(it, { icon, logo }) {
  if (it.logo) return logo(it.logo);
  if (it.icon) return `<span class="ibadge">${icon(it.icon)}</span>`;
  return '';
}

function chips(items, h) {
  if (!items || !items.length) return '';
  const inner = items.map((it) =>
    `<span class="chip">${it.logo ? h.logo(it.logo) : h.icon(it.icon)}${h.esc(it.label)}</span>`).join('');
  return `<div class="po-chips">${inner}</div>`;
}

function renderBlock(b, h) {
  const { esc, icon } = h;
  const c = cv(b.color);
  const header = b.heading
    ? `<div class="po-sec reveal" data-from="left" style="--_c:${c}"><span class="lbl">${esc(b.heading)}</span><span class="ln"></span></div>`
    : '';
  let inner = '';

  if (b.kind === 'steps') {
    inner = `<div class="po-steps">` + (b.items || []).map((it, i, arr) => {
      const ic = cv(it.color || b.color);
      const node = `<div class="po-step po-media reveal" data-from="scale" style="--_c:${ic}">
        ${media(it, h)}<div class="t">${esc(it.label)}</div>${it.note ? `<div class="s">${esc(it.note)}</div>` : ''}</div>`;
      const arr2 = i < arr.length - 1 ? `<div class="po-sarrow reveal" data-from="fade" style="--_c:${c}">${icon('arrow')}</div>` : '';
      return node + arr2;
    }).join('') + `</div>`;

  } else if (b.kind === 'cards') {
    inner = `<div class="po-cards" style="--bc:${b.columns || 2}">` + (b.items || []).map((it) => {
      const ic = cv(it.color || b.color);
      return `<div class="po-card po-media reveal" data-from="up" style="--_c:${ic}">
        <div class="ch">${media(it, h)}<span class="t">${esc(it.label)}</span></div>
        ${it.note ? `<div class="cs">${esc(it.note)}</div>` : ''}
        ${chips(it.items, h)}</div>`;
    }).join('') + `</div>`;

  } else if (b.kind === 'columns') {
    inner = `<div class="po-cols">` + (b.sections || []).map((sec) => {
      const ic = cv(sec.color || b.color);
      const lis = (sec.items || []).map((it) =>
        `<li>${icon(it.icon || 'check')}<div><b>${esc(it.label)}</b>${it.note ? ` <span>${esc(it.note)}</span>` : ''}</div></li>`).join('');
      return `<div class="po-col reveal" data-from="up" style="--_c:${ic}"><div class="h">${esc(sec.heading)}</div><ul>${lis}</ul></div>`;
    }).join('') + `</div>`;

  } else if (b.kind === 'callouts') {
    inner = `<div class="po-calls">` + (b.items || []).map((it) => {
      const ic = cv(it.color || b.color);
      return `<div class="po-call po-media reveal" data-from="up" style="--_c:${ic}">${media(it, h)}
        <div class="ct"><b>${esc(it.label)}</b>${it.note ? `<span>${esc(it.note)}</span>` : ''}</div></div>`;
    }).join('') + `</div>`;
  }

  return `<div class="po-block">${header}${inner}</div>`;
}
