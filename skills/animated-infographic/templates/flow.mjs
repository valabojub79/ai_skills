// flow.mjs — stacked stage cards with icon+label nodes and arrow connectors.
// Also exports the shared header/footer used by the other templates.
import { icon as _icon } from '../lib/build-html.mjs';

export const css = `
.flow-card {
  background: var(--card);
  border-radius: var(--radius);
  box-shadow: var(--shadow-md);
  border: 1px solid var(--line);
  overflow: hidden;
}
.flow-card + .flow-card { margin-top: 16px; }
.flow-head {
  background: var(--_c, var(--accent));
  padding: 12px 20px;
  display: flex; align-items: center; gap: 10px;
}
.flow-head .h { font-family: var(--font-display); color: #fff; font-weight: 700; font-size: 19px; letter-spacing: -0.01em; }
.flow-head .dot { width: 9px; height: 9px; border-radius: 50%; background: rgba(255,255,255,.6); }
.flow-row { display: flex; flex-wrap: wrap; align-items: flex-start; gap: 10px 4px; padding: 18px 20px 22px; }
.flow-node { display: flex; flex-direction: column; align-items: center; width: 100px; text-align: center; }
.flow-node .ibadge { width: 54px; height: 54px; border-radius: 16px; }
.flow-node .ibadge .icon { width: 28px; height: 28px; }
.flow-node .lbl { margin-top: 9px; font-size: 13px; font-weight: 600; line-height: 1.18; color: var(--text); }
.flow-arrow { align-self: flex-start; margin-top: 16px; color: color-mix(in srgb, var(--_c, var(--accent)) 55%, var(--muted)); }
.flow-arrow .icon { width: 22px; height: 22px; }
`;

const COLORVARS = { accent: 'var(--accent)', accent2: 'var(--accent2)', accent3: 'var(--accent3)' };

export function render(spec, { esc, icon }) {
  const head = renderHeader(spec, esc);
  const cards = (spec.sections || []).map((sec) => {
    const c = COLORVARS[sec.color] || sec.color || 'var(--accent)';
    const nodes = (sec.items || []).map((it, i, arr) => {
      const node = `<div class="flow-node reveal" data-from="scale" style="--_c:${c}">
        <span class="ibadge">${icon(it.icon)}</span>
        <div class="lbl">${esc(it.label)}</div></div>`;
      const arrow = i < arr.length - 1
        ? `<div class="flow-arrow reveal" data-from="fade" style="--_c:${c}">${icon('arrow')}</div>` : '';
      return node + arrow;
    }).join('');
    return `<div class="flow-card reveal" data-from="up" style="--_c:${c}">
      <div class="flow-head reveal" data-from="left"><span class="dot"></span><span class="h">${esc(sec.heading)}</span></div>
      <div class="flow-row">${nodes}</div></div>`;
  }).join('');
  return `${head}<div class="ig-body">${cards}</div>${renderFooter(spec, esc)}`;
}

export function renderHeader(spec, esc) {
  const title = spec.titleHtml || esc(spec.title || '');
  return `<div class="ig-header">
    ${spec.eyebrow ? `<div class="ig-eyebrow reveal" data-from="fade">${esc(spec.eyebrow)}</div>` : ''}
    <div class="ig-title reveal" data-from="down">${title}</div>
    ${spec.subtitle ? `<div class="ig-subtitle reveal" data-from="fade">${esc(spec.subtitle)}</div>` : ''}
    ${spec.author ? `<div class="ig-author reveal" data-from="fade">${esc(spec.author)}</div>` : ''}
    <div class="ig-rule reveal" data-from="left"></div>
  </div>`;
}

export function renderFooter(spec, esc) {
  const bar = spec.footer
    ? `<div class="ig-footer reveal" data-from="up">${_icon('sparkles')}<span>${esc(spec.footer)}</span></div>` : '';
  const src = spec.source
    ? `<div class="ig-source reveal" data-from="fade"><b>Source:</b> ${esc(spec.source)}</div>` : '';
  return bar + src;
}
