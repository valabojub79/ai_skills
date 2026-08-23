// roadmap.mjs — a CONNECTED roadmap: Start + numbered stations + Goal, laid out in a
// serpentine (snake) grid and wired together by a routed path with directional arrows.
// The connector path is computed in-page from the real node positions (window.__seekHook),
// so it adapts to any station count/size. Motion: marching dashes flow along the route and
// a highlight sweeps station-to-station, reinforcing direction/evolution.
import { renderHeader, renderFooter } from './flow.mjs';

export const css = `
.rm-grid {
  position: relative; flex: 1 1 auto;
  display: grid; grid-template-columns: repeat(var(--cols, 2), 1fr);
  gap: 54px 46px; align-content: start; padding-top: 6px;
}
.rm-svg { position: absolute; inset: 0; width: 100%; height: 100%; overflow: visible; pointer-events: none; z-index: 0; }
/* connectors styled like a soft "road": light casing + flowing accent centerline */
.rm-base { fill: none; stroke-linecap: round; stroke-linejoin: round; stroke-width: 11;
  stroke: color-mix(in srgb, var(--accent) 16%, #dfe4ee); }
.rm-mid  { fill: none; stroke-linecap: round; stroke-linejoin: round; stroke-width: 5;
  stroke: #fff; }
.rm-flow { fill: none; stroke: var(--accent); stroke-width: 4; stroke-linecap: round;
  stroke-dasharray: 3 12; stroke-dashoffset: calc(var(--dash, 0) * -15px); }
.rm-arrow { fill: var(--accent); stroke: #fff; stroke-width: 1.5; }

.rm-node { position: relative; z-index: 1; display: flex; }
/* Content stays completely still — only the connector line animates. */
.station {
  width: 100%; background: var(--card); border-radius: 18px;
  border-top: 4px solid var(--_c, var(--accent));
  padding: 15px 16px 16px; box-shadow: var(--shadow-md);
}
.station .srow { display: flex; align-items: center; gap: 11px; }
.station .snum {
  flex: 0 0 auto; width: 36px; height: 36px; border-radius: 11px;
  background: var(--_c, var(--accent)); color: #fff;
  font-family: var(--font-display); font-weight: 700; font-size: 17px;
  display: flex; align-items: center; justify-content: center;
  box-shadow: 0 4px 10px color-mix(in srgb, var(--_c, var(--accent)) 35%, transparent);
}
.station h3 { font-family: var(--font-display); font-size: 17px; font-weight: 700; color: var(--text); line-height: 1.08; letter-spacing: -0.01em; }
.station .ssub { font-size: 12.5px; color: var(--muted); margin-top: 6px; line-height: 1.32; }
.station .chips { display: flex; flex-wrap: wrap; gap: 6px; margin-top: 11px; }
.chip { display: inline-flex; align-items: center; gap: 5px; font-size: 11px; font-weight: 600; color: var(--text);
  background: color-mix(in srgb, var(--_c, var(--accent)) 10%, #fff); border-radius: 8px; padding: 4px 9px; }
.chip .icon { width: 14px; height: 14px; color: var(--_c, var(--accent)); }

.terminal { width: 100%; border-radius: 18px; padding: 18px; text-align: center; color: #fff;
  background: linear-gradient(140deg, var(--_c, var(--accent)), color-mix(in srgb, var(--_c) 64%, #000 16%));
  box-shadow: var(--shadow-lg); }
.terminal .icon { width: 30px; height: 30px; color: #fff; margin: 0 auto; }
.terminal .tt { font-family: var(--font-display); font-weight: 700; font-size: 19px; margin-top: 7px; letter-spacing: -0.01em; }
.terminal .ts { font-size: 12px; opacity: 0.9; margin-top: 3px; }

/* annotated side-panel ("explain the why") inside a station */
.rm-note { margin-top: 11px; padding: 9px 11px; border-radius: 10px;
  background: color-mix(in srgb, var(--nc) 8%, #fff);
  border-left: 3px solid var(--nc); }
.rm-note .nb { display: inline-flex; align-items: center; gap: 5px; font-family: var(--font-display);
  font-weight: 700; font-size: 11px; color: var(--nc); text-transform: uppercase; letter-spacing: 0.03em; }
.rm-note .nb .icon { width: 14px; height: 14px; }
.rm-note .nt { display: block; margin-top: 4px; font-size: 12px; color: var(--text); line-height: 1.34; }

/* connector edge label */
.rm-elabel { position: absolute; z-index: 2; transform: translate(-50%, -50%);
  background: #fff; box-shadow: var(--shadow-sm); border-radius: 999px;
  padding: 3px 10px; font-size: 11px; font-weight: 700; color: var(--text); white-space: nowrap; }
`;

const COLORVARS = { accent: 'var(--accent)', accent2: 'var(--accent2)', accent3: 'var(--accent3)' };
const cycle = ['accent3', 'accent2', 'accent'];
const TONE = { info: ['#2563EB', 'bulb'], warn: ['#D97706', 'flag'], danger: ['#DC2626', 'shield'], success: ['#16A34A', 'check'] };

// Annotated side-panel: a small "explain the why" callout attached to a station.
function renderAnnotation(a, esc, icon) {
  const [color, ic] = TONE[a.tone] || TONE.info;
  return `<div class="rm-note" style="--nc:${color}">
    ${a.badge ? `<span class="nb">${icon(a.icon || ic)}${esc(a.badge)}</span>` : ''}
    <span class="nt">${esc(a.text || '')}</span></div>`;
}

export function render(spec, { esc, icon, logo }) {
  const head = renderHeader(spec, esc);
  const cols = spec.columns || 2;
  const sections = spec.sections || [];

  // Build the ordered node list: Start terminal, stations, Goal terminal.
  const start = spec.start || { label: 'Start', icon: 'flag' };
  const goal = spec.goal || { label: 'Production Agent', sub: 'Ship it', icon: 'rocket' };
  const nodes = [];
  nodes.push({ type: 'terminal', color: 'accent', icon: start.icon || 'flag', label: start.label || 'Start', sub: start.sub });
  sections.forEach((sec, i) => nodes.push({
    type: 'station', idx: i,
    color: sec.color || cycle[i % cycle.length],
    number: sec.number ?? i + 1,
    heading: sec.heading, sub: sec.sub, items: sec.items || [],
    annotation: sec.annotation, transition: sec.transition,
  }));
  nodes.push({ type: 'terminal', color: goal.color || 'accent', icon: goal.icon || 'rocket', label: goal.label, sub: goal.sub });

  // Optional vertical stagger: offset odd grid columns downward so horizontal hops
  // change both axes and the connector visibly S-curves through the gutter.
  const stagger = Number(spec.stagger) || 0;
  const cells = nodes.map((nd, k) => {
    const row = Math.floor(k / cols);
    const col = row % 2 === 0 ? (k % cols) : (cols - 1 - (k % cols)); // serpentine
    const c = COLORVARS[nd.color] || nd.color || 'var(--accent)';
    const off = stagger && (col % 2 === 1) ? `;margin-top:${stagger}px` : '';
    const pos = `grid-row:${row + 1};grid-column:${col + 1}${off}`;
    if (nd.type === 'terminal') {
      return `<div class="rm-node" data-node="${k}" style="${pos}">
        <div class="terminal" style="--_c:${c}">${icon(nd.icon)}
          <div class="tt">${esc(nd.label)}</div>${nd.sub ? `<div class="ts">${esc(nd.sub)}</div>` : ''}
        </div></div>`;
    }
    const chips = nd.items.map((it) =>
      `<span class="chip">${it.logo ? logo(it.logo) : icon(it.icon)}${esc(it.label)}</span>`).join('');
    const ann = nd.annotation ? renderAnnotation(nd.annotation, esc, icon) : '';
    const tlabel = nd.transition ? ` data-tlabel="${esc(nd.transition)}"` : '';
    return `<div class="rm-node" data-node="${k}" data-band="${nd.idx}"${tlabel} style="${pos}">
      <div class="station" style="--_c:${c}">
        <div class="srow"><div class="snum">${nd.number}</div><h3>${esc(nd.heading)}</h3></div>
        ${nd.sub ? `<div class="ssub">${esc(nd.sub)}</div>` : ''}
        ${chips ? `<div class="chips">${chips}</div>` : ''}
        ${ann}
      </div></div>`;
  }).join('');

  const svg = `<svg class="rm-svg" id="rm-svg"><path class="rm-base" id="rm-base"></path><path class="rm-mid" id="rm-mid"></path><path class="rm-flow" id="rm-flow"></path></svg>`;
  const grid = `<div class="rm-grid" id="rm-grid" style="--cols:${cols}">${svg}${cells}</div>`;

  return `${head}<div class="ig-body">${grid}</div>${renderFooter(spec, esc)}${CONNECTOR_SCRIPT}`;
}

// Computes the connector path through the nodes (in order) once layout is final, then adds
// a direction arrow at each segment midpoint. CSS handles the flowing dashes via --dash.
const CONNECTOR_SCRIPT = `
<script>
// Build an SVG path through the points with rounded corners (radius r) so the
// connector reads like a smooth winding road instead of sharp elbows.
function roundedPath(pts, r){
  if (pts.length < 3){
    return 'M' + pts.map(function(p){ return p.x.toFixed(1)+' '+p.y.toFixed(1); }).join(' L');
  }
  function dist(a,b){ return Math.hypot(a.x-b.x, a.y-b.y); }
  var d = 'M' + pts[0].x.toFixed(1) + ' ' + pts[0].y.toFixed(1);
  for (var i=1;i<pts.length-1;i++){
    var p0=pts[i-1], p1=pts[i], p2=pts[i+1];
    var rr = Math.min(r, dist(p0,p1)/2, dist(p1,p2)/2);
    var v1x=(p0.x-p1.x)/dist(p0,p1), v1y=(p0.y-p1.y)/dist(p0,p1);
    var v2x=(p2.x-p1.x)/dist(p1,p2), v2y=(p2.y-p1.y)/dist(p1,p2);
    var ax=p1.x+v1x*rr, ay=p1.y+v1y*rr, bx=p1.x+v2x*rr, by=p1.y+v2y*rr;
    d += ' L'+ax.toFixed(1)+' '+ay.toFixed(1)+' Q'+p1.x.toFixed(1)+' '+p1.y.toFixed(1)+' '+bx.toFixed(1)+' '+by.toFixed(1);
  }
  var last=pts[pts.length-1];
  d += ' L'+last.x.toFixed(1)+' '+last.y.toFixed(1);
  return d;
}
// Route ONE transition A->B through the gutter between the cards, anchored on card
// EDGES (not centers) so the road runs around the cards and turns with rounded
// corners in the open gap. Returns { d, arrow:{x,y,ang} } for a standalone subpath.
function routeEdge(a, b){
  var EPS = 6;
  var sameRow = Math.abs((a.top+a.h/2) - (b.top+b.h/2)) < Math.min(a.h,b.h)/2;
  var sameCol = Math.abs((a.left+a.w/2) - (b.left+b.w/2)) < Math.min(a.w,b.w)/2;
  var start, end, mids = [];
  if (sameRow && !sameCol){                       // horizontal neighbours
    var goRight = (b.left+b.w/2) > (a.left+a.w/2);
    start = { x: goRight ? a.left+a.w : a.left, y: a.top+a.h/2 };
    end   = { x: goRight ? b.left : b.left+b.w,  y: b.top+b.h/2 };
    if (Math.abs(start.y-end.y) > EPS){ var mx=(start.x+end.x)/2; mids=[{x:mx,y:start.y},{x:mx,y:end.y}]; }
  } else {                                         // vertical (or diagonal) — exit bottom, enter top
    var goDown = (b.top+b.h/2) > (a.top+a.h/2);
    start = { x: a.left+a.w/2, y: goDown ? a.top+a.h : a.top };
    end   = { x: b.left+b.w/2, y: goDown ? b.top : b.top+b.h };
    if (Math.abs(start.x-end.x) > EPS){ var my=(start.y+end.y)/2; mids=[{x:start.x,y:my},{x:end.x,y:my}]; }
  }
  var pts = [start].concat(mids, [end]);
  var d = roundedPath(pts, 18);
  var pen = pts[pts.length-2];                     // penultimate point → entry direction
  var ang = Math.atan2(end.y-pen.y, end.x-pen.x) * 180 / Math.PI;
  var mid = { x: (start.x+end.x)/2, y: (start.y+end.y)/2 };
  return { d: d, mid: mid, arrow: { x: end.x, y: end.y, ang: ang } };
}

window.__seekHook = (function(){
  var built = false;
  function build(){
    built = true;
    var grid = document.getElementById('rm-grid'); if(!grid) return;
    var svg = document.getElementById('rm-svg');
    var gr = grid.getBoundingClientRect();
    svg.setAttribute('viewBox', '0 0 ' + gr.width + ' ' + gr.height);
    var nodes = Array.prototype.slice.call(grid.querySelectorAll('[data-node]'));
    nodes.sort(function(a,b){ return (+a.getAttribute('data-node')) - (+b.getAttribute('data-node')); });
    var rects = nodes.map(function(el){ var r = el.getBoundingClientRect();
      return { left: r.left-gr.left, top: r.top-gr.top, w: r.width, h: r.height }; });
    if (rects.length < 2) return;
    var NS = 'http://www.w3.org/2000/svg';
    var baseD = '', arrows = [];
    for (var i=1;i<rects.length;i++){
      var seg = routeEdge(rects[i-1], rects[i]);
      baseD += ' ' + seg.d;                        // concatenate as independent subpaths (each starts with M)
      seg.arrow.label = nodes[i].getAttribute('data-tlabel');  // label on the edge INTO node i
      seg.arrow.mid = seg.mid;
      arrows.push(seg.arrow);
    }
    baseD = baseD.trim();
    document.getElementById('rm-base').setAttribute('d', baseD);
    document.getElementById('rm-mid').setAttribute('d', baseD);
    document.getElementById('rm-flow').setAttribute('d', baseD);
    arrows.forEach(function(ar){
      var tri = document.createElementNS(NS,'path');
      tri.setAttribute('d','M-6,-7 L8,0 L-6,7 Z');
      tri.setAttribute('class','rm-arrow');
      tri.setAttribute('transform','translate('+ar.x.toFixed(1)+','+ar.y.toFixed(1)+') rotate('+ar.ang.toFixed(1)+')');
      svg.appendChild(tri);
      if (ar.label){                               // labeled transition pill at the segment midpoint
        var lab = document.createElement('div');
        lab.className = 'rm-elabel';
        lab.textContent = ar.label;
        lab.style.left = ar.mid.x.toFixed(1) + 'px';
        lab.style.top = ar.mid.y.toFixed(1) + 'px';
        grid.appendChild(lab);
      }
    });
  }
  return function(){ if(!built) build(); };
})();
</script>`;
