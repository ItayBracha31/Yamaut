/* ============================================================================
   ימאות — nav.js: ניווט חופי.
   שלוש תצוגות: 'chart' (מפה אינטראקטיבית + תרגילים), 'navcalc' (מחשבונים),
   'navlearn' (מושגים). המפה נבנית מ-window.NAV_DATA (navdata.js).
   מוסכמות: כיוונים אמיתיים בלבד, 3 ספרות ("047°"); צפון למעלה (y קטן);
   כיוון = atan2(Δמזרח, Δצפון) בכיוון השעון מהצפון; קו מיקום משורטט
   מהעצם בכיוון ההופכי. 1 יחידת מפה = 0.1 מייל ימי.
   ========================================================================== */
(function(){
"use strict";

const ND = window.NAV_DATA;
const D2R = Math.PI/180;
const U = ND ? ND.meta.unitNm : 0.1;          /* מייל ימי ליחידת מפה */

/* ============================ גיאומטריה ================================= */
function norm360(b){ b%=360; return b<0? b+360 : b; }
function distNm(a,b){ return Math.hypot(b.x-a.x, b.y-a.y)*U; }
/* כיוון אמיתי מ-a אל b: 0°=צפון, עם כיוון השעון. ציר y גדל דרומה. */
function brgTo(a,b){ return norm360(Math.atan2(b.x-a.x, a.y-b.y)/D2R); }
function destPt(a,brg,nm){
  const r=brg*D2R, d=nm/U;
  return { x:a.x+Math.sin(r)*d, y:a.y-Math.cos(r)*d };
}
function recip(b){ return norm360(b+180); }
function angSep(a,b){ const d=Math.abs(norm360(a)-norm360(b))%360; return d>180? 360-d : d; }
function fmtB(b){ return String(Math.round(norm360(b))%360).padStart(3,'0')+'°'; }
function fmtNm(v,dec){ return v.toFixed(dec==null?1:dec); }
function ltr(s){ return '<span dir="ltr">'+s+'</span>'; }

/* חיתוך שני קווי מיקום: מכל עצם יוצא קרן בכיוון ההופכי לכיוון שנמדד אליו */
function lopIntersect(p1,b1,p2,b2){
  const u1={x:Math.sin(recip(b1)*D2R), y:-Math.cos(recip(b1)*D2R)};
  const u2={x:Math.sin(recip(b2)*D2R), y:-Math.cos(recip(b2)*D2R)};
  const den=u1.x*u2.y-u1.y*u2.x;
  if(Math.abs(den)<1e-9) return null;
  const wx=p2.x-p1.x, wy=p2.y-p1.y;
  const t1=(wx*u2.y-wy*u2.x)/den;
  return { x:p1.x+u1.x*t1, y:p1.y+u1.y*t1, t1:t1 };
}

/* בדיקת "בים": מערבה מקו החוף במרווח נתון, ובתוך גבולות המפה */
function inSea(p,offNm){
  if(p.x<5||p.y<5||p.y>295) return false;
  return p.x < ND.coastX(p.y) - (offNm||0)/U;
}
function hazClear(p,nm){
  return ND.hazards.every(h=> distNm(p,h)>nm);
}
function randSeaPoint(offNm){
  for(let i=0;i<300;i++){
    const p={ x:8+Math.random()*92, y:12+Math.random()*276 };
    if(inSea(p,offNm) && hazClear(p,1.0)) return p;
  }
  return null;
}
function allFixLandmarks(){
  return ND.lights.filter(l=>l.fix).concat(ND.landmarks.filter(l=>l.fix));
}

/* ============================ בניית המפה ================================ */
const C={
  desk:'#e8e4d4', paper:'#fdfcf5', sea:'#fdfefe',
  z20:'#eef6fa', z10:'#dcedf6', z5:'#c6e1f0', z2:'#aed4e9',
  cont:'#7fa8bf', snd:'#41667c', grat:'#7d9aac',
  land:'#f2e3b3', landLine:'#3f3a28', frame:'#39424a',
  mag:'#c2158b', name:'#5a7d90', lname:'#4a3b20',
  user:'#7a1fa2', truth:'#d81f3d', meas:'#0b5bb5', hl:'#e8a013'
};
const HALO='paint-order:stroke;stroke:#ffffff;stroke-width:.75;stroke-linejoin:round';
const SERIF='Georgia,\'Times New Roman\',serif';

function smoothPath(pts,closed){
  const n=pts.length;
  if(n<3) return 'M'+pts.map(p=>p[0]+','+p[1]).join(' L');
  const get=i=> closed? pts[((i%n)+n)%n] : pts[Math.min(n-1,Math.max(0,i))];
  let d='M'+pts[0][0]+','+pts[0][1];
  const m=closed? n : n-1;
  for(let i=0;i<m;i++){
    const p0=get(i-1),p1=get(i),p2=get(i+1),p3=get(i+2);
    d+='C'+[p1[0]+(p2[0]-p0[0])/6, p1[1]+(p2[1]-p0[1])/6,
            p2[0]-(p3[0]-p1[0])/6, p2[1]-(p3[1]-p1[1])/6,
            p2[0], p2[1]].map(v=>+v.toFixed(2)).join(',');
  }
  return closed? d+'Z' : d;
}
function bandPath(pts){ return smoothPath(pts)+' L156,300 L156,0 Z'; }
function starPath(cx,cy,r){
  let p='';
  for(let i=0;i<10;i++){
    const a=(i*36-90)*D2R, rr=i%2? r*0.42 : r;
    p+=(i?'L':'M')+(cx+Math.cos(a)*rr).toFixed(2)+','+(cy+Math.sin(a)*rr).toFixed(2);
  }
  return p+'Z';
}
function txt(x,y,s,size,o){
  o=o||{};
  return '<text x="'+x+'" y="'+y+'" font-size="'+size+'"'
    +' fill="'+(o.fill||'#222')+'"'
    +(o.anchor?' text-anchor="'+o.anchor+'"':' text-anchor="middle"')
    +(o.it?' font-style="italic"':'')
    +(o.b?' font-weight="700"':'')
    +(o.serif?' font-family="'+SERIF+'"':'')
    +(o.halo===false?'':' style="'+HALO+'"')
    +(o.rot?' transform="rotate('+o.rot+' '+x+' '+y+')"':'')
    +'>'+s+'</text>';
}
function soundSVG(s){
  const x=s[0],y=s[1],d=s[2], i=Math.floor(d), f=Math.round((d-i)*10);
  let t='<text x="'+x+'" y="'+y+'" font-size="2.1" fill="'+C.snd+'" text-anchor="middle"'
      +' font-style="italic" font-family="'+SERIF+'">'+i;
  if(f) t+='<tspan font-size="1.55" dy=".65">'+f+'</tspan>';
  return t+'</text>';
}
function flare(x,y){
  return '<ellipse cx="'+(x+1.6)+'" cy="'+(y-1.6)+'" rx=".62" ry="1.5" fill="'+C.mag
    +'" opacity=".9" transform="rotate(45 '+(x+1.6)+' '+(y-1.6)+')"/>';
}
function posCircle(x,y){
  return '<circle cx="'+x+'" cy="'+y+'" r=".42" fill="none" stroke="#222" stroke-width=".22"/>';
}

function lightSVG(l){
  let s='<path d="'+starPath(l.x,l.y,1.75)+'" fill="#141414"/>'+flare(l.x,l.y);
  const la=l.labelAt||{x:l.x, y:l.y-3.4, anchor:'middle'};
  s+=txt(la.x, la.y, l.name, 1.9, {anchor:la.anchor, b:1});
  s+=txt(la.x, la.y+2.4, l.chr, 1.7, {anchor:la.anchor, it:1, fill:'#333'});
  return s;
}
function landmarkSVG(m){
  const x=m.x, y=m.y;
  let s='<circle cx="'+x+'" cy="'+y+'" r=".85" fill="#fff" stroke="#222" stroke-width=".3"/>'
       +'<circle cx="'+x+'" cy="'+y+'" r=".28" fill="#222"/>';
  if(m.type==='chimney')
    s+='<rect x="'+(x-0.35)+'" y="'+(y-3.4)+'" width=".7" height="2.6" fill="#333"/>';
  if(m.type==='minaret')
    s+='<line x1="'+x+'" y1="'+(y-0.8)+'" x2="'+x+'" y2="'+(y-3.2)+'" stroke="#333" stroke-width=".3"/>'
      +'<circle cx="'+x+'" cy="'+(y-3.6)+'" r=".45" fill="none" stroke="#333" stroke-width=".25"/>';
  if(m.type==='watertower')
    s+='<circle cx="'+x+'" cy="'+(y-0)+'" r="1.25" fill="none" stroke="#222" stroke-width=".22"/>';
  s+=txt(x, y-4.4, m.name, 1.8, {b:1});
  s+=txt(x, y+3.3, m.label, 1.5, {it:1, fill:'#444'});
  return s;
}
function buoySVG(b){
  const x=b.x, y=b.y; let s=posCircle(x,y);
  const base=y-0.5;
  if(b.kind==='lateral-port'){
    s+='<rect x="'+(x-1)+'" y="'+(base-2.1)+'" width="2" height="2.1" fill="#d02f23" stroke="#222" stroke-width=".18"/>';
    s+=flare(x+0.4, base-2.2);
    s+=txt(x-1.8, y-1.2, b.chr, 1.55, {anchor:'end', it:1, fill:'#333'});
    s+=txt(x-1.8, y+0.9, '«2»', 1.5, {anchor:'end', fill:'#444'});
  } else if(b.kind==='lateral-stbd'){
    s+='<polygon points="'+x+','+(base-2.4)+' '+(x-1.15)+','+base+' '+(x+1.15)+','+base
      +'" fill="#159a52" stroke="#222" stroke-width=".18"/>';
    s+=flare(x+0.4, base-2.4);
    s+=txt(x-1.8, y+2.9, b.chr, 1.55, {anchor:'end', it:1, fill:'#333'});
    s+=txt(x+1.6, y+1.2, '«1»', 1.5, {anchor:'start', fill:'#444'});
  } else if(b.kind==='cardinal-w'){
    s+='<rect x="'+(x-0.65)+'" y="'+(base-2.9)+'" width="1.3" height=".97" fill="#f6d33c" stroke="#222" stroke-width=".14"/>'
      +'<rect x="'+(x-0.65)+'" y="'+(base-1.93)+'" width="1.3" height=".97" fill="#141414"/>'
      +'<rect x="'+(x-0.65)+'" y="'+(base-0.97)+'" width="1.3" height=".97" fill="#f6d33c" stroke="#222" stroke-width=".14"/>'
      /* סימן עליון מערבי: שני חרוטים קודקוד אל קודקוד */
      +'<polygon points="'+(x-0.75)+','+(base-4.9)+' '+(x+0.75)+','+(base-4.9)+' '+x+','+(base-4.05)+'" fill="#141414"/>'
      +'<polygon points="'+(x-0.75)+','+(base-3.1)+' '+(x+0.75)+','+(base-3.1)+' '+x+','+(base-3.95)+'" fill="#141414"/>';
    s+=flare(x+0.6, base-5);
    s+=txt(x, y+2.9, b.chr, 1.55, {it:1, fill:'#333'});
  } else if(b.kind==='isolated'){
    s+='<rect x="'+(x-0.65)+'" y="'+(base-2.9)+'" width="1.3" height=".97" fill="#141414"/>'
      +'<rect x="'+(x-0.65)+'" y="'+(base-1.93)+'" width="1.3" height=".97" fill="#d02f23"/>'
      +'<rect x="'+(x-0.65)+'" y="'+(base-0.97)+'" width="1.3" height=".97" fill="#141414"/>'
      +'<circle cx="'+x+'" cy="'+(base-3.5)+'" r=".48" fill="#141414"/>'
      +'<circle cx="'+x+'" cy="'+(base-4.6)+'" r=".48" fill="#141414"/>';
    s+=flare(x+0.7, base-4.6);
    s+=txt(x+2, y-1.2, b.chr, 1.55, {anchor:'start', it:1, fill:'#333'});
  } else if(b.kind==='special'){
    s+='<rect x="'+(x-0.9)+'" y="'+(base-1.9)+'" width="1.8" height="1.9" fill="#f6d33c" stroke="#222" stroke-width=".18"/>'
      +'<g stroke="#c9a400" stroke-width=".38">'
      +'<line x1="'+(x-0.65)+'" y1="'+(base-3.4)+'" x2="'+(x+0.65)+'" y2="'+(base-2.1)+'"/>'
      +'<line x1="'+(x+0.65)+'" y1="'+(base-3.4)+'" x2="'+(x-0.65)+'" y2="'+(base-2.1)+'"/></g>';
    s+=flare(x+0.7, base-3.2);
    s+=txt(x, y+2.9, b.chr, 1.55, {it:1, fill:'#333'});
    s+=txt(x, y+5.3, 'מצוף מחקר', 1.5, {fill:'#555'});
  } else if(b.kind==='safewater'){
    s+='<circle cx="'+x+'" cy="'+(base-1.1)+'" r="1.1" fill="#d02f23" stroke="#222" stroke-width=".18"/>'
      +'<line x1="'+x+'" y1="'+(base-2.14)+'" x2="'+x+'" y2="'+(base-0.06)+'" stroke="#fff" stroke-width=".55"/>'
      +'<circle cx="'+x+'" cy="'+(base-2.75)+'" r=".4" fill="#d02f23"/>';
    s+=flare(x+1, base-3);
    s+=txt(x, y+2.9, b.chr, 1.55, {it:1, fill:'#333'});
    s+=txt(x, y+5.3, 'מצוף הגישה «דקל»', 1.5, {fill:'#555'});
  }
  return s;
}
function hazardSVG(h){
  let s='';
  if(h.kind==='wreck'){
    s+='<circle cx="'+h.x+'" cy="'+h.y+'" r="'+h.r+'" fill="'+C.z5+'" fill-opacity=".7" stroke="'
      +C.snd+'" stroke-width=".22" stroke-dasharray=".65 .5"/>';
    s+='<g stroke="#222" stroke-width=".3" fill="none">'
      +'<line x1="'+(h.x-1.9)+'" y1="'+h.y+'" x2="'+(h.x+1.9)+'" y2="'+h.y+'"/>'
      +'<line x1="'+(h.x-1)+'" y1="'+h.y+'" x2="'+(h.x-1.4)+'" y2="'+(h.y-1.3)+'"/>'
      +'<line x1="'+(h.x+0.2)+'" y1="'+h.y+'" x2="'+(h.x-0.3)+'" y2="'+(h.y-1.7)+'"/>'
      +'<line x1="'+(h.x+1.3)+'" y1="'+h.y+'" x2="'+(h.x+1)+'" y2="'+(h.y-1)+'"/></g>';
    s+=txt(h.x-0.4, h.y+h.r+2, h.label, 1.6, {it:1, fill:'#333'});
  } else if(h.kind==='rock'){
    s+='<circle cx="'+h.x+'" cy="'+h.y+'" r="'+h.r+'" fill="'+C.z2+'" fill-opacity=".55" stroke="'
      +C.snd+'" stroke-width=".22" stroke-dasharray=".65 .5"/>';
    let ast='<g stroke="#222" stroke-width=".26">';
    for(let k=0;k<3;k++){
      const a=k*60*D2R, dx=Math.cos(a)*1.15, dy=Math.sin(a)*1.15;
      ast+='<line x1="'+(h.x-dx)+'" y1="'+(h.y-dy)+'" x2="'+(h.x+dx)+'" y2="'+(h.y+dy)+'"/>';
    }
    s+=ast+'</g>';
    s+=txt(h.x+3, h.y+0.6, h.label, 1.6, {anchor:'start', it:1, fill:'#333'});
  }
  return s;
}
function roseSVG(){
  const r0=ND.rose, cx=r0.x, cy=r0.y, r=r0.r, r1=r-0.8;
  let s='<circle cx="'+cx+'" cy="'+cy+'" r="'+r+'" fill="none" stroke="#5b6a75" stroke-width=".2"/>'
       +'<circle cx="'+cx+'" cy="'+cy+'" r="'+r1+'" fill="none" stroke="#5b6a75" stroke-width=".42"/>';
  for(let d=0; d<360; d+=5){
    const len=(d%90===0)?2.8 : (d%30===0)?2 : 1;
    const a=d*D2R, si=Math.sin(a), co=Math.cos(a);
    s+='<line x1="'+(cx+si*(r1-len)).toFixed(2)+'" y1="'+(cy-co*(r1-len)).toFixed(2)
      +'" x2="'+(cx+si*r1).toFixed(2)+'" y2="'+(cy-co*r1).toFixed(2)
      +'" stroke="#5b6a75" stroke-width="'+(d%30===0?'.3':'.16')+'"/>';
  }
  for(let d=0; d<360; d+=30){
    const a=d*D2R;
    s+=txt((cx+Math.sin(a)*(r1-4.4)).toFixed(2), (cy-Math.cos(a)*(r1-4.4)+0.6).toFixed(2),
      String(d).padStart(3,'0'), 1.55, {fill:'#5b6a75', halo:false});
  }
  /* צפון אמיתי */
  s+='<line x1="'+cx+'" y1="'+(cy-r1)+'" x2="'+cx+'" y2="'+(cy-r-2.4)+'" stroke="#5b6a75" stroke-width=".3"/>'
    +'<path d="'+starPath(cx, cy-r-3.6, 1.1)+'" fill="#5b6a75"/>';
  /* חץ מגנטי — מוטה בזווית הווריאציה */
  const v=ND.meta.variation*(ND.meta.variationDir==='E'?1:-1);
  s+='<g transform="rotate('+v+' '+cx+' '+cy+')">'
    +'<line x1="'+cx+'" y1="'+(cy+8)+'" x2="'+cx+'" y2="'+(cy-12.5)+'" stroke="'+C.mag+'" stroke-width=".3"/>'
    +'<polygon points="'+cx+','+(cy-13.8)+' '+(cx-0.8)+','+(cy-11.6)+' '+(cx+0.8)+','+(cy-11.6)+'" fill="'+C.mag+'"/></g>';
  s+=txt(cx, cy+4.4, 'Var '+ND.meta.variation+'°'+ND.meta.variationDir+' ('+ND.meta.varYear+')', 1.6, {fill:C.mag});
  s+=txt(cx, cy+7, 'וריאציה 5° מזרחית', 1.35, {fill:C.mag});
  return s;
}
function scalebarSVG(){
  const sb=ND.scalebar, x0=sb.x, y=sb.y;
  let s=txt(x0+sb.nm*5, y-2.2, 'קנה־מידה — מיילים ימיים', 1.7, {fill:'#39424a'});
  for(let i=0;i<sb.nm;i++)
    s+='<rect x="'+(x0+i*10)+'" y="'+y+'" width="10" height="1.6" fill="'
      +(i%2?'#ffffff':'#39424a')+'" stroke="#39424a" stroke-width=".18"/>';
  for(let i=0;i<=sb.nm;i++)
    s+=txt(x0+i*10, y+4, String(i), 1.6, {fill:'#39424a'});
  s+=txt(x0+sb.nm*5, y+6.6, "(דקת רוחב אחת = מייל ימי אחד)", 1.4, {fill:'#5b6a75'});
  return s;
}
function titleSVG(){
  const t=ND.titleBox, cx=t.x+t.w/2;
  return '<rect x="'+t.x+'" y="'+t.y+'" width="'+t.w+'" height="'+t.h
    +'" fill="#fdfcf7" stroke="#39424a" stroke-width=".3"/>'
    +txt(cx, t.y+6, 'מפרץ הדקל', 3.3, {b:1, serif:1, halo:false})
    +txt(cx, t.y+9.8, 'מפת אימונים 101 · TRG-101', 1.9, {halo:false, fill:'#333'})
    +txt(cx, t.y+13.4, 'עומקים במטרים · קנה־מידה ~1:60,000', 1.65, {halo:false, fill:'#333'})
    +txt(cx, t.y+16.8, 'וריאציה 5°E (2026)', 1.65, {halo:false, fill:'#333'})
    +txt(cx, t.y+20.4, 'לאימון בלבד — לא לניווט', 1.5, {halo:false, fill:'#a33', it:1});
}
function graticuleSVG(){
  let s='<g stroke="'+C.grat+'" stroke-width=".16" opacity=".75">';
  for(let y=50;y<300;y+=50) s+='<line x1="0" y1="'+y+'" x2="150" y2="'+y+'"/>';
  const um=ND.chart.lon.unitsPerMin;
  for(let m=25;m<38;m+=5){
    const x=(m-ND.chart.lon.minLeft)*um; if(x<=0||x>=150) continue;
    s+='<line x1="'+x.toFixed(2)+'" y1="0" x2="'+x.toFixed(2)+'" y2="300"/>';
  }
  s+='</g>';
  /* תוויות בתוך המפה */
  for(let min=0;min<=30;min+=5){
    const y=(30-min)*10, ly=Math.min(Math.max(y-0.8,2.6),297.8);
    const lbl="32°"+String(min).padStart(2,'0')+"'N";
    s+=txt(2, ly, lbl, 1.8, {anchor:'start', fill:'#4a5b66'});
    s+=txt(148, ly, lbl, 1.8, {anchor:'end', fill:'#4a5b66'});
  }
  const um2=ND.chart.lon.unitsPerMin;
  for(let m=25;m<38;m+=5){
    const x=(m-ND.chart.lon.minLeft)*um2; if(x<=6||x>=144) continue;
    const lbl="34°"+String(m).padStart(2,'0')+"'E";
    s+=txt(x, 3.4, lbl, 1.8, {fill:'#4a5b66'});
    s+=txt(x, 298.6, lbl, 1.8, {fill:'#4a5b66'});
  }
  return s;
}
function borderSVG(){
  let s='<rect x="-3" y="-3" width="156" height="306" fill="none" stroke="'+C.frame+'" stroke-width=".5"/>'
       +'<rect x="0" y="0" width="150" height="300" fill="none" stroke="'+C.frame+'" stroke-width=".55"/>';
  for(let m=0;m<30;m++){
    const y=m*10, f=m%2? C.frame : '#ffffff';
    s+='<rect x="-1.5" y="'+y+'" width="1.5" height="10" fill="'+f+'" stroke="'+C.frame+'" stroke-width=".12"/>'
      +'<rect x="150" y="'+y+'" width="1.5" height="10" fill="'+f+'" stroke="'+C.frame+'" stroke-width=".12"/>';
  }
  const um=ND.chart.lon.unitsPerMin;
  for(let k=0;k*um<150;k++){
    const x=k*um, w=Math.min(um,150-x), f=k%2? C.frame : '#ffffff';
    s+='<rect x="'+x.toFixed(2)+'" y="-1.5" width="'+w.toFixed(2)+'" height="1.5" fill="'+f+'" stroke="'+C.frame+'" stroke-width=".12"/>'
      +'<rect x="'+x.toFixed(2)+'" y="300" width="'+w.toFixed(2)+'" height="1.5" fill="'+f+'" stroke="'+C.frame+'" stroke-width=".12"/>';
  }
  return s;
}

let CHART_CACHE=null;
function chartSVG(){
  if(CHART_CACHE) return CHART_CACHE;
  const zoneFill=[C.z20, C.z10, C.z5, C.z2];  /* לפי סדר contours: 20,10,5,2 */
  let g='';
  /* ים + רצועות עומק (מהעמוק לרדוד) */
  g+='<rect x="-2" y="-2" width="154" height="304" fill="'+C.sea+'"/>';
  ND.contours.forEach((c,i)=>{ g+='<path d="'+bandPath(c.pts)+'" fill="'+zoneFill[i]+'"/>'; });
  /* מים חפורים בנמל */
  g+='<path d="'+smoothPath(ND.harborWater)+' L140,140 L140,105 Z" fill="'+C.z5+'"/>';
  /* שרטון התמר — טבעות סגורות */
  const sh=ND.hazards.find(h=>h.kind==='shoal');
  g+='<path d="'+smoothPath(sh.ring5,true)+'" fill="'+C.z5+'" stroke="'+C.cont+'" stroke-width=".28"/>';
  g+='<path d="'+smoothPath(sh.ring2,true)+'" fill="'+C.z2+'" stroke="'+C.cont+'" stroke-width=".3"/>';
  /* קווי עומק + תוויות */
  ND.contours.forEach(c=>{
    g+='<path d="'+smoothPath(c.pts)+'" fill="none" stroke="'+C.cont+'" stroke-width="'
      +(c.d===2?'.34':'.28')+'"/>';
    c.labels.forEach(p=>{ g+=txt(p[0],p[1]+0.7,String(c.d),1.9,{fill:'#55788c'}); });
  });
  /* יבשה */
  g+='<path d="'+bandPath(ND.coast)+'" fill="url(#landHatch)" stroke="'+C.landLine+'" stroke-width=".45"/>';
  /* רשת קואורדינטות */
  g+=graticuleSVG();
  /* שוברי גלים, מרינה, בניינים */
  ND.breakwaters.concat(ND.marina).forEach(b=>{
    g+='<polyline points="'+b.pts.map(p=>p[0]+','+p[1]).join(' ')
      +'" fill="none" stroke="#4a4a44" stroke-width="'+b.w+'" stroke-linejoin="round" stroke-linecap="butt"/>';
  });
  ND.buildings.forEach(p=>{ g+='<rect x="'+(p[0]-0.65)+'" y="'+(p[1]-0.65)+'" width="1.3" height="1.3" fill="#6b5b3a"/>'; });
  /* שמות */
  ND.names.forEach(n=>{
    g+=txt(n.x, n.y, n.t, n.s, {it:!!n.it, serif:1, fill:n.dim?C.name:C.lname, b:!n.it});
  });
  /* עומקי נקודה */
  ND.soundings.forEach(s=>{ g+=soundSVG(s); });
  /* מכשולים, מצופים, ציוני דרך, מגדלורים */
  ND.hazards.forEach(h=>{ g+=hazardSVG(h); });
  ND.buoys.forEach(b=>{ g+=buoySVG(b); });
  ND.landmarks.forEach(m=>{ g+=landmarkSVG(m); });
  ND.lights.forEach(l=>{ g+=lightSVG(l); });
  g+=roseSVG()+scalebarSVG()+titleSVG();

  CHART_CACHE =
   '<svg id="chartSvg" viewBox="-10 16 170 212.5" preserveAspectRatio="xMidYMid meet" '
   +'font-family="system-ui,Arial,sans-serif" role="img" aria-label="'+App.esc(ND.meta.name)+'">'
   +'<defs>'
   +'<pattern id="landHatch" width="3" height="3" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">'
   +'<rect width="3" height="3" fill="'+C.land+'"/>'
   +'<line x1="0" y1="0" x2="0" y2="3" stroke="#e3cd8d" stroke-width=".55"/></pattern>'
   +'<clipPath id="chartClip"><rect x="0" y="0" width="150" height="300"/></clipPath>'
   +'</defs>'
   +'<rect x="-60" y="-60" width="290" height="440" fill="'+C.desk+'"/>'
   +'<rect x="-6" y="-6" width="162" height="312" fill="'+C.paper+'"/>'
   +'<g clip-path="url(#chartClip)">'+g+'</g>'
   +borderSVG()
   +'<g id="ovl" clip-path="url(#chartClip)"></g>'
   +'</svg>';
  return CHART_CACHE;
}

/* ===================== סימוני שכבת התרגול (overlay) ===================== */
function xMark(p,col){
  return '<g stroke="'+col+'" stroke-width=".45" stroke-linecap="round">'
    +'<line x1="'+(p.x-1.4)+'" y1="'+(p.y-1.4)+'" x2="'+(p.x+1.4)+'" y2="'+(p.y+1.4)+'"/>'
    +'<line x1="'+(p.x+1.4)+'" y1="'+(p.y-1.4)+'" x2="'+(p.x-1.4)+'" y2="'+(p.y+1.4)+'"/></g>'
    +'<circle cx="'+p.x+'" cy="'+p.y+'" r="1.9" fill="none" stroke="'+col+'" stroke-width=".24"/>';
}
function dotMark(p,col,label){
  let s='<circle cx="'+p.x+'" cy="'+p.y+'" r="1.35" fill="none" stroke="'+col+'" stroke-width=".4"/>'
       +'<circle cx="'+p.x+'" cy="'+p.y+'" r=".4" fill="'+col+'"/>';
  if(label) s+=txt(p.x, p.y+3.4, label, 1.8, {fill:col, b:1});
  return s;
}
function hlRing(p){
  return '<circle cx="'+p.x+'" cy="'+p.y+'" r="4" fill="none" stroke="'+C.hl
    +'" stroke-width=".55" stroke-dasharray="1.6 1.1">'
    +'<animateTransform attributeName="transform" type="rotate" from="0 '+p.x+' '+p.y
    +'" to="360 '+p.x+' '+p.y+'" dur="9s" repeatCount="indefinite"/></circle>';
}
function lineSVG(a,b,col,w,dash){
  return '<line x1="'+a.x.toFixed(2)+'" y1="'+a.y.toFixed(2)+'" x2="'+b.x.toFixed(2)
    +'" y2="'+b.y.toFixed(2)+'" stroke="'+col+'" stroke-width="'+(w||0.35)+'"'
    +(dash?' stroke-dasharray="'+dash+'"':'')+'/>';
}
function errLink(a,b,err){
  const mx=(a.x+b.x)/2, my=(a.y+b.y)/2;
  return lineSVG(a,b,'#c0392b',0.28,'.9 .7')
    +txt(mx, my-1.5, err.toFixed(2)+' nm', 1.8, {fill:'#c0392b', b:1});
}

/* ========================= מצב תצוגת המפה =============================== */
const AR=1.25, WMIN=18, WMAX=260;
const CS={
  view:{x:-10, y:16, w:170},
  tool:'pan',
  measure:[], fix:null,
  ex:null, checked:false, solSvg:'',
  exType:'rand',
  session:{ok:0, tot:0}
};

/* ============================ תרגילים =================================== */
const EXDEF={
  rand:  {name:'אקראי'},
  fix2:  {name:'פיקס משני כיוונים'},
  rngbrg:{name:'כיוון ומרחק'},
  dr:    {name:'ניווט שולחני (DR)'},
  calc:  {name:'שאלת חישוב'}
};

function genFix2(){
  const lms=allFixLandmarks();
  for(let t=0;t<300;t++){
    const boat=randSeaPoint(1.6); if(!boat) continue;
    const cand=App.shuffle(lms);
    for(let i=0;i<cand.length;i++) for(let j=i+1;j<cand.length;j++){
      const a=cand[i], b=cand[j];
      const d1=distNm(boat,a), d2=distNm(boat,b);
      if(d1<1.5||d1>12||d2<1.5||d2>12) continue;
      const b1=Math.round(brgTo(boat,a))%360, b2=Math.round(brgTo(boat,b))%360;
      const sep=angSep(b1,b2);
      if(sep<30||sep>150) continue;
      const truth=lopIntersect(a,b1,b,b2);
      if(!truth||truth.t1<=1||distNm(truth,boat)>0.5) continue;
      return {
        kind:'fix2', lms:[a,b], brgs:[b1,b2], truth:truth,
        text:'<b>פיקס משני כיוונים.</b> אתם אי־שם מול החוף ומדדתם שני כיוונים אמיתיים:'
          +'<br>• '+a.name+' — '+ltr(fmtB(b1))
          +'<br>• '+b.name+' — '+ltr(fmtB(b2))
          +'<br>בחרו בכלי «✖ הצבת פיקס», הקישו על מיקומכם המשוער ולחצו «בדוק».'
      };
    }
  }
  return null;
}
function genRngBrg(){
  const lms=allFixLandmarks();
  for(let t=0;t<300;t++){
    const boat=randSeaPoint(1.4); if(!boat) continue;
    const lm=App.pick(lms);
    const d=distNm(boat,lm);
    if(d<2||d>10) continue;
    const B=Math.round(brgTo(boat,lm))%360, Dv=Math.round(d*10)/10;
    const truth=destPt(lm, recip(B), Dv);
    if(!inSea(truth,0.4)) continue;
    return {
      kind:'rngbrg', lms:[lm], brg:B, dist:Dv, truth:truth,
      text:'<b>כיוון ומרחק.</b> מהסירה נמדד אל '+lm.name+':'
        +'<br>• כיוון אמיתי '+ltr(fmtB(B))+' · מרחק '+ltr(fmtNm(Dv)+' nm')
        +'<br>הציבו פיקס במיקום הסירה ולחצו «בדוק».'
    };
  }
  return null;
}
function genDR(){
  const starts=ND.buoys.filter(b=>b.dr);
  for(let t=0;t<400;t++){
    const st=App.pick(starts);
    const spd=App.pick([4,5,6,7,8]);
    const min=App.pick([30,40,45,60,90]);
    const d=spd*min/60;
    if(d<2||d>8) continue;
    const course=App.ri(72)*5;
    const truth=destPt(st, course, d);
    if(!inSea(truth,0.8)) continue;
    /* ודא שהקו לא חוצה יבשה או שרטון */
    let ok=true;
    for(let k=1;k<=8;k++){
      const p=destPt(st, course, d*k/8);
      if(!inSea(p,0.25)||!hazClear(p,0.4)){ ok=false; break; }
    }
    if(!ok) continue;
    const hh=String(6+App.ri(10)).padStart(2,'0');
    return {
      kind:'dr', start:{x:st.x,y:st.y}, startName:st.name,
      course:course, spd:spd, min:min, dist:d, truth:truth,
      text:'<b>ניווט שולחני (DR).</b> בשעה '+ltr(hh+':00')+' חלפתם צמוד ל'+st.name
        +' (מסומן בטבעת על המפה). מאז אתם שטים בקורס אמת '+ltr(fmtB(course))
        +' במהירות '+ltr(spd+' kn')+'. הציבו פיקס בנקודה שבה תהיו כעבור '
        +ltr(min+' דק\'')+' ולחצו «בדוק».'
    };
  }
  return null;
}
function dedupeOpts(correct, alts, fmt){
  const out=[fmt(correct)], vals=[correct];
  for(const a of alts){
    const f=fmt(a);
    if(out.indexOf(f)<0){ out.push(f); vals.push(a); }
    if(out.length===4) break;
  }
  let bump=1;
  while(out.length<4){
    const a=correct+bump; const f=fmt(a);
    if(out.indexOf(f)<0){ out.push(f); vals.push(a); }
    bump=bump>0? -bump : -bump+1;
  }
  return out;
}
function genCalc(){
  if(Math.random()<0.5){
    /* מרחק·מהירות·זמן */
    const s=App.pick([4,5,6,7,8,9]), m=App.pick([20,30,40,45,50,60,90]);
    const d=s*m/60;
    const target=App.pick(['d','t','s']);
    let q, opts, explain;
    const exBase='<b>הנוסחה:</b> מרחק (מייל) = מהירות (קשר) × זמן (דקות) ÷ 60.';
    if(target==='d'){
      opts=dedupeOpts(d,[d*2, d/2, d+(d>3?1.5:0.8)], v=>ltr(fmtNm(v)+' nm'));
      q='אתם שטים במהירות '+ltr(s+' kn')+'. איזה מרחק תעברו ב־'+ltr(m+' דק\'')+'?';
      explain=exBase+'<br>'+ltr(s+' × '+m+' ÷ 60 = '+fmtNm(d)+' nm');
    } else if(target==='t'){
      opts=dedupeOpts(m,[m*2, Math.max(5,Math.round(m/2)), m+15], v=>ltr(Math.round(v)+' דק\''));
      q='כמה זמן יידרש לעבור '+ltr(fmtNm(d)+' nm')+' במהירות '+ltr(s+' kn')+'?';
      explain=exBase+'<br>זמן = 60 × מרחק ÷ מהירות = '+ltr('60 × '+fmtNm(d)+' ÷ '+s+' = '+m+' דק\'');
    } else {
      opts=dedupeOpts(s,[s+2, Math.max(1,s-2), s*2], v=>ltr(fmtNm(v)+' kn'));
      q='עברתם '+ltr(fmtNm(d)+' nm')+' בתוך '+ltr(m+' דק\'')+'. מה מהירותכם?';
      explain=exBase+'<br>מהירות = 60 × מרחק ÷ זמן = '+ltr('60 × '+fmtNm(d)+' ÷ '+m+' = '+s+' kn');
    }
    const correctStr=opts[0], shuffled=App.shuffle(opts);
    return { kind:'calc', text:'<b>שאלת חישוב.</b> '+q, opts:shuffled,
      correct:shuffled.indexOf(correctStr), explain:explain };
  }
  /* המרת כיוונים TVMDC */
  const T=20+App.ri(63)*5;
  const V=App.pick([{v:3,d:'E'},{v:5,d:'E'},{v:6,d:'E'},{v:4,d:'W'},{v:7,d:'W'}]);
  const Dv=App.pick([{v:1,d:'E'},{v:2,d:'W'},{v:2,d:'E'},{v:3,d:'W'}]);
  const sv=V.d==='E'? V.v : -V.v, sd=Dv.d==='E'? Dv.v : -Dv.v;
  const mode=App.pick(['t2c','c2t']);
  let q, ans, alts, explain;
  if(mode==='t2c'){
    const M=norm360(T-sv), Cc=norm360(M-sd);
    ans=Cc; alts=[norm360(T+sv+sd), norm360(T-sv+sd), norm360(T+sv-sd)];
    q='קורס אמת מהמפה: '+ltr(fmtB(T))+'. וריאציה '+ltr(V.v+'°'+V.d)+', דוויאציה '
      +ltr(Dv.v+'°'+Dv.d)+'. מהו הקורס המצפני שיש להחזיק?';
    explain='<b>מאמת למצפן:</b> מחסרים מזרחית (E), מוסיפים מערבית (W).'
      +'<br>'+ltr('M = T − Var = '+fmtB(T)+' − ('+(sv>=0?'+':'')+sv+'°) = '+fmtB(M))
      +'<br>'+ltr('C = M − Dev = '+fmtB(M)+' − ('+(sd>=0?'+':'')+sd+'°) = '+fmtB(Cc));
  } else {
    const Cc=20+App.ri(63)*5;
    const M=norm360(Cc+sd), Tt=norm360(M+sv);
    ans=Tt; alts=[norm360(Cc-sd-sv), norm360(Cc+sd-sv), norm360(Cc-sd+sv)];
    q='המצפן מראה '+ltr(fmtB(Cc))+'. וריאציה '+ltr(V.v+'°'+V.d)+', דוויאציה '
      +ltr(Dv.v+'°'+Dv.d)+'. מהו הקורס האמיתי?';
    explain='<b>ממצפן לאמת:</b> מוסיפים מזרחית (E), מחסרים מערבית (W).'
      +'<br>'+ltr('M = C + Dev = '+fmtB(Cc)+' + ('+(sd>=0?'+':'')+sd+'°) = '+fmtB(M))
      +'<br>'+ltr('T = M + Var = '+fmtB(M)+' + ('+(sv>=0?'+':'')+sv+'°) = '+fmtB(Tt));
  }
  const opts=dedupeOpts(ans, alts, v=>ltr(fmtB(v)));
  const correctStr=opts[0], shuffled=App.shuffle(opts);
  return { kind:'calc', text:'<b>שאלת חישוב.</b> '+q, opts:shuffled,
    correct:shuffled.indexOf(correctStr), explain:explain };
}
function genExercise(type){
  if(type==='rand') type=App.pick(['fix2','rngbrg','dr','calc']);
  if(type==='fix2')   return genFix2();
  if(type==='rngbrg') return genRngBrg();
  if(type==='dr')     return genDR();
  return genCalc();
}

/* פתרון גרפי לתרגיל שנבדק */
function solutionSvg(ex, fix, err){
  let s='';
  if(ex.kind==='fix2'){
    ex.lms.forEach((lm,i)=>{
      const b=ex.brgs[i];
      const len=Math.hypot(ex.truth.x-lm.x, ex.truth.y-lm.y)+8;
      const end=destPt(lm, recip(b), len*U);
      s+=lineSVG(lm, end, C.mag, 0.32, '2.2 1.3');
      const lp=destPt(lm, recip(b), len*U*0.45);
      s+=txt(lp.x, lp.y-1, fmtB(b), 1.8, {fill:C.mag, b:1});
    });
  } else if(ex.kind==='rngbrg'){
    const lm=ex.lms[0];
    s+=lineSVG(lm, ex.truth, C.mag, 0.32, '2.2 1.3');
    const lp=destPt(lm, recip(ex.brg), ex.dist*0.5);
    s+=txt(lp.x, lp.y-1, fmtB(ex.brg)+' / '+fmtNm(ex.dist)+'nm', 1.8, {fill:C.mag, b:1});
  } else if(ex.kind==='dr'){
    s+=lineSVG(ex.start, ex.truth, C.mag, 0.38);
    const mid=destPt(ex.start, ex.course, ex.dist*0.55);
    const a1=destPt(mid, recip(ex.course)+25, 0.18);
    const a2=destPt(mid, recip(ex.course)-25, 0.18);
    s+='<polygon points="'+mid.x.toFixed(2)+','+mid.y.toFixed(2)+' '+a1.x.toFixed(2)+','
      +a1.y.toFixed(2)+' '+a2.x.toFixed(2)+','+a2.y.toFixed(2)+'" fill="'+C.mag+'"/>';
    const lp=destPt(ex.start, ex.course, ex.dist*0.5);
    s+=txt(lp.x, lp.y-1.6, 'C '+fmtB(ex.course)+' · '+fmtNm(ex.dist)+'nm', 1.8, {fill:C.mag, b:1});
  }
  s+=dotMark(ex.truth, C.truth, 'המיקום האמיתי');
  if(fix) s+=errLink(fix, ex.truth, err);
  return s;
}
function solutionText(ex, err){
  const ll=ND.latLonOf(ex.truth.x, ex.truth.y);
  let s='';
  if(ex.kind==='fix2'){
    s='מכל עצם משרטטים קו מיקום (LOP) בכיוון <b>ההופכי</b> לכיוון שנמדד:';
    ex.lms.forEach((lm,i)=>{
      const b=ex.brgs[i];
      s+='<br>• '+lm.name+': '+ltr(fmtB(b)+' + 180° = '+fmtB(recip(b)));
    });
    s+='<br>נקודת החיתוך של שני הקווים היא הפיקס: '+ltr(ll.lat+' '+ll.lon)+'.';
  } else if(ex.kind==='rngbrg'){
    s='מ'+ex.lms[0].name+' משרטטים את הכיוון ההופכי '
      +ltr(fmtB(ex.brg)+' + 180° = '+fmtB(recip(ex.brg)))
      +' ומודדים לאורכו '+ltr(fmtNm(ex.dist)+' nm')
      +' (במחוגה, מסולם הרוחב) — שם הסירה: '+ltr(ll.lat+' '+ll.lon)+'.';
  } else if(ex.kind==='dr'){
    s='מרחק = מהירות × זמן ÷ 60 = '
      +ltr(ex.spd+' × '+ex.min+' ÷ 60 = '+fmtNm(ex.dist)+' nm')
      +'.<br>מ'+ex.startName+' משרטטים קורס אמת '+ltr(fmtB(ex.course))
      +' ומודדים '+ltr(fmtNm(ex.dist)+' nm')+' — זו נקודת ה-DR: '+ltr(ll.lat+' '+ll.lon)+'.';
  }
  s+='<br>הסטייה שלכם: <b>'+ltr(err.toFixed(2)+' nm')+'</b> '
    +'(מצוין < 0.3 · טוב < 0.8).';
  return s;
}

/* ========================= תצוגת 'chart' ================================ */
function renderChart(el){
  if(!ND){
    el.innerHTML='<div class="card" style="padding:20px;text-align:center">שגיאה: נתוני המפה (navdata.js) לא נטענו.</div>';
    return;
  }
  el.innerHTML=
    '<div class="section-title"><h2>'+App.esc(ND.meta.name)+'</h2>'
    +'<span class="hint">'+App.esc(ND.meta.note)+'</span></div>'
    +'<div class="toolrow" id="navTools">'
    +'<button class="btn mini" data-tool="pan">יד</button>'
    +'<button class="btn mini" data-tool="measure">מדידה</button>'
    +'<button class="btn mini" data-tool="fix">✖ הצבת פיקס</button>'
    +'<span class="grow"></span>'
    +'<button class="btn mini" id="zin" aria-label="הגדלה">＋</button>'
    +'<button class="btn mini" id="zout" aria-label="הקטנה">－</button>'
    +'<button class="btn mini" id="zreset" aria-label="איפוס תצוגה">⌂</button>'
    +'</div>'
    +'<div style="max-width:640px;margin:0 auto">'
    +'<div class="chartwrap" dir="ltr" id="cw">'+chartSVG()
    +'<div class="chart-hud"><div class="hudline" id="hudTool"></div>'
    +'<div class="hudline" id="hudInfo" style="display:none"></div></div>'
    +'</div>'
    +'<div class="clickhint">צביטה או גלגלת לזום · «יד» לגרירה · במדידה/פיקס — הקשה על המפה</div>'
    +'</div>'
    +'<div class="card quiz" style="margin-top:10px">'
    +'<div class="scorebar"><span>תרגילי ניווט</span><span id="exScore"></span></div>'
    +'<div class="chipbar" style="padding:0 0 10px" id="exTypes">'
    +Object.keys(EXDEF).map(k=>'<button class="chip" data-x="'+k+'" aria-pressed="'
      +(CS.exType===k)+'">'+EXDEF[k].name+'</button>').join('')
    +'</div>'
    +'<div class="qtext" id="exText"></div>'
    +'<div id="exOpts"></div>'
    +'<div class="row" style="margin-top:10px">'
    +'<button class="btn primary" id="exNew">תרגיל חדש</button>'
    +'<button class="btn" id="exCheck" disabled>בדוק</button>'
    +'</div>'
    +'<div id="exResult"></div>'
    +'</div>';

  const svgEl=App.$('#chartSvg',el), cw=App.$('#cw',el);
  const ovl=App.$('#ovl',el);
  const hudTool=App.$('#hudTool',el), hudInfo=App.$('#hudInfo',el);
  const btnCheck=App.$('#exCheck',el);

  /* ---- תצוגה (viewBox) ---- */
  function clampView(){
    const v=CS.view, h=v.w*AR, M=40;
    v.w=App.clamp(v.w, WMIN, WMAX);
    const hix=ND.chart.w+M-v.w;
    v.x = hix < -M ? (ND.chart.w-v.w)/2 : App.clamp(v.x, -M, hix);
    const hiy=ND.chart.h+M-h;
    v.y = hiy < -M ? (ND.chart.h-h)/2 : App.clamp(v.y, -M, hiy);
  }
  function applyView(){
    const v=CS.view;
    svgEl.setAttribute('viewBox',
      [v.x,v.y,v.w,v.w*AR].map(n=>Math.round(n*1000)/1000).join(' '));
  }
  function zoomAt(f, ctr){
    const v=CS.view, nw=App.clamp(v.w*f, WMIN, WMAX), k=nw/v.w;
    v.x=ctr.x-(ctr.x-v.x)*k; v.y=ctr.y-(ctr.y-v.y)*k; v.w=nw;
    clampView(); applyView();
  }
  function pxToChart(px,py,r){
    r=r||svgEl.getBoundingClientRect();
    return { x: CS.view.x+(px-r.left)/r.width*CS.view.w,
             y: CS.view.y+(py-r.top)/r.height*(CS.view.w*AR) };
  }

  /* ---- HUD ---- */
  const TOOLTXT={
    pan:'גררו להזזה · הקשה מציגה נ.צ.',
    measure:'הקישו שתי נקודות למדידת כיוון ומרחק',
    fix:'✖ הקישו על המפה להצבת הפיקס'
  };
  function updateHud(){ hudTool.textContent=TOOLTXT[CS.tool]; }
  function showInfo(t){ hudInfo.style.display='block'; hudInfo.textContent=t; }
  function updateTools(){
    App.$$('#navTools [data-tool]',el).forEach(b=>{
      b.classList.toggle('primary', b.dataset.tool===CS.tool);
    });
    // בכלי "יד" הגרירה שייכת למפה; בשאר הכלים מפנים את הגרירה האנכית לדפדפן
    // כדי שאפשר יהיה לגלול את הדף גם כשנוגעים במפה (צביטה עדיין מוגבלת לכלי יד)
    if(typeof cw!=='undefined' && cw) cw.style.touchAction = CS.tool==='pan' ? 'none' : 'pan-y';
    updateHud();
  }

  /* ---- שכבת סימונים ---- */
  function redrawOvl(){
    let s='';
    if(CS.ex){
      if(CS.ex.kind==='fix2'||CS.ex.kind==='rngbrg') CS.ex.lms.forEach(lm=>{ s+=hlRing(lm); });
      if(CS.ex.kind==='dr'){
        s+=hlRing(CS.ex.start);
        s+=dotMark(CS.ex.start, C.mag, 'התחלה');
      }
      if(CS.checked) s+=CS.solSvg;
    }
    if(CS.measure.length){
      CS.measure.forEach(p=>{
        s+='<circle cx="'+p.x+'" cy="'+p.y+'" r=".9" fill="none" stroke="'+C.meas+'" stroke-width=".35"/>'
          +'<circle cx="'+p.x+'" cy="'+p.y+'" r=".22" fill="'+C.meas+'"/>';
      });
      if(CS.measure.length===2){
        const a=CS.measure[0], b=CS.measure[1];
        s+=lineSVG(a,b,C.meas,0.32);
        const B=brgTo(a,b), d=distNm(a,b);
        s+=txt((a.x+b.x)/2, (a.y+b.y)/2-1.4, fmtB(B)+' · '+d.toFixed(2)+'nm', 1.9,
          {fill:C.meas, b:1});
      }
    }
    if(CS.fix) s+=xMark(CS.fix, C.user);
    ovl.innerHTML=s;
  }

  /* ---- הקשות וכלים ---- */
  function tapAction(pt){
    if(pt.x<0||pt.x>150||pt.y<0||pt.y>300) return;
    if(CS.tool==='pan'){
      const ll=ND.latLonOf(pt.x,pt.y);
      showInfo(ll.lat+'  '+ll.lon);
      return;
    }
    if(CS.tool==='measure'){
      if(CS.measure.length>=2) CS.measure=[];
      CS.measure.push(pt);
      if(CS.measure.length===2){
        const B=brgTo(CS.measure[0],CS.measure[1]), d=distNm(CS.measure[0],CS.measure[1]);
        showInfo(fmtB(B)+' (הופכי '+fmtB(recip(B))+') · '+d.toFixed(2)+' nm');
        App.sfx('click');
      } else showInfo('נקודה 1 סומנה — הקישו נקודה שנייה');
      redrawOvl(); return;
    }
    /* fix */
    CS.fix=pt; App.sfx('click'); App.haptic();
    const ll=ND.latLonOf(pt.x,pt.y);
    showInfo('פיקס: '+ll.lat+' '+ll.lon);
    if(CS.ex && CS.ex.kind!=='calc' && !CS.checked) btnCheck.disabled=false;
    redrawOvl();
  }

  /* ---- מחוות מגע: גרירה, צביטה, הקשה ---- */
  const ptrs=new Map();
  let pinch=null, moved=false, pinched=false, gRect=null;
  svgEl.addEventListener('pointerdown', e=>{
    svgEl.setPointerCapture(e.pointerId);
    gRect=svgEl.getBoundingClientRect();
    ptrs.set(e.pointerId,{x:e.clientX,y:e.clientY,sx:e.clientX,sy:e.clientY,lx:e.clientX,ly:e.clientY});
    if(ptrs.size===1){ moved=false; pinched=false; }
    if(ptrs.size===2){
      pinched=true;
      const ps=Array.from(ptrs.values());
      pinch={ d0:Math.hypot(ps[0].x-ps[1].x, ps[0].y-ps[1].y)||1,
              mid0:{x:(ps[0].x+ps[1].x)/2, y:(ps[0].y+ps[1].y)/2},
              v0:{x:CS.view.x, y:CS.view.y, w:CS.view.w} };
    }
    e.preventDefault();
  });
  svgEl.addEventListener('pointermove', e=>{
    const p=ptrs.get(e.pointerId); if(!p) return;
    p.x=e.clientX; p.y=e.clientY;
    if(Math.hypot(p.x-p.sx, p.y-p.sy)>7) moved=true;
    if(ptrs.size===2 && pinch){
      const ps=Array.from(ptrs.values());
      const d=Math.hypot(ps[0].x-ps[1].x, ps[0].y-ps[1].y)||1;
      const mid={x:(ps[0].x+ps[1].x)/2, y:(ps[0].y+ps[1].y)/2};
      const nw=App.clamp(pinch.v0.w*pinch.d0/d, WMIN, WMAX);
      const cx0=pinch.v0.x+(pinch.mid0.x-gRect.left)/gRect.width*pinch.v0.w;
      const cy0=pinch.v0.y+(pinch.mid0.y-gRect.top)/gRect.height*(pinch.v0.w*AR);
      CS.view.w=nw;
      CS.view.x=cx0-(mid.x-gRect.left)/gRect.width*nw;
      CS.view.y=cy0-(mid.y-gRect.top)/gRect.height*(nw*AR);
      clampView(); applyView();
    } else if(ptrs.size===1 && CS.tool==='pan'){
      CS.view.x-=(p.x-p.lx)/gRect.width*CS.view.w;
      CS.view.y-=(p.y-p.ly)/gRect.height*(CS.view.w*AR);
      clampView(); applyView();
    }
    p.lx=p.x; p.ly=p.y;
  });
  function endPtr(e){
    const p=ptrs.get(e.pointerId);
    ptrs.delete(e.pointerId);
    if(ptrs.size<2) pinch=null;
    ptrs.forEach(q=>{ q.lx=q.x; q.ly=q.y; q.sx=q.x; q.sy=q.y; });
    if(p && ptrs.size===0){
      if(!moved && !pinched && e.type==='pointerup')
        tapAction(pxToChart(e.clientX, e.clientY, gRect));
      moved=false; pinched=false;
    }
  }
  svgEl.addEventListener('pointerup', endPtr);
  svgEl.addEventListener('pointercancel', endPtr);
  cw.addEventListener('wheel', e=>{
    e.preventDefault();
    zoomAt(e.deltaY>0? 1.2 : 1/1.2, pxToChart(e.clientX, e.clientY));
  }, {passive:false});

  App.$('#zin',el).addEventListener('click', ()=>{
    zoomAt(1/1.35, {x:CS.view.x+CS.view.w/2, y:CS.view.y+CS.view.w*AR/2});
  });
  App.$('#zout',el).addEventListener('click', ()=>{
    zoomAt(1.35, {x:CS.view.x+CS.view.w/2, y:CS.view.y+CS.view.w*AR/2});
  });
  App.$('#zreset',el).addEventListener('click', ()=>{
    CS.view={x:-10, y:16, w:170}; applyView();
  });
  App.$$('#navTools [data-tool]',el).forEach(b=>{
    b.addEventListener('click', ()=>{ CS.tool=b.dataset.tool; App.sfx('click'); updateTools(); });
  });

  /* ---- לוח תרגילים ---- */
  const exText=App.$('#exText',el), exOpts=App.$('#exOpts',el),
        exResult=App.$('#exResult',el), exScore=App.$('#exScore',el);
  function updateScore(){
    let s='נכונים: '+CS.session.ok+'/'+CS.session.tot;
    if(CS.ex && CS.ex.kind!=='calc'){
      const nb=App.store.navBest && App.store.navBest[CS.ex.kind];
      if(nb!=null) s+=' · שיא דיוק: '+nb.toFixed(2)+' nm';
    }
    exScore.textContent=s;
  }
  function renderExPanel(){
    if(!CS.ex){
      exText.innerHTML='לחצו «תרגיל חדש» כדי להתחיל. בחרו סוג תרגיל למעלה, או «אקראי».';
      exOpts.innerHTML=''; exResult.innerHTML='';
      btnCheck.style.display=''; btnCheck.disabled=true;
      updateScore(); return;
    }
    exText.innerHTML=CS.ex.text;
    exResult.innerHTML='';
    if(CS.ex.kind==='calc'){
      btnCheck.style.display='none';
      exOpts.innerHTML=CS.ex.opts.map((o,i)=>
        '<button class="opt" data-i="'+i+'">'+o+'</button>').join('');
      App.$$('.opt',exOpts).forEach(b=>{
        b.addEventListener('click', ()=>{ answerCalc(+b.dataset.i); });
      });
    } else {
      btnCheck.style.display='';
      btnCheck.disabled=!CS.fix;
      exOpts.innerHTML='';
    }
    updateScore();
  }
  function answerCalc(i){
    if(CS.checked) return;
    CS.checked=true;
    const ok=(i===CS.ex.correct);
    CS.session.tot++; if(ok) CS.session.ok++;
    App.recordAnswer('nav', ok);
    App.$$('.opt',exOpts).forEach((b,bi)=>{
      b.disabled=true;
      if(bi===CS.ex.correct) b.classList.add('correct');
      else if(bi===i) b.classList.add('wrong');
    });
    exResult.innerHTML='<div class="explain"><span class="lbl">הסבר</span><br>'+CS.ex.explain+'</div>';
    if(ok) App.toast('תשובה נכונה!');
    else App.toast('לא מדויק — ראו את ההסבר');
    updateScore();
  }
  function checkChartEx(){
    const ex=CS.ex;
    if(!ex||ex.kind==='calc'||CS.checked||!CS.fix) return;
    CS.checked=true; btnCheck.disabled=true;
    const err=distNm(CS.fix, ex.truth);
    const ok=err<0.8;
    CS.session.tot++; if(ok) CS.session.ok++;
    App.recordAnswer('nav', ok);
    if(ok){
      App.bump('fixOk');
      if(err<0.15) App.bump('fixPerfect');
      const nb=App.store.navBest;
      if(nb[ex.kind]==null || err<nb[ex.kind]){
        nb[ex.kind]=Math.round(err*100)/100; App.save();
      }
    }
    let verdict, cls;
    if(err<0.3){ verdict='מצוין!'; cls='safe'; App.confetti(40); }
    else if(err<0.8){ verdict='טוב'; cls='safe'; }
    else { verdict='נסו שוב'; cls='hit'; }
    App.toast(verdict+' סטייה '+err.toFixed(2)+' nm');
    CS.solSvg=solutionSvg(ex, CS.fix, err);
    exResult.innerHTML=
      '<div class="verdict show '+cls+'">'+verdict+' — סטייה של '
      +ltr(err.toFixed(2)+' nm')+'</div>'
      +'<div class="explain"><span class="lbl">הפתרון</span><br>'+solutionText(ex, err)+'</div>';
    redrawOvl(); updateScore();
  }
  function newExercise(){
    const ex=genExercise(CS.exType);
    if(!ex){ App.toast('לא הצלחתי להגריל תרגיל — נסו שוב'); return; }
    CS.ex=ex; CS.checked=false; CS.solSvg='';
    CS.fix=null; CS.measure=[];
    if(ex.kind!=='calc') CS.tool='fix';
    updateTools(); renderExPanel(); redrawOvl();
    hudInfo.style.display='none';
    App.sfx('click');
  }
  App.$('#exNew',el).addEventListener('click', newExercise);
  btnCheck.addEventListener('click', checkChartEx);
  App.$$('#exTypes .chip',el).forEach(ch=>{
    ch.addEventListener('click', ()=>{
      CS.exType=ch.dataset.x;
      App.$$('#exTypes .chip',el).forEach(c=>c.setAttribute('aria-pressed', c===ch));
      App.sfx('click');
    });
  });

  /* אתחול */
  clampView(); applyView(); updateTools(); redrawOvl(); renderExPanel();
}

/* ========================= תצוגת 'navcalc' ============================== */
function parseNum(v){
  v=String(v||'').trim().replace(',', '.');
  if(v==='') return null;
  const n=+v;
  return isFinite(n)? n : NaN;
}
function fmtDegDec(v){
  v=norm360(v);
  const r=Math.round(v*10)/10, i=Math.floor(r), f=Math.round((r-i)*10);
  const base=String(i%360).padStart(3,'0');
  return f? base+'.'+f+'°' : base+'°';
}
function fieldHTML(id,label,ph){
  return '<label class="navfield" style="flex-direction:column;align-items:stretch;gap:4px">'
    +'<span>'+label+'</span>'
    +'<input id="'+id+'" inputmode="decimal" dir="ltr" autocomplete="off" placeholder="'+(ph||'')+'"></label>';
}
function renderCalc(el){
  el.innerHTML=
   '<div class="section-title"><h2>מחשבוני ניווט</h2>'
   +'<span class="hint">מהירות·זמן·מרחק · המרת כיוונים · שעת הגעה</span></div>'

   +'<div class="card" style="padding:14px;margin-bottom:12px">'
   +'<h3 style="margin:0 0 4px;color:var(--parchment);font-size:.95rem">מהירות · זמן · מרחק</h3>'
   +'<p class="muted" style="font-size:.76rem;margin:0 0 10px">מלאו שני שדות והשאירו את השלישי ריק. '
   +'הנוסחה: מרחק = מהירות × זמן ÷ 60 («כלל ה־60»).</p>'
   +'<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(96px,1fr));gap:8px">'
   +fieldHTML('stdS','מהירות (קשר)','6')
   +fieldHTML('stdT','זמן (דקות)','45')
   +fieldHTML('stdD','מרחק (מייל)','4.5')
   +'</div>'
   +'<div class="row" style="margin-top:10px">'
   +'<button class="btn primary" id="stdGo">חשב את החסר</button>'
   +'<button class="btn mini ghost" id="stdClr">נקה</button></div>'
   +'<div id="stdOut" class="explain" style="display:none;margin-top:10px"></div>'
   +'</div>'

   +'<div class="card" style="padding:14px;margin-bottom:12px">'
   +'<h3 style="margin:0 0 4px;color:var(--parchment);font-size:.95rem">המרת כיוונים (TVMDC)</h3>'
   +'<p class="muted" style="font-size:.76rem;margin:0 0 10px">אמת ↔ מצפני, דרך הווריאציה והדוויאציה.</p>'
   +'<div class="row" style="margin-bottom:8px">'
   +'<div class="seg" id="tvMode">'
   +'<button data-m="t2c" aria-pressed="true">מאמת למצפן</button>'
   +'<button data-m="c2t" aria-pressed="false">ממצפן לאמת</button></div></div>'
   +'<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(96px,1fr));gap:8px">'
   +fieldHTML('tvC','כיוון (°)','100')
   +fieldHTML('tvV','וריאציה (°)','5')
   +fieldHTML('tvD','דוויאציה (°)','0')
   +'</div>'
   +'<div class="row" style="margin-top:8px;gap:14px">'
   +'<span class="navfield" style="gap:6px">וריאציה:'
   +'<span class="seg" id="tvVd"><button data-d="E" aria-pressed="true">E מזרחית</button>'
   +'<button data-d="W" aria-pressed="false">W מערבית</button></span></span>'
   +'<span class="navfield" style="gap:6px">דוויאציה:'
   +'<span class="seg" id="tvDd"><button data-d="E" aria-pressed="true">E מזרחית</button>'
   +'<button data-d="W" aria-pressed="false">W מערבית</button></span></span>'
   +'</div>'
   +'<div class="row" style="margin-top:10px"><button class="btn primary" id="tvGo">המר</button></div>'
   +'<div id="tvOut" class="explain" style="display:none;margin-top:10px"></div>'
   +'</div>'

   +'<div class="card" style="padding:14px;margin-bottom:12px">'
   +'<h3 style="margin:0 0 4px;color:var(--parchment);font-size:.95rem">שעת הגעה (ETA)</h3>'
   +'<p class="muted" style="font-size:.76rem;margin:0 0 10px">מרחק, מהירות ושעת יציאה — ונקבל את זמן השיט ושעת ההגעה.</p>'
   +'<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(96px,1fr));gap:8px">'
   +fieldHTML('etaD','מרחק (מייל)','12')
   +fieldHTML('etaS','מהירות (קשר)','6')
   +'<label class="navfield" style="flex-direction:column;align-items:stretch;gap:4px">'
   +'<span>שעת יציאה</span><input id="etaT" type="time" dir="ltr" value="09:00"></label>'
   +'</div>'
   +'<div class="row" style="margin-top:10px"><button class="btn primary" id="etaGo">חשב ETA</button></div>'
   +'<div id="etaOut" class="explain" style="display:none;margin-top:10px"></div>'
   +'</div>';

  /* --- מהירות·זמן·מרחק --- */
  const iS=App.$('#stdS',el), iT=App.$('#stdT',el), iD=App.$('#stdD',el), out=App.$('#stdOut',el);
  App.$('#stdClr',el).addEventListener('click', ()=>{
    iS.value=iT.value=iD.value=''; out.style.display='none';
  });
  App.$('#stdGo',el).addEventListener('click', ()=>{
    const S=parseNum(iS.value), T=parseNum(iT.value), D=parseNum(iD.value);
    const vals=[S,T,D];
    if(vals.some(v=>Number.isNaN(v))){ App.toast('קלט לא תקין'); return; }
    const filled=vals.filter(v=>v!=null).length;
    if(filled!==2){ App.toast('מלאו בדיוק שני שדות והשאירו אחד ריק'); return; }
    let html='';
    if(D==null){
      if(S<=0||T<=0){ App.toast('ערכים חייבים להיות חיוביים'); return; }
      const d=S*T/60; iD.value=d.toFixed(1);
      html='מרחק = '+ltr(S+' × '+T+' ÷ 60')+' = <b>'+ltr(fmtNm(d)+' nm')+'</b>'
        +'<br><span class="muted">('+ltr(T+' דק\' = '+(T/60).toFixed(2)+' שעות')+')</span>';
    } else if(S==null){
      if(T<=0){ App.toast('זמן חייב להיות חיובי'); return; }
      const s=60*D/T; iS.value=s.toFixed(1);
      html='מהירות = '+ltr('60 × '+D+' ÷ '+T)+' = <b>'+ltr(fmtNm(s)+' kn')+'</b>';
    } else {
      if(S<=0){ App.toast('מהירות חייבת להיות חיובית'); return; }
      const t=60*D/S, h=Math.floor(t/60), m=Math.round(t%60);
      iT.value=String(Math.round(t));
      html='זמן = '+ltr('60 × '+D+' ÷ '+S)+' = <b>'+ltr(Math.round(t)+' דק\'')+'</b>'
        +(t>=60? '<br><span class="muted">('+ltr(h+':'+String(m).padStart(2,'0'))+' שעות)</span>' : '');
    }
    out.innerHTML='<span class="lbl">תוצאה</span><br>'+html;
    out.style.display='block'; App.sfx('click');
  });

  /* --- TVMDC --- */
  let tvMode='t2c', tvVdir='E', tvDdir='E';
  function segWire(id, cb){
    App.$$('#'+id+' button',el).forEach(b=>{
      b.addEventListener('click', ()=>{
        App.$$('#'+id+' button',el).forEach(x=>x.setAttribute('aria-pressed', x===b));
        cb(b); App.sfx('click');
      });
    });
  }
  segWire('tvMode', b=>{ tvMode=b.dataset.m; });
  segWire('tvVd',  b=>{ tvVdir=b.dataset.d; });
  segWire('tvDd',  b=>{ tvDdir=b.dataset.d; });
  App.$('#tvV',el).value='5';
  App.$('#tvD',el).value='0';
  App.$('#tvGo',el).addEventListener('click', ()=>{
    const crs=parseNum(App.$('#tvC',el).value);
    // שדה ריק = 0; קלט לא-מספרי חייב להיכשל בבדיקה (NaN||0 היה מוחק את השגיאה)
    let vv=parseNum(App.$('#tvV',el).value); if(vv==null) vv=0;
    let dd=parseNum(App.$('#tvD',el).value); if(dd==null) dd=0;
    if(crs==null||Number.isNaN(crs)||Number.isNaN(vv)||Number.isNaN(dd)){
      App.toast('הזינו כיוון תקין'); return;
    }
    if(crs<0||crs>=360){ App.toast('כיוון חייב להיות 0–359.9'); return; }
    const sv=tvVdir==='E'? Math.abs(vv) : -Math.abs(vv);
    const sd=tvDdir==='E'? Math.abs(dd) : -Math.abs(dd);
    let T,M,Cc;
    if(tvMode==='t2c'){ T=crs; M=norm360(T-sv); Cc=norm360(M-sd); }
    else { Cc=crs; M=norm360(Cc+sd); T=norm360(M+sv); }
    const hl=tvMode==='t2c'? 'C' : 'T';
    const row=(k,val,he)=>'<tr'+(k===hl?' style="color:var(--brass);font-weight:800"':'')
      +'><td style="padding:2px 10px">'+k+'</td><td style="padding:2px 10px">'+val
      +'</td><td style="padding:2px 10px;font-family:var(--font)">'+he+'</td></tr>';
    const tvOut=App.$('#tvOut',el);
    tvOut.innerHTML='<span class="lbl">T · V · M · D · C</span>'
      +'<table dir="ltr" style="font-family:var(--mono);margin:8px auto 4px;border-collapse:collapse">'
      +row('T', fmtDegDec(T), 'אמת')
      +row('V', Math.abs(vv)+'°'+tvVdir, 'וריאציה')
      +row('M', fmtDegDec(M), 'מגנטי')
      +row('D', Math.abs(dd)+'°'+tvDdir, 'דוויאציה')
      +row('C', fmtDegDec(Cc), 'מצפני')
      +'</table>'
      +'<div class="muted" style="font-size:.78rem">כלל הזיכרון: בדרך <b>מאמת למצפן</b> (T→C) '
      +'מחסרים E ומוסיפים W; בדרך <b>ממצפן לאמת</b> (C→T) — להפך.</div>';
    tvOut.style.display='block'; App.sfx('click');
  });

  /* --- ETA --- */
  App.$('#etaGo',el).addEventListener('click', ()=>{
    const D=parseNum(App.$('#etaD',el).value), S=parseNum(App.$('#etaS',el).value);
    const tv=App.$('#etaT',el).value;
    if(D==null||S==null||Number.isNaN(D)||Number.isNaN(S)||S<=0||D<0){
      App.toast('הזינו מרחק ומהירות תקינים'); return;
    }
    if(!tv){ App.toast('בחרו שעת יציאה'); return; }
    const parts=tv.split(':'), dep=(+parts[0])*60+(+parts[1]);
    const dur=Math.round(60*D/S);
    const tot=dep+dur, days=Math.floor(tot/1440);
    const hh=String(Math.floor((tot%1440)/60)).padStart(2,'0');
    const mm=String(tot%60).padStart(2,'0');
    const dh=Math.floor(dur/60), dm=dur%60;
    const etaOut=App.$('#etaOut',el);
    etaOut.innerHTML='<span class="lbl">תוצאה</span><br>'
      +'זמן השיט: <b>'+ltr(dh+':'+String(dm).padStart(2,'0'))+'</b> שעות ('
      +ltr('60 × '+D+' ÷ '+S+' = '+dur+' דק\'')+')'
      +'<br>שעת הגעה משוערת: <b>'+ltr(hh+':'+mm)+'</b>'
      +(days>0? ' <span class="muted">(בעוד '+days+' ימים)</span>' : '');
    etaOut.style.display='block'; App.sfx('click');
  });
}

/* ========================= תצוגת 'navlearn' ============================= */
function ic(inner){ return '<svg viewBox="0 0 120 66" aria-hidden="true">'+inner+'</svg>'; }
const IK='style="stroke:var(--ink-dim)" stroke-width="1.6" fill="none" stroke-linecap="round"';
const CONCEPTS=[
 { id:'latlon', name:'קו רוחב וקו אורך',
   icon:ic('<circle cx="60" cy="33" r="24" '+IK+'/><ellipse cx="60" cy="33" rx="24" ry="9" '+IK+'/>'
     +'<ellipse cx="60" cy="33" rx="10" ry="24" '+IK+'/><line x1="36" y1="33" x2="84" y2="33" stroke="#d9a441" stroke-width="1.6"/>'),
   body:'<p><b>קו רוחב (Latitude)</b> — המרחק הזוויתי מקו המשווה: 0° במשווה עד 90° בקטבים, עם סימון N (צפון) או S (דרום). קווי הרוחב מקבילים זה לזה.</p>'
     +'<p><b>קו אורך (Longitude)</b> — המרחק הזוויתי ממרידיאן גריניץ׳: 0° עד 180°, עם סימון E (מזרח) או W (מערב).</p>'
     +'<p>רישום מקובל: מעלות ודקות עשרוניות, למשל <span dir="ltr">32°17.5\'N&nbsp;034°28.3\'E</span>. בכל מעלה 60 דקות קשת.</p>'
     +'<p class="muted">במפה: את הרוחב קוראים בסולם ה<b>צדדי</b> (ימין/שמאל), את האורך בסולם העליון/תחתון. מרחקים מודדים <b>תמיד</b> בסולם הרוחב הצדדי — לעולם לא בסולם האורך!</p>' },
 { id:'nm', name:'מייל ימי וקשר',
   icon:ic('<path d="M12,45 Q35,35 60,45 T108,45" '+IK+'/><line x1="20" y1="22" x2="100" y2="22" stroke="#d9a441" stroke-width="1.6"/>'
     +'<line x1="20" y1="17" x2="20" y2="27" stroke="#d9a441" stroke-width="1.6"/><line x1="100" y1="17" x2="100" y2="27" stroke="#d9a441" stroke-width="1.6"/>'
     +'<text x="60" y="15" style="fill:var(--ink-dim)" font-size="9" text-anchor="middle">1nm = 1852m</text>'),
   body:'<p><b>מייל ימי (nm)</b> = 1852 מטר = אורך של <b>דקת רוחב אחת</b> (1/60 מעלה) על פני כדור הארץ. לכן מודדים מרחקים בסולם הרוחב של המפה.</p>'
     +'<p><b>קשר (knot)</b> = מייל ימי אחד לשעה. סירה השטה 6 קשר עוברת 6 מייל בשעה — או 1 מייל כל 10 דקות.</p>'
     +'<p class="muted">כלל אצבע: ב־6 דקות עוברים עשירית מהמהירות (6 קשר → 0.6 מייל ב־6 דקות).</p>' },
 { id:'tmc', name:'אמיתי · מגנטי · מצפני',
   icon:ic('<line x1="60" y1="55" x2="60" y2="12" stroke="#22d07a" stroke-width="1.8"/>'
     +'<line x1="60" y1="55" x2="74" y2="15" stroke="#d9a441" stroke-width="1.8"/>'
     +'<line x1="60" y1="55" x2="84" y2="22" stroke="#e2483d" stroke-width="1.8"/>'
     +'<text x="56" y="10" fill="#22d07a" font-size="9">T</text><text x="76" y="13" fill="#d9a441" font-size="9">M</text><text x="87" y="22" fill="#e2483d" font-size="9">C</text>'),
   body:'<p>שלוש מערכות לציון כיוון, כולן 000°–359° עם כיוון השעון:</p>'
     +'<p><b>אמיתי (True)</b> — ביחס לצפון הגיאוגרפי; זה מה שמודדים ומשרטטים על המפה.</p>'
     +'<p><b>מגנטי (Magnetic)</b> — ביחס לצפון המגנטי; ההפרש מהאמיתי הוא ה<b>וריאציה</b>.</p>'
     +'<p><b>מצפני (Compass)</b> — מה שמצפן הסירה מראה בפועל; נוסף עליו גם ה<b>דוויאציה</b> של הסירה.</p>'
     +'<p class="muted">שרשרת ההמרה: T ↔ V ↔ M ↔ D ↔ C. ראו גם כרטיס «המרת כיוונים».</p>' },
 { id:'variation', name:'וריאציה',
   icon:ic('<line x1="60" y1="55" x2="60" y2="12" stroke="#22d07a" stroke-width="1.8"/>'
     +'<line x1="60" y1="55" x2="73" y2="14" stroke="#e2483d" stroke-width="1.8"/>'
     +'<path d="M60,28 A14,14 0 0 1 69,26" '+IK+'/><text x="70" y="36" style="fill:var(--ink-dim)" font-size="9">Var</text>'),
   body:'<p><b>וריאציה (שוני מגנטי)</b> — הזווית בין הצפון האמיתי לצפון המגנטי. היא תלויה במקום על פני כדור הארץ ומשתנה לאט עם השנים.</p>'
     +'<p>אם הצפון המגנטי נוטה <b>מזרחה</b> מהאמיתי — הווריאציה <b>E</b>; מערבה — <b>W</b>. במפה שלנו: 5°E.</p>'
     +'<p>הווריאציה מודפסת בתוך שושנת המפה, עם שנת העדכון והשינוי השנתי.</p>'
     +'<p class="muted">חישוב: מגנטי = אמת − וריאציה מזרחית (או + מערבית). לדוגמה: אמת 100°, וריאציה 5°E → מגנטי 095°.</p>' },
 { id:'deviation', name:'דוויאציה',
   icon:ic('<circle cx="60" cy="33" r="20" '+IK+'/><polygon points="60,17 64,33 60,49 56,33" fill="#e2483d"/>'
     +'<rect x="86" y="26" width="14" height="14" fill="none" stroke="#d9a441" stroke-width="1.6"/>'),
   body:'<p><b>דוויאציה (סטיית מצפן)</b> — שגיאה נוספת של מצפן הסירה, הנגרמת מברזל ומציוד חשמלי בסירה עצמה.</p>'
     +'<p>בשונה מהווריאציה, הדוויאציה <b>תלויה בכיוון החרטום</b>: לכל קורס יש ערך אחר, שנקרא מ<b>טבלת הדוויאציה</b> של הסירה. גם היא מסומנת E או W.</p>'
     +'<p class="muted">חישוב: מצפני = מגנטי − דוויאציה מזרחית (או + מערבית).</p>' },
 { id:'lop', name:'קו מיקום (LOP)',
   icon:ic('<path d="'+starPath(94,18,6)+'" fill="#d9a441"/><line x1="90" y1="24" x2="22" y2="52" stroke="#e2483d" stroke-width="1.6" stroke-dasharray="5 3"/>'
     +'<circle cx="46" cy="42" r="3" fill="#4aa3ff"/>'),
   body:'<p><b>קו מיקום (Line of Position)</b> — קו שעליו הסירה נמצאת בוודאות, גם אם לא ידוע היכן בדיוק לאורכו.</p>'
     +'<p>הדרך הנפוצה: מודדים <b>כיוון אמיתי אל עצם מזוהה</b> (מגדלור, ארובה). מכיוון שהמדידה נעשית <b>מהסירה אל העצם</b>, משרטטים במפה את הקו <b>מהעצם</b> בכיוון ההופכי (+180°): נמדד 047° → משרטטים מהעצם 227°. הסירה על הקו הזה.</p>'
     +'<p class="muted">גם מרחק מעצם (מעגל), קו עומק או קו מוביל הם קווי מיקום.</p>' },
 { id:'fix', name:'פיקס (קביעת מקום)',
   icon:ic('<line x1="14" y1="14" x2="98" y2="52" stroke="#e2483d" stroke-width="1.6" stroke-dasharray="5 3"/>'
     +'<line x1="100" y1="12" x2="20" y2="54" stroke="#d9a441" stroke-width="1.6" stroke-dasharray="5 3"/>'
     +'<circle cx="58" cy="33" r="5" '+IK+'/>'),
   body:'<p><b>פיקס</b> — מיקום ודאי של הסירה, המתקבל מחיתוך של <b>שני קווי מיקום או יותר</b> שנמדדו באותו זמן.</p>'
     +'<p>זווית החיתוך האידיאלית בין שני קווים היא כ־90°; נהוג לקבל בין 30° ל־150°. זווית חדה מדי מגדילה את השגיאה.</p>'
     +'<p>עם שלושה קווים מתקבל לרוב משולש קטן («כובע») — המיקום מוערך בתוכו. מסמנים את הפיקס בעיגול עם נקודה ורושמים לידו את השעה.</p>' },
 { id:'dr', name:'ניווט שולחני (DR)',
   icon:ic('<circle cx="18" cy="50" r="4" fill="#d9a441"/><line x1="22" y1="47" x2="92" y2="20" stroke="#4aa3ff" stroke-width="1.8"/>'
     +'<polygon points="92,20 82,20 88,28" fill="#4aa3ff"/><circle cx="98" cy="17" r="4" '+IK+'/>'),
   body:'<p><b>Dead Reckoning</b> — חיזוי מיקום הסירה מתוך נקודה ידועה אחרונה: משרטטים מהנקודה את <b>הקורס האמיתי</b>, ומודדים לאורכו את המרחק שנעבר.</p>'
     +'<p>מרחק = מהירות × זמן ÷ 60 (קשר, דקות, מייל). דוגמה: 6 קשר במשך 45 דקות → <span dir="ltr">6 × 45 ÷ 60 = 4.5nm</span>.</p>'
     +'<p class="muted">DR מתעלם מזרם ומרוח, ולכן השגיאה מצטברת עם הזמן — חובה לעדכן בפיקסים בכל הזדמנות.</p>' },
 { id:'lights', name:'אופי אורות',
   icon:ic('<rect x="10" y="28" width="10" height="10" rx="2" fill="#ffd23b"/><rect x="26" y="28" width="10" height="10" rx="2" fill="#ffd23b"/>'
     +'<rect x="42" y="28" width="52" height="10" rx="2" fill="none" style="stroke:var(--ink-dim)" stroke-width="1.4"/>'
     +'<text x="60" y="18" style="fill:var(--ink-dim)" font-size="9" text-anchor="middle">Fl(2) 10s</text>'),
   body:'<p>לכל אור ימי «אופי» המזהה אותו בלילה:</p>'
     +'<p><b>F</b> קבוע · <b>Fl</b> הבזק (אור קצר מהחושך) · <b>Oc</b> האפלה (אור ארוך מהחושך) · '
     +'<b>Iso</b> שווה (אור=חושך) · <b>Q</b> מהיר (50–60 הבזקים בדקה) · <b>VQ</b> מהיר מאוד · '
     +'<b>LFl</b> הבזק ארוך (≥2 שנ׳) · <b>Mo(A)</b> אות מורס.</p>'
     +'<p>קריאת <span dir="ltr"><b>Fl(2) W 10s 24m 17M</b></span>: קבוצה של 2 הבזקים לבנים החוזרת כל 10 שניות; '
     +'גובה האור 24 מ׳ מעל פני הים; טווח נראות נומינלי 17 מייל.</p>'
     +'<p class="muted">כדי לזהות אור: מודדים בשעון את המחזור המלא (מתחילת הבזק עד תחילת ההבזק המקביל הבא) וסופרים את ההבזקים בקבוצה.</p>' },
 { id:'depth', name:'קווי עומק וסימני מפה',
   icon:ic('<path d="M10,20 Q60,26 110,18" stroke="#4aa3ff" stroke-width="1.4" fill="none"/>'
     +'<path d="M10,34 Q60,42 110,32" stroke="#4aa3ff" stroke-width="1.4" fill="none"/>'
     +'<path d="M10,50 Q60,58 110,46" stroke="#4aa3ff" stroke-width="1.4" fill="none"/>'
     +'<text x="18" y="30" style="fill:var(--ink-dim)" font-size="8">5</text><text x="18" y="46" style="fill:var(--ink-dim)" font-size="8">10</text>'),
   body:'<p>העומקים במפה נתונים <b>במטרים</b> ביחס לאפס המפה (שפל אסטרונומי נמוך) — כלומר בפועל המים כמעט תמיד עמוקים מהרשום.</p>'
     +'<p><b>עומק נקודה</b>: ספרה קטנה ומונמכת היא עשיריות — <span dir="ltr">3₅</span> פירושו 3.5 מ׳. '
     +'<b>קווי עומק</b> (2, 5, 10, 20 מ׳) מחברים נקודות שוות עומק; ככל שהגוון כחול יותר — רדוד יותר.</p>'
     +'<p>סמלים חשובים: כוכב עם להבת מגנטה = מגדלור · כוכבית = סלע · <span dir="ltr">Wk</span> = טרופה · '
     +'עיגול מקווקו = אזור סכנה · עוגן = מעגן.</p>' },
 { id:'rule60', name:'כלל ה־60',
   icon:ic('<path d="M20,52 L60,14 L100,52 Z" '+IK+'/><text x="60" y="34" fill="#d9a441" font-size="11" text-anchor="middle">D</text>'
     +'<text x="42" y="49" style="fill:var(--ink-dim)" font-size="9" text-anchor="middle">S×T</text><text x="78" y="49" style="fill:var(--ink-dim)" font-size="9" text-anchor="middle">÷60</text>'),
   body:'<p>המשולש הקבוע של הניווט — מרחק, מהירות וזמן:</p>'
     +'<p style="text-align:center;font-family:var(--mono)" dir="ltr">D = S × T ÷ 60<br>S = 60 × D ÷ T<br>T = 60 × D ÷ S</p>'
     +'<p>כאשר D במיילים ימיים, S בקשר, T <b>בדקות</b>. המקדם 60 ממיר דקות לשעות.</p>'
     +'<p class="muted">דוגמאות: 8 קשר × 30 דק׳ ÷ 60 = 4 מייל. לעבור 6 מייל ב־5 קשר: 60×6÷5 = 72 דקות.</p>' }
];
function renderLearn(el){
  el.innerHTML=
    '<div class="section-title"><h2>מושגי ניווט חופי</h2>'
    +'<span class="hint">הקישו על כרטיס להסבר מלא</span></div>'
    +'<div class="grid">'
    +CONCEPTS.map(c=>'<button class="tile" data-c="'+c.id+'">'
      +'<div style="padding:4px 10px 0">'+c.icon+'</div>'
      +'<div class="nm">'+c.name+'</div></button>').join('')
    +'</div>';
  App.$$('.tile',el).forEach(t=>{
    t.addEventListener('click', ()=>{
      const c=CONCEPTS.find(x=>x.id===t.dataset.c);
      if(c){ App.sfx('click'); App.openSheet(c.name, c.body); }
    });
  });
}

/* ============================== רישום =================================== */
App.registerView('chart',   { render: renderChart });
App.registerView('navcalc', { render: renderCalc });
App.registerView('navlearn',{ render: renderLearn });

})();
