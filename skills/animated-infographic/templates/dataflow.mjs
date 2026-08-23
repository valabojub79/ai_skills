// dataflow.mjs — zoned top-down data-flow diagram (like a Mermaid `graph TD` with
// subgraphs). Zones stack vertically; each zone holds one or more ROWS of nodes.
// Connectors between consecutive rows are auto-inferred: 1->N diverges, N->1 converges,
// N->N pairs in parallel, else all-to-all. Motion mode streams dashes down the flow.
import { renderHeader, renderFooter } from './flow.mjs';

export const css = `
.df-body { position: relative; display: flex; flex-direction: column; gap: 30px; }
.df-svg { position: absolute; inset: 0; width: 100%; height: 100%; overflow: visible; pointer-events: none; }
.df-base { fill: none; stroke-linecap: round; stroke-linejoin: round; stroke-width: 8;
  stroke: color-mix(in srgb, var(--accent) 15%, #dfe4ee); }
.df-mid  { fill: none; stroke-linecap: round; stroke-linejoin: round; stroke-width: 3.5; stroke: #fff; }
.df-flow { fill: none; stroke: var(--accent); stroke-width: 3; stroke-linecap: round;
  stroke-dasharray: 2.5 10; stroke-dashoffset: calc(var(--dash, 0) * -12.5px); }
.df-arrow { fill: var(--accent); stroke: #fff; stroke-width: 1.2; }

.df-zone { position: relative; border-radius: 20px; padding: 32px 20px 22px;
  border: 1.6px solid color-mix(in srgb, var(--_c, var(--accent)) 30%, var(--line));
  background: color-mix(in srgb, var(--_c, var(--accent)) 4%, transparent); }
.df-zlabel { position: absolute; top: -14px; left: 20px; display: inline-flex; align-items: baseline; gap: 8px;
  background: var(--_c, var(--accent)); color: #fff; font-family: var(--font-display); font-weight: 700;
  font-size: 14px; padding: 6px 14px; border-radius: 999px; box-shadow: var(--shadow-sm); letter-spacing: -0.01em; }
.df-zlabel .tag { font-family: ui-monospace, 'SF Mono', Menlo, monospace; font-weight: 500;
  font-size: 11px; opacity: 0.85; }

.df-rows { display: flex; flex-direction: column; gap: 30px; position: relative; z-index: 1; }
.df-row { display: flex; justify-content: center; align-items: stretch; gap: 22px; flex-wrap: wrap; }
.df-node { position: relative; background: var(--card); border-radius: 13px; box-shadow: var(--shadow-md);
  border-top: 3px solid var(--_nc, var(--_c, var(--accent))); padding: 11px 14px; min-width: 150px;
  display: flex; align-items: center; gap: 11px; }
.df-node .ibadge { width: 38px; height: 38px; border-radius: 10px; --_c: var(--_nc, var(--_c, var(--accent))); }
.df-node .ibadge .icon { width: 21px; height: 21px; }
.df-node .nx { min-width: 0; }
.df-node .nx b { display: block; font-family: var(--font-display); font-weight: 700; font-size: 14px; color: var(--text); line-height: 1.12; }
.df-node .nx code { font-family: ui-monospace, 'SF Mono', Menlo, monospace; font-size: 12px; font-weight: 600; }
.df-node .nx span { display: block; font-size: 11px; color: var(--muted); margin-top: 3px; line-height: 1.28; }

.df-elabel { position: absolute; transform: translate(-50%, -50%); z-index: 3;
  background: #fff; box-shadow: var(--shadow-sm); border-radius: 999px; padding: 3px 10px;
  font-size: 10.5px; font-weight: 700; color: var(--text); white-space: nowrap;
  border: 1px solid var(--line); }
.df-elabel.warn { color: #B45309; border-color: color-mix(in srgb, #D97706 40%, #fff); }
`;

const COLORVARS = { accent: 'var(--accent)', accent2: 'var(--accent2)', accent3: 'var(--accent3)' };
const cv = (c) => COLORVARS[c] || c || 'var(--accent)';

export function render(spec, { esc, icon }) {
  const head = renderHeader(spec, esc);
  let rowIdx = 0;
  const zonesHtml = (spec.zones || []).map((z) => {
    const zc = cv(z.color);
    const rows = (z.rows || []).map((row) => {
      const gi = rowIdx++;
      const nodes = row.map((nd, j) => {
        const nc = nd.color ? cv(nd.color) : zc;
        const label = nd.code ? `<code>${esc(nd.code)}</code>` : `<b>${esc(nd.label)}</b>`;
        const el = nd.edgeLabel ? ` data-elabel="${esc(nd.edgeLabel)}" data-etone="${nd.edgeTone || ''}"` : '';
        return `<div class="df-node" data-row="${gi}" data-col="${j}"${el} style="--_nc:${nc}">
          ${nd.icon ? `<span class="ibadge">${icon(nd.icon)}</span>` : ''}
          <div class="nx"><b>${esc(nd.label || '')}</b>${nd.sub ? `<span>${esc(nd.sub)}</span>` : ''}</div>
        </div>`;
      }).join('');
      return `<div class="df-row" data-rowidx="${gi}">${nodes}</div>`;
    }).join('');
    const tag = z.tag ? `<span class="tag">${esc(z.tag)}</span>` : '';
    return `<div class="df-zone" style="--_c:${zc}">
      <span class="df-zlabel">${esc(z.label)}${tag}</span>
      <div class="df-rows">${rows}</div></div>`;
  }).join('');

  const svg = `<svg class="df-svg" id="df-svg"><path class="df-base" id="df-base"></path><path class="df-mid" id="df-mid"></path><path class="df-flow" id="df-flow"></path></svg>`;
  const body = `<div class="df-body" id="df-body">${svg}${zonesHtml}</div>`;
  return `${head}<div class="ig-body">${body}</div>${renderFooter(spec, esc)}${FLOW_SCRIPT}`;
}

// Auto-routes connectors between consecutive rows once layout is final.
const FLOW_SCRIPT = `
<script>
function dfRounded(pts, r){
  if (pts.length < 3) return 'M' + pts.map(function(p){return p.x.toFixed(1)+' '+p.y.toFixed(1);}).join(' L');
  function d(a,b){return Math.hypot(a.x-b.x,a.y-b.y);}
  var s='M'+pts[0].x.toFixed(1)+' '+pts[0].y.toFixed(1);
  for(var i=1;i<pts.length-1;i++){
    var p0=pts[i-1],p1=pts[i],p2=pts[i+1];
    var rr=Math.min(r,d(p0,p1)/2,d(p1,p2)/2);
    var a={x:p1.x+(p0.x-p1.x)/d(p0,p1)*rr,y:p1.y+(p0.y-p1.y)/d(p0,p1)*rr};
    var b={x:p1.x+(p2.x-p1.x)/d(p1,p2)*rr,y:p1.y+(p2.y-p1.y)/d(p1,p2)*rr};
    s+=' L'+a.x.toFixed(1)+' '+a.y.toFixed(1)+' Q'+p1.x.toFixed(1)+' '+p1.y.toFixed(1)+' '+b.x.toFixed(1)+' '+b.y.toFixed(1);
  }
  var L=pts[pts.length-1]; s+=' L'+L.x.toFixed(1)+' '+L.y.toFixed(1); return s;
}
window.__seekHook = (function(){
  var built=false;
  function build(){
    built=true;
    var body=document.getElementById('df-body'); if(!body) return;
    var svg=document.getElementById('df-svg');
    var br=body.getBoundingClientRect();
    svg.setAttribute('viewBox','0 0 '+br.width+' '+br.height);
    // collect rows (arrays of node rects) in order
    var nodes=Array.prototype.slice.call(body.querySelectorAll('.df-node'));
    var rows={};
    nodes.forEach(function(el){
      var r=(+el.getAttribute('data-row'));
      (rows[r]=rows[r]||[]).push(el);
    });
    var keys=Object.keys(rows).map(Number).sort(function(a,b){return a-b;});
    function anchor(el, top){ var r=el.getBoundingClientRect();
      return { x:r.left-br.left+r.width/2, y:(top? r.top:r.bottom)-br.top, el:el }; }
    var NS='http://www.w3.org/2000/svg';
    var baseD='', arrows=[], labels=[];
    for(var k=0;k<keys.length-1;k++){
      var A=rows[keys[k]], B=rows[keys[k+1]];
      // pairing rule
      var pairs=[];
      if(A.length===1){ B.forEach(function(b){pairs.push([A[0],b]);}); }
      else if(B.length===1){ A.forEach(function(a){pairs.push([a,B[0]]);}); }
      else if(A.length===B.length){ for(var i=0;i<A.length;i++) pairs.push([A[i],B[i]]); }
      else { A.forEach(function(a){B.forEach(function(b){pairs.push([a,b]);});}); }
      pairs.forEach(function(pr){
        var s=anchor(pr[0],false), e=anchor(pr[1],true);
        var pts=[s];
        if(Math.abs(s.x-e.x)>6){ var my=(s.y+e.y)/2; pts.push({x:s.x,y:my},{x:e.x,y:my}); }
        pts.push(e);
        baseD+=' '+dfRounded(pts,14);
        arrows.push({x:e.x,y:e.y});
        // edge label is SOURCE-side: it annotates edges LEAVING the node that carries it
        var lb=pr[0].getAttribute('data-elabel');
        if(lb) labels.push({x:(s.x+e.x)/2,y:(s.y+e.y)/2,t:lb,tone:pr[0].getAttribute('data-etone')});
      });
    }
    baseD=baseD.trim();
    ['df-base','df-mid','df-flow'].forEach(function(id){ document.getElementById(id).setAttribute('d',baseD); });
    arrows.forEach(function(a){
      var t=document.createElementNS(NS,'path');
      t.setAttribute('d','M-6,-7 L8,0 L-6,7 Z'); t.setAttribute('class','df-arrow');
      t.setAttribute('transform','translate('+a.x.toFixed(1)+','+(a.y+1).toFixed(1)+') rotate(90)');
      svg.appendChild(t);
    });
    labels.forEach(function(l){
      var d=document.createElement('div'); d.className='df-elabel'+(l.tone==='warn'?' warn':'');
      d.textContent=l.t; d.style.left=l.x.toFixed(1)+'px'; d.style.top=l.y.toFixed(1)+'px';
      body.appendChild(d);
    });
  }
  return function(){ if(!built) build(); };
})();
</script>`;
