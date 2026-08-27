// layouts.mjs — one pptxgenjs builder per slide layout. Design rules baked in
// (Anthropic pptx skill): left-align body, titles only centered on title/section,
// no accent stripes/underlines, palette dominance, no text-only slides, notes via
// addNotes, safe fonts. Hero visuals are our animated-infographic GIFs (poster PNG
// is the first frame for viewers that don't animate GIFs).
import { GEO, FONT, hx, mix } from './theme.mjs';

const esc = (s) => (s == null ? '' : String(s));

function footer(pres, slide, T, ctx) {
  slide.addText(esc(ctx.deckTitle), {
    x: GEO.margin, y: GEO.footerY, w: 8, h: 0.3, fontFace: FONT.body,
    fontSize: 9, color: hx(T.muted), align: 'left', margin: 0,
  });
  slide.addText(`${ctx.index + 1} / ${ctx.total}`, {
    x: GEO.W - GEO.margin - 1.5, y: GEO.footerY, w: 1.5, h: 0.3, fontFace: FONT.body,
    fontSize: 9, color: hx(T.muted), align: 'right', margin: 0,
  });
}

function title(pres, slide, T, s) {
  slide.addText(esc(s.title), {
    x: GEO.margin, y: GEO.titleY, w: GEO.contentW, h: GEO.titleH, fontFace: FONT.head,
    fontSize: 30, bold: true, color: hx(T.text), align: 'left', valign: 'top', margin: 0,
  });
}

function panel(pres, slide, x, y, w, h, fill) {
  slide.addShape(pres.ShapeType.roundRect, {
    x, y, w, h, rectRadius: 0.08, fill: { color: hx(fill) }, line: { type: 'none' },
  });
}

function heroBox(assets, x, y, w, h, slide) {
  if (!assets || !assets.gif) return;
  slide.addImage({ path: assets.gif, x, y, w, h, sizing: { type: 'contain', w, h } });
}

// ---- layouts ----
export const LAYOUTS = {
  title(pres, slide, s, T) {
    slide.background = { color: hx(T.dominant) };
    slide.addText(s.titleHtml ? esc(s.title) : esc(s.title), {
      x: 0.9, y: 2.5, w: GEO.W - 1.8, h: 1.6, fontFace: FONT.head, fontSize: 44, bold: true,
      color: hx(T.onDark), align: 'left', valign: 'bottom', margin: 0,
    });
    if (s.subtitle) slide.addText(esc(s.subtitle), {
      x: 0.9, y: 4.15, w: GEO.W - 1.8, h: 0.9, fontFace: FONT.body, fontSize: 20,
      color: hx(mix(T.dominant, '#FFFFFF', 0.75)), align: 'left', margin: 0,
    });
    if (s.author) slide.addText(esc(s.author), {
      x: 0.9, y: 6.4, w: GEO.W - 1.8, h: 0.4, fontFace: FONT.body, fontSize: 13,
      color: hx(mix(T.dominant, '#FFFFFF', 0.6)), align: 'left', margin: 0,
    });
  },

  section(pres, slide, s, T, assets, ctx) {
    slide.background = { color: hx(mix(T.dominant, '#000000', 0.12)) };
    slide.addText(`${String(ctx.index).padStart(2, '0')}`, {
      x: 0.9, y: 1.9, w: 3, h: 1.2, fontFace: FONT.head, fontSize: 40, bold: true,
      color: hx(mix(T.dominant, '#FFFFFF', 0.45)), align: 'left', margin: 0,
    });
    slide.addText(esc(s.title), {
      x: 0.9, y: 3.0, w: GEO.W - 1.8, h: 1.6, fontFace: FONT.head, fontSize: 34, bold: true,
      color: hx(T.onDark), align: 'left', valign: 'top', margin: 0,
    });
  },

  bullets(pres, slide, s, T, assets, ctx) {
    slide.background = { color: hx(T.bg) };
    title(pres, slide, T, s);
    // light panel so the slide isn't a bare text list
    panel(pres, slide, GEO.margin, GEO.bodyY, GEO.contentW, 4.6, T.light);
    const items = (s.bullets || []).map((b) => ({
      text: esc(b), options: { bullet: { indent: 18 }, color: hx(T.text), fontSize: 18, paraSpaceAfter: 10 },
    }));
    slide.addText(items, {
      x: GEO.margin + 0.4, y: GEO.bodyY + 0.35, w: GEO.contentW - 0.8, h: 4.0,
      fontFace: FONT.body, align: 'left', valign: 'top',
    });
    footer(pres, slide, T, ctx);
  },

  'two-column'(pres, slide, s, T, assets, ctx) {
    slide.background = { color: hx(T.bg) };
    title(pres, slide, T, s);
    const colW = (GEO.contentW - GEO.gap) / 2;
    const items = (s.bullets || []).map((b) => ({
      text: esc(b), options: { bullet: { indent: 18 }, color: hx(T.text), fontSize: 18, paraSpaceAfter: 10 },
    }));
    slide.addText(items, {
      x: GEO.margin, y: GEO.bodyY, w: colW, h: 4.4, fontFace: FONT.body, align: 'left', valign: 'top',
    });
    const rx = GEO.margin + colW + GEO.gap;
    panel(pres, slide, rx, GEO.bodyY, colW, 4.4, T.light);
    heroBox(assets, rx + 0.15, GEO.bodyY + 0.15, colW - 0.3, 4.1, slide);
    if (s.caption) slide.addText(esc(s.caption), {
      x: rx, y: GEO.bodyY + 4.45, w: colW, h: 0.4, fontFace: FONT.body, fontSize: 11,
      italic: true, color: hx(T.muted), align: 'center', margin: 0,
    });
    footer(pres, slide, T, ctx);
  },

  'hero-visual'(pres, slide, s, T, assets, ctx) {
    slide.background = { color: hx(T.bg) };
    title(pres, slide, T, s);
    const bw = GEO.contentW, bh = 4.4;
    panel(pres, slide, GEO.margin, GEO.bodyY, bw, bh, T.light);
    heroBox(assets, GEO.margin + 0.2, GEO.bodyY + 0.2, bw - 0.4, bh - 0.4, slide);
    if (s.caption) slide.addText(esc(s.caption), {
      x: GEO.margin, y: GEO.bodyY + bh + 0.1, w: bw, h: 0.4, fontFace: FONT.body, fontSize: 12,
      italic: true, color: hx(T.muted), align: 'center', margin: 0,
    });
    footer(pres, slide, T, ctx);
  },

  stat(pres, slide, s, T, assets, ctx) {
    slide.background = { color: hx(T.bg) };
    title(pres, slide, T, s);
    const stats = (s.stats || []).slice(0, 4);
    const n = Math.max(1, stats.length);
    const totalW = GEO.contentW, gap = GEO.gap;
    const cw = (totalW - gap * (n - 1)) / n;
    stats.forEach((st, i) => {
      const x = GEO.margin + i * (cw + gap);
      panel(pres, slide, x, GEO.bodyY, cw, 3.2, T.light);
      slide.addText(esc(st.value), {
        x, y: GEO.bodyY + 0.4, w: cw, h: 1.5, fontFace: FONT.head, fontSize: 48, bold: true,
        color: hx(i % 2 ? T.accent : T.dominant), align: 'center', margin: 0,
      });
      slide.addText(esc(st.label), {
        x: x + 0.2, y: GEO.bodyY + 1.9, w: cw - 0.4, h: 1.1, fontFace: FONT.body, fontSize: 15,
        color: hx(T.text), align: 'center', valign: 'top', margin: 0,
      });
    });
    footer(pres, slide, T, ctx);
  },

  comparison(pres, slide, s, T, assets, ctx) {
    slide.background = { color: hx(T.bg) };
    title(pres, slide, T, s);
    const cols = (s.columns || []).slice(0, 3);
    const n = Math.max(1, cols.length);
    const cw = (GEO.contentW - GEO.gap * (n - 1)) / n;
    const palette = [T.dominant, T.accent, T.supporting[0] || T.dominant];
    cols.forEach((c, i) => {
      const x = GEO.margin + i * (cw + GEO.gap);
      panel(pres, slide, x, GEO.bodyY, cw, 4.4, T.light);
      slide.addShape(pres.ShapeType.roundRect, {
        x, y: GEO.bodyY, w: cw, h: 0.7, rectRadius: 0.08, fill: { color: hx(palette[i]) }, line: { type: 'none' },
      });
      slide.addText(esc(c.heading), {
        x, y: GEO.bodyY, w: cw, h: 0.7, fontFace: FONT.head, fontSize: 17, bold: true,
        color: 'FFFFFF', align: 'center', valign: 'middle', margin: 0,
      });
      const items = (c.items || []).map((it) => ({
        text: esc(it), options: { bullet: { indent: 16 }, color: hx(T.text), fontSize: 14, paraSpaceAfter: 8 },
      }));
      slide.addText(items, {
        x: x + 0.3, y: GEO.bodyY + 0.9, w: cw - 0.6, h: 3.3, fontFace: FONT.body, align: 'left', valign: 'top',
      });
    });
    footer(pres, slide, T, ctx);
  },

  quote(pres, slide, s, T, assets, ctx) {
    slide.background = { color: hx(T.light) };
    slide.addText('“', {
      x: 0.7, y: 0.9, w: 2, h: 2, fontFace: FONT.head, fontSize: 120, bold: true,
      color: hx(mix(T.dominant, '#FFFFFF', 0.55)), align: 'left', margin: 0,
    });
    slide.addText(esc(s.title), {
      x: 1.4, y: 2.4, w: GEO.W - 2.8, h: 2.8, fontFace: FONT.head, fontSize: 30, bold: true,
      color: hx(T.text), align: 'left', valign: 'top', margin: 0,
    });
    if (s.author) slide.addText('— ' + esc(s.author), {
      x: 1.4, y: 5.4, w: GEO.W - 2.8, h: 0.5, fontFace: FONT.body, fontSize: 15,
      color: hx(T.muted), align: 'left', margin: 0,
    });
    footer(pres, slide, T, ctx);
  },

  closing(pres, slide, s, T, assets, ctx) {
    slide.background = { color: hx(T.dominant) };
    slide.addText(esc(s.title), {
      x: 0.9, y: 2.2, w: GEO.W - 1.8, h: 1.3, fontFace: FONT.head, fontSize: 36, bold: true,
      color: hx(T.onDark), align: 'left', valign: 'top', margin: 0,
    });
    const items = (s.bullets || []).map((b) => ({
      text: esc(b), options: { bullet: { indent: 18 }, color: hx(mix(T.dominant, '#FFFFFF', 0.85)), fontSize: 18, paraSpaceAfter: 10 },
    }));
    if (items.length) slide.addText(items, {
      x: 0.9, y: 3.6, w: GEO.W - 1.8, h: 2.2, fontFace: FONT.body, align: 'left', valign: 'top',
    });
    if (s.source) slide.addText('Source: ' + esc(s.source), {
      x: 0.9, y: GEO.footerY, w: GEO.W - 1.8, h: 0.35, fontFace: FONT.body, fontSize: 11,
      color: hx(mix(T.dominant, '#FFFFFF', 0.6)), align: 'left', margin: 0,
    });
  },
};

export const LAYOUT_NAMES = Object.keys(LAYOUTS);
