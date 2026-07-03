/* ============================================================================
   scenarios.js — תרחישי זכות קדימה v2:
   מחולל מפגשים אקראי מכל זווית, שרטוט תמרון בגרירה, סימולציה פיזיקלית
   והערכה לפי התקנות. חדש: מצב לילה (זיהוי לפי אורות בלבד), אינטגרציית
   אותות קול, אפקטים, וניקוד XP.
   ========================================================================== */
(function(){
"use strict";
const BW=360, COLA='#4aa3ff', COLB='#ff9f43';
const PLAY_SCALE=4.5;   // ×1 בסליידר = קצב הצפייה הנוח (4.5 הישן)
const st={hist:[],idx:-1,types:null,speed:1,night:false,typeselOpen:false};
let sim=null;

/* ---------- וקטורים ---------- */
function vec(a,b){return {x:b.x-a.x,y:b.y-a.y};}
function len(v){return Math.hypot(v.x,v.y)||1;}
function norm(v){const l=len(v);return{x:v.x/l,y:v.y/l};}
function clampPt(p){return{x:Math.max(12,Math.min(BW-12,p.x)),y:Math.max(12,Math.min(BW-12,p.y))};}
function dotv(u,v){return u.x*v.x+u.y*v.y;}
function rotate(v,deg){const r=deg*Math.PI/180,c=Math.cos(r),s=Math.sin(r);return{x:v.x*c-v.y*s,y:v.x*s+v.y*c};}
function dirAt(deg){const r=deg*Math.PI/180;return {x:Math.cos(r),y:Math.sin(r)};}
function signedTurnDeg(H,D){ return Math.atan2(H.x*D.y-H.y*D.x, H.x*D.x+H.y*D.y)*180/Math.PI; }
/* נתיב ברירת מחדל: המשך הכיוון עד שפת הלוח */
function rayToEdge(start,h){
  const lo=12,hi=BW-12;
  const tx = h.x>0?(hi-start.x)/h.x : h.x<0?(lo-start.x)/h.x : Infinity;
  const ty = h.y>0?(hi-start.y)/h.y : h.y<0?(lo-start.y)/h.y : Infinity;
  const t=Math.max(20,Math.min(tx,ty));
  return clampPt({x:start.x+h.x*t, y:start.y+h.y*t});
}

/* ---------- COLREG resolver ---------- */
const RANK_MAP={power:2,sail:3,fishing:4,cbd:5,nuc:6,ram:6};
function rankOf(cls){return RANK_MAP[cls]||2;}
const HE_CLASS={power:'כלי שיט ממונע',sail:'מפרשית',fishing:'כלי שיט עוסק בדיג',cbd:'כלי שיט מוגבל בשוקעו',nuc:'כלי שיט שאינו שולט בתנועתו',ram:'כלי שיט מוגבל ביכולת התמרון'};
function heClass(c){return HE_CLASS[c]||c;}
const capable=c=>['power','sail','fishing','cbd'].includes(c);
let _SCN_TYPES=null;
function SCN_TYPES(){
  if(!_SCN_TYPES) _SCN_TYPES=App.R.vessels.filter(v=>v.underway&&!v.noScenario&&!['anchor','aground'].includes(v.giveWayClass))
    .map(v=>({vid:v.id, cls:v.giveWayClass, label:v.shortName}));
  return _SCN_TYPES;
}
function resolveEncounter(A,B,wind){
  const hA=norm(A.heading),hB=norm(B.heading);
  const aFromB=Math.abs(signedTurnDeg(hB,vec(B,A))), bFromA=Math.abs(signedTurnDeg(hA,vec(A,B)));
  const Aover=aFromB>112.5, Bover=bFromA>112.5;
  const exp={};
  if(Aover!==Bover){
    const g=Aover?'A':'B', o=Aover?'B':'A';
    exp[g]={role:'give-way',turn:'either',minTurnDeg:15,keepClear:o}; exp[o]={role:'stand-on'};
    return {type:'overtaking',title:'עקיפה',giveWay:g,expected:exp,ref:{colreg:'Rule 13'},
      explain:'עקיפה (תקנה 13): כלי השיט העוקף חייב להתרחק ולחלוף בבטחה; הנעקף שומר נתיב ומהירות.'};
  }
  const rA=rankOf(A.class),rB=rankOf(B.class),course=Math.abs(signedTurnDeg(hA,hB));
  if(rA!==rB){
    const g=rA<rB?'A':'B', o=rA<rB?'B':'A';
    exp[g]={role:'give-way',turn:'either',minTurnDeg:15,passAstern:o}; exp[o]={role:'stand-on'};
    const giveCls=(g==='A'?A:B).class, standCls=(o==='A'?A:B).class;
    const cbd = standCls==='cbd';
    return {type:'priority',title: cbd?'הימנעות מהפרעה (מוגבל בשוקעו)':'עדיפות לפי סוג כלי השיט',giveWay:g,expected:exp,
      ref:{colreg: cbd?'Rule 18(d)':'Rule 18'},
      explain: cbd
        ? ('תקנה 18(ד): כל כלי שיט (פרט ל‑NUC/RAM) חייב להימנע מהפרעה למעברו של כלי שיט מוגבל בשוקעו — '+heClass(giveCls)+' מפנה דרך ל'+heClass(standCls)+'.')
        : ('תקנה 18: '+heClass(giveCls)+' נותן זכות קדימה ל'+heClass(standCls)+' (פונה וחולף מאחוריו).')};
  }
  if(A.class==='sail'&&B.class==='sail'&&wind){
    const tA=signedTurnDeg(hA,wind)>0?'stbd':'port', tB=signedTurnDeg(hB,wind)>0?'stbd':'port';
    if(tA!==tB){const g=tA==='port'?'A':'B', o=g==='A'?'B':'A';
      exp[g]={role:'give-way',turn:'either',minTurnDeg:15,passAstern:o}; exp[o]={role:'stand-on'};
      return {type:'sail-diff',title:'שתי מפרשיות — הרוח בצדדים שונים',giveWay:g,expected:exp,ref:{colreg:'Rule 12'},
        explain:'תקנה 12: המפרשית שהרוח בצדה השמאלי (port tack) נותנת זכות קדימה למפרשית שהרוח בצדה הימני.'};}
    const aWind=dotv(vec(B,A),wind)>0, g=aWind?'A':'B', o=aWind?'B':'A';
    exp[g]={role:'give-way',turn:'either',minTurnDeg:15,passAstern:o}; exp[o]={role:'stand-on'};
    return {type:'sail-same',title:'שתי מפרשיות — הרוח באותו צד',giveWay:g,expected:exp,ref:{colreg:'Rule 12'},
      explain:'תקנה 12: באותו צד רוח — הכלי שלרוח (windward) נותן זכות קדימה לכלי שמתחת לרוח (leeward).'};
  }
  if(A.class==='power'&&B.class==='power'){
    if(course>165&&bFromA<35){
      exp.A={role:'give-way',turn:'starboard',minTurnDeg:15}; exp.B={role:'give-way',turn:'starboard',minTurnDeg:15};
      return {type:'head-on',title:'חזית מול חזית',giveWay:'both',expected:exp,ref:{colreg:'Rule 14'},
        explain:'חזית מול חזית (תקנה 14): כל אחד יסטה ימינה ויחלפו צד‑שמאל אל צד‑שמאל.'};
    }
    const bStbd=signedTurnDeg(hA,vec(A,B))>0, g=bStbd?'A':'B', o=bStbd?'B':'A';
    exp[g]={role:'give-way',turn:'starboard',minTurnDeg:15,passAstern:o}; exp[o]={role:'stand-on'};
    return {type:'crossing',title:'חיתוך נתיבים',giveWay:g,expected:exp,ref:{colreg:'Rule 15'},
      explain:'חיתוך נתיבים (תקנה 15): הכלי שרואה את האחר בצדו הימני נותן זכות קדימה, פונה ימינה וחולף מאחוריו (אסור לחצות לפניו).'};
  }
  return null;
}

/* ---------- פיזיקה והערכה ---------- */
const BASE_SPEED=72, HIT_DIST=24, HOLD_MAX=12;
function computeCPA(A0,dA,LA,spA,B0,dB,LB,spB){
  const T=Math.max(LA/spA,LB/spB,0.15);
  const pos=(s,d,L,sp,t)=>{const dd=Math.min(t*sp,L);return{x:s.x+d.x*dd,y:s.y+d.y*dd};};
  let minD=1e9,paC=A0,pbC=B0;
  for(let t=0;t<=T;t+=1/120){const a=pos(A0,dA,LA,spA,t),b=pos(B0,dB,LB,spB,t);const d=len(vec(a,b));if(d<minD){minD=d;paC=a;pbC=b;}}
  return {minD,paC,pbC};
}
function lineIntersect(p1,d1,p2,d2){
  const den=d1.x*d2.y-d1.y*d2.x; if(Math.abs(den)<1e-6)return null;
  const a=((p2.x-p1.x)*d2.y-(p2.y-p1.y)*d2.x)/den;
  const b=((p2.x-p1.x)*d1.y-(p2.y-p1.y)*d1.x)/den;
  return {a,b};
}
function passesAstern(G0,dG,LG,spG,O0,dO,LO,spO){
  const X=lineIntersect(G0,dG,O0,dO);
  if(!X) return true;
  if(X.a<0 || X.a>LG+10) return true;
  if(X.b<0) return true;
  return (X.a/spG) >= (X.b/spO) - 0.05;
}
function evaluateManeuver(sc,hA,hB){
  hA=hA||sim.hA; hB=hB||sim.hB;
  const A0={x:sc.A.x,y:sc.A.y}, B0={x:sc.B.x,y:sc.B.y};
  const D={A:norm(vec(A0,hA)), B:norm(vec(B0,hB))};
  const L={A:len(vec(A0,hA)), B:len(vec(B0,hB))};
  const SP={A:BASE_SPEED*(sc.A.spd||1), B:BASE_SPEED*(sc.B.spd||1)};
  const P={A:A0,B:B0};
  const cpa=computeCPA(A0,D.A,L.A,SP.A,B0,D.B,L.B,SP.B);
  const hit=cpa.minD<HIT_DIST;
  function checks(key){
    const exp=sc.expected[key], H=norm(sc[key].heading), ang=signedTurnDeg(H,D[key]), mag=Math.abs(ang), side=ang>0?'starboard':'port';
    const o=[];
    if(exp.role==='stand-on'){
      const hold=mag<=HOLD_MAX;
      o.push({ok:hold, t: hold?'שמר על נתיב ומהירות — נכון לכלי שיט שומר‑נתיב (תקנה 17)':('כלי שיט שומר‑נתיב חייב לשמור על נתיבו — שינית ב‑'+Math.round(mag)+'° (תקנה 17)')});
    } else {
      o.push({ok: mag>=exp.minTurnDeg, t: mag>=exp.minTurnDeg?('בוצעה פעולה ברורה — פנייה של '+Math.round(mag)+'°'):('הפנייה קטנה מדי ('+Math.round(mag)+'°) — נדרשת פעולה מוקדמת וברורה (תקנה 16)')});
      if(exp.turn && exp.turn!=='either'){
        const ok=(side===exp.turn)&&mag>=5;
        o.push({ok, t: ok?('פנה לכיוון הנכון — '+(exp.turn==='starboard'?'ימינה (starboard)':'שמאלה (port)')):('יש לפנות '+(exp.turn==='starboard'?'ימינה (starboard)':'שמאלה (port)')+(mag>=5?(' — פנית '+(side==='starboard'?'ימינה':'שמאלה')):''))});
      }
      if(exp.passAstern){
        const ok=passesAstern(P[key],D[key],L[key],SP[key], P[exp.passAstern],D[exp.passAstern],L[exp.passAstern],SP[exp.passAstern]);
        o.push({ok, t: ok?'חלף מאחורי כלי השיט האחר (לא חצה מלפניו)':'חצה/עומד לחצות מלפני כלי השיט האחר — יש לחלוף מאחוריו (תקנות 15, 8)'});
      }
      if(exp.keepClear){ o.push({ok:!hit, t: !hit?'נשמר מרחק בטוח מהכלי הנעקף':'לא נשמר מרחק בטוח — יש לחלוף הרחק מהנעקף'}); }
    }
    return o;
  }
  const cA=checks('A'), cB=checks('B');
  const coll={ok:!hit, t:!hit?('אין התנגשות (מרחק מינימלי '+Math.round(cpa.minD)+' יח׳)'):'התנגשות! הנתיבים מצטלבים בו‑זמנית'};
  const allOk = cA.every(x=>x.ok)&&cB.every(x=>x.ok)&&!hit;
  return {A:cA, B:cB, coll, allOk, minD:cpa.minD, hit};
}
/* אות הקול המתאים לפנייה של נותן זכות הקדימה.
   תקנה 34(א) חלה על כלי שיט ממונע בלבד — מפרשית/דייג אינם משמיעים אותות תמרון! */
function turnSignal(sc,key,hPt){
  const e=sc.expected[key]; if(!e||e.role!=='give-way') return null;
  if(!['power','cbd'].includes(sc[key].class)) return null;
  const H=norm(sc[key].heading), Dd=norm(vec({x:sc[key].x,y:sc[key].y},hPt));
  const ang=signedTurnDeg(H,Dd);
  if(Math.abs(ang)<5) return null;
  return ang>0 ? {pat:'•', txt:'פנייה ימינה — צפירה קצרה אחת', audio:['S']}
               : {pat:'• •', txt:'פנייה שמאלה — שתי צפירות קצרות', audio:['S','S']};
}

/* ---------- מחולל תרחישים ---------- */
function fitBoard(A,B){
  const L=50,Rr=310,Tp=66,Bt=314; let dx=0,dy=0;
  const minx=Math.min(A.x,B.x),maxx=Math.max(A.x,B.x),miny=Math.min(A.y,B.y),maxy=Math.max(A.y,B.y);
  if(minx<L)dx=L-minx; if(maxx>Rr)dx=Rr-maxx; if(miny<Tp)dy=Tp-miny; if(maxy>Bt)dy=Bt-maxy;
  A.x+=dx;A.y+=dy;B.x+=dx;B.y+=dy;}
function geomsFor(ca,cb){
  if(ca==='power'&&cb==='power') return ['headon','crossing','overtaking'];
  if(ca==='sail'&&cb==='sail')   return ['sail'];
  if(ca===cb)                    return capable(ca)?['overtaking']:[];
  if(rankOf(ca)!==rankOf(cb))    return ['crossing','overtaking'];
  return [];
}
function pickGeom(geoms){
  const w=geoms.map(g=>g==='overtaking'?1:4);
  let tot=w.reduce((a,b)=>a+b,0), r=Math.random()*tot;
  for(let i=0;i<geoms.length;i++){ if((r-=w[i])<0) return geoms[i]; }
  return geoms[geoms.length-1];
}
function proposeScenario(allowed){
  const sailTypes=allowed.filter(t=>t.cls==='sail');
  for(let k=0;k<40;k++){
    let ta,tb;
    if(sailTypes.length && Math.random()<0.4){ ta=App.pick(sailTypes); tb=App.pick(sailTypes); }
    else { ta=App.pick(allowed); tb=App.pick(allowed); }
    let ca=ta.cls, cb=tb.cls;
    if(!capable(ca)&&!capable(cb)) continue;
    const geoms=geomsFor(ca,cb); if(!geoms.length) continue;
    const geom=pickGeom(geoms);
    const C={x:170+Math.random()*20,y:170+Math.random()*20}, th=Math.random()*360, d=100+Math.random()*22;
    let A,B,wind;
    const mk=(cls,t,head,extra)=>Object.assign({class:cls,vid:t.vid,heading:head},extra||{});
    if(geom==='overtaking'){
      if(!capable(ca)&&capable(cb)){ [ca,cb]=[cb,ca]; [ta,tb]=[tb,ta]; }
      const dir=dirAt(th);
      const off=(Math.random()*2-1)*52;
      const back=dirAt(th+180+off), dist=120+Math.random()*26;
      B=mk(cb,tb,dir); B.x=C.x; B.y=C.y;
      A=mk(ca,ta,dir,{spd:1.7}); A.x=C.x+back.x*dist; A.y=C.y+back.y*dist;
      A.heading=norm(vec(A,{x:C.x+dir.x*46,y:C.y+dir.y*46}));
    } else if(geom==='headon'){
      const dir=dirAt(th); A=mk(ca,ta,dir); B=mk(cb,tb,{x:-dir.x,y:-dir.y});
      A.x=C.x-dir.x*d; A.y=C.y-dir.y*d; B.x=C.x+dir.x*d; B.y=C.y+dir.y*d;
    } else if(geom==='sail'){
      wind=dirAt(Math.random()*360); const side=Math.random()<.5?1:-1, dA=dirAt(th), dB=dirAt(th+90*side);
      if(Math.abs(signedTurnDeg(dA,wind))<48||Math.abs(signedTurnDeg(dB,wind))<48) continue;
      A=mk(ca,ta,dA); B=mk(cb,tb,dB); A.x=C.x-dA.x*d;A.y=C.y-dA.y*d; B.x=C.x-dB.x*d;B.y=C.y-dB.y*d;
    } else {
      const side=Math.random()<.5?1:-1, dA=dirAt(th), dB=dirAt(th+90*side);
      A=mk(ca,ta,dA); B=mk(cb,tb,dB); A.x=C.x-dA.x*d;A.y=C.y-dA.y*d; B.x=C.x-dB.x*d;B.y=C.y-dB.y*d;
    }
    fitBoard(A,B);
    const r=resolveEncounter(A,B,wind); if(!r) continue;
    // רוח אחת לכל תרחיש — מקור אמת יחיד. בתרחישי מפרש היא כבר נבחרה לפי הגיאומטריה;
    // בשאר התרחישים מגרילים רוח שאינה "באפו" של אף מפרשית (in irons).
    if(!wind){
      for(let w=0; w<30 && !wind; w++){
        const cand=dirAt(Math.random()*360);
        if([A,B].every(b=>b.class!=='sail'||Math.abs(signedTurnDeg(norm(b.heading),cand))>=48)) wind=cand;
      }
      if(!wind) wind=dirAt(Math.random()*360);
    }
    A.windSide=signedTurnDeg(norm(A.heading),wind)>0?'stbd':'port';
    B.windSide=signedTurnDeg(norm(B.heading),wind)>0?'stbd':'port';
    A.label='כלי שיט א׳'; B.label='כלי שיט ב׳';
    return {A,B,wind,title:r.title,ref:r.ref,giveWay:r.giveWay,expected:r.expected,explain:r.explain};
  }
  return null;
}
function solutionTracks(sc){
  const trackFor=key=>{const e=sc.expected[key], stp={x:sc[key].x,y:sc[key].y}, H=norm(sc[key].heading);
    if(e.role==='stand-on')return [rayToEdge(stp,H)];
    const dirs=e.turn==='starboard'?[1]:e.turn==='port'?[-1]:[1,-1], angs=[25,35,45,55,65], c=[];
    dirs.forEach(s=>angs.forEach(a=>c.push(rayToEdge(stp,norm(rotate(H,s*a))))));
    return c;};
  const cA=trackFor('A'), cB=trackFor('B');
  for(const a of cA) for(const b of cB){ if(evaluateManeuver(sc,a,b).allOk) return {A:a,B:b}; }
  return null;
}
function buildScenario(){
  const allowed=SCN_TYPES().filter(t=>st.types.has(t.vid));
  if(!allowed.some(t=>capable(t.cls))) return null;
  for(let i=0;i<140;i++){
    const sc=proposeScenario(allowed); if(!sc)continue;
    const defA=rayToEdge({x:sc.A.x,y:sc.A.y},sc.A.heading), defB=rayToEdge({x:sc.B.x,y:sc.B.y},sc.B.heading);
    sim={sc,hA:defA,hB:defB}; // זמני עבור evaluateManeuver
    if(!evaluateManeuver(sc,defA,defB).hit) continue;
    const sol=solutionTracks(sc); if(!sol) continue;
    sc.solution=sol; return sc;
  }
  return null;
}
function currentScenario(){
  if(st.idx<0){ const sc=buildScenario(); if(!sc){st.hist=[];st.idx=-1;return null;} st.hist=[sc]; st.idx=0; }
  return st.hist[st.idx];
}
function initSim(){
  const sc=currentScenario(); if(!sc){sim=null;return;}
  sim={ sc, answered:false, running:false, rewarded:false,
    hA:rayToEdge({x:sc.A.x,y:sc.A.y},sc.A.heading),
    hB:rayToEdge({x:sc.B.x,y:sc.B.y},sc.B.heading),
    drag:null };
}

/* ---------- ציור ---------- */
function arrow(from,to,col,solid){
  const d=norm(vec(from,to)); const tip=to; const back={x:tip.x-d.x*12,y:tip.y-d.y*12};
  const perp={x:-d.y,y:d.x};
  return `<g><line x1="${from.x}" y1="${from.y}" x2="${to.x}" y2="${to.y}" stroke="${col}" stroke-width="2.5" ${solid?'':'stroke-dasharray="6 5"'} opacity=".9"/>
    <polygon points="${tip.x},${tip.y} ${back.x+perp.x*6},${back.y+perp.y*6} ${back.x-perp.x*6},${back.y-perp.y*6}" fill="${col}"/></g>`;
}
/* לילה: רואים רק אורות — גוף כמעט בלתי נראה */
function nightVesselTop(x,y,dir,boat){
  const ang=Math.atan2(dir.y,dir.x)*180/Math.PI;
  const v=Draw.vById(boat.vid);
  let g=`<polygon points="20,0 7,-9 -17,-8 -19,0 -17,8 7,9" fill="#0a1622" stroke="#12283a" stroke-width="1"/>`;
  const glow=(cx,cy,col)=>`<circle cx="${cx}" cy="${cy}" r="6" fill="${col}" opacity=".22"/><circle cx="${cx}" cy="${cy}" r="2.7" fill="${col}" style="filter:drop-shadow(0 0 4px ${col})"/>`;
  g+=glow(16,-6,'#ff3b30')+glow(16,6,'#22d07a')+glow(-18,0,'#fff4d6');
  // פנס תורן — רק אם הכלי אכן מציג כזה (NUC/דייג לא-מכמורתן לעולם לא!)
  const hasMast=v&&v.lights.some(l=>(l.place==='masthead'||l.place==='masthead-aft')&&!l.optional);
  if(hasMast) g+=glow(3,0,'#fff4d6');
  let s=`<g transform="translate(${x},${y}) rotate(${ang})"><circle cx="0" cy="0" r="20" fill="transparent"/>${g}</g>`;
  // אורות מעגליים מזהים בלבד (ללא צורות יום — לילה!)
  if(v){
    const ar=v.lights.filter(l=>l.place==='allround'&&!l.optional).map(l=>l.color);
    if(!ar.length && v.lights.some(l=>l.place==='towing')) ar.push('yellow');
    if(ar.length){
      const tri=v.signalLayout==='triangle'&&ar.length===3;
      const gap=10, top=y-24-((tri?2:ar.length)-1)*gap;
      const dot=(cx,cy,c)=>{ const col=App.R.lightColors[c];
        return `<circle cx="${cx}" cy="${cy}" r="4" fill="${col.hex}" style="filter:drop-shadow(0 0 5px ${col.glow})"/>`; };
      if(tri) s+=dot(x,top,ar[0])+dot(x-5.5,top+9,ar[1])+dot(x+5.5,top+9,ar[2]);
      else ar.forEach((c,i)=>{ s+=dot(x,top+i*gap,c); });
    }
  }
  return s;
}
function drawBoat(sc,key,x,y,dir){
  const boat=sc[key], accent=key==='A'?COLA:COLB;
  return st.night ? nightVesselTop(x,y,dir,boat) : Draw.vesselTop(x,y,dir,accent,boat);
}
/* שושנת רוחות עתיקה: טבעת שנתות, כוכב רוחות, מחוג צפון קטן — וחץ הרוח במרכז */
function compassRose(sc){
  const cx=322, cy=44, R1=27, R2=20;
  let g=`<g opacity=".95">`;
  g+=`<circle cx="${cx}" cy="${cy}" r="${R1}" fill="${st.night?'rgba(3,17,29,.72)':'rgba(6,24,38,.6)'}" stroke="#4d748f" stroke-width="1.3"/>`;
  g+=`<circle cx="${cx}" cy="${cy}" r="${R2}" fill="none" stroke="#33536f" stroke-width=".8"/>`;
  for(let a=0;a<360;a+=22.5){
    const main=a%90===0, mid=a%45===0;
    const rIn=main?R2-3:(mid?R2:R2+2.5), rOut=R1-1.5;
    const ca=Math.cos((a-90)*Math.PI/180), sa=Math.sin((a-90)*Math.PI/180);
    g+=`<line x1="${(cx+ca*rIn).toFixed(1)}" y1="${(cy+sa*rIn).toFixed(1)}" x2="${(cx+ca*rOut).toFixed(1)}" y2="${(cy+sa*rOut).toFixed(1)}" stroke="#7fa5bd" stroke-width="${main?1.5:(mid?1:.6)}" opacity="${main?1:.7}"/>`;
  }
  // כוכב רוחות עדין ברקע
  g+=`<polygon points="${cx},${cy-R2+4} ${cx+3},${cy} ${cx},${cy+R2-4} ${cx-3},${cy}" fill="#24465c"/>`;
  g+=`<polygon points="${cx-R2+4},${cy} ${cx},${cy-3} ${cx+R2-4},${cy} ${cx},${cy+3}" fill="#24465c"/>`;
  // צפון
  g+=`<polygon points="${cx},${cy-R2+1} ${cx+2.6},${cy-R2+8} ${cx-2.6},${cy-R2+8}" fill="#ff5147"/>`;
  g+=`<text x="${cx}" y="${cy-R1-4}" fill="#9aafc4" font-size="9" font-weight="700" text-anchor="middle">N</text>`;
  // חץ הרוח — לאן הרוח נושבת
  if(sc.wind){
    const wf=norm({x:-sc.wind.x,y:-sc.wind.y});
    g+=arrow({x:cx-wf.x*(R2-3),y:cy-wf.y*(R2-3)},{x:cx+wf.x*(R2-3),y:cy+wf.y*(R2-3)},'#7fd6ff',true);
  }
  g+=`<text x="${cx}" y="${cy+R1+12}" fill="#7fd6ff" font-size="10" font-weight="700" text-anchor="middle">רוח</text></g>`;
  return g;
}
function drawBoardInner(){
  const sc=sim.sc;
  const seaCol = st.night ? '#03111d' : '#06283d';
  const gridCol= st.night ? '#092338' : '#0e3a55';
  let grid='';
  for(let i=1;i<6;i++){grid+=`<line x1="${i*60}" y1="0" x2="${i*60}" y2="${BW}" stroke="${gridCol}" stroke-width="1" opacity=".5"/>`;
    grid+=`<line x1="0" y1="${i*60}" x2="${BW}" y2="${i*60}" stroke="${gridCol}" stroke-width="1" opacity=".5"/>`;}
  // אדוות מונפשות עדינות
  let ripples='<g class="scn-ripples" opacity=".35">';
  for(let i=0;i<7;i++){ const rx=28+((i*53)%300), ry=22+((i*97)%310);
    ripples+=`<path d="M${rx-12},${ry} q6,-4 12,0 t12,0" fill="none" stroke="${st.night?'#0d2c44':'#155b82'}" stroke-width="1.4"/>`; }
  ripples+='</g>';
  // שושנת רוחות אחת בסגנון ישן: צפון מסומן בשנתות, וחץ הרוח בתוכה —
  // מקור האמת היחיד לכיוון הרוח (החץ מצביע לאן הרוח נושבת)
  const compass=compassRose(sc);
  const aArr = sim.running?'':arrow({x:sc.A.x,y:sc.A.y},sim.hA,COLA);
  const bArr = sim.running?'':arrow({x:sc.B.x,y:sc.B.y},sim.hB,COLB);
  const handle=(pt,col,key)=>sim.running?'':`<g class="handle" data-h="${key}">
     <circle cx="${pt.x}" cy="${pt.y}" r="16" fill="${col}" fill-opacity=".12"/>
     <circle cx="${pt.x}" cy="${pt.y}" r="12" fill="${col}" fill-opacity=".25" stroke="${col}" stroke-width="2"/>
     <circle cx="${pt.x}" cy="${pt.y}" r="3.5" fill="${col}"/></g>`;
  return `<rect width="${BW}" height="${BW}" fill="${seaCol}"/>${grid}${ripples}${compass}
    ${aArr}${bArr}
    ${drawBoat(sc,'A',sc.A.x,sc.A.y,sc.A.heading)}
    ${drawBoat(sc,'B',sc.B.x,sc.B.y,sc.B.heading)}
    <text x="${sc.A.x}" y="${sc.A.y+27}" fill="${COLA}" font-size="11" font-weight="700" text-anchor="middle">${App.esc(sc.A.label)}</text>
    <text x="${sc.B.x}" y="${sc.B.y+27}" fill="${COLB}" font-size="11" font-weight="700" text-anchor="middle">${App.esc(sc.B.label)}</text>
    ${handle(sim.hA,COLA,'A')}${handle(sim.hB,COLB,'B')}
    <g id="animLayer"></g>`;
}
function redrawInner(){ const s=App.$('#boardSvg'); if(s) s.innerHTML=drawBoardInner(); }

/* ---------- אינטראקציה עם הלוח ---------- */
function svgPt(evt){
  const svg=App.$('#boardSvg'),r=svg.getBoundingClientRect();
  return clampPt({x:(evt.clientX-r.left)/r.width*BW, y:(evt.clientY-r.top)/r.height*BW});
}
let winDragInstalled=false;
function bindBoard(){
  const svg=App.$('#boardSvg'); if(svg) svg.addEventListener('pointerdown',onDown);
  if(winDragInstalled)return; winDragInstalled=true;
  window.addEventListener('pointermove',onMove);
  window.addEventListener('pointerup',onUp);
}
function onDown(e){
  if(!sim||sim.running)return;
  const p=svgPt(e);
  const dA=len(vec(p,sim.hA)), dB=len(vec(p,sim.hB));
  if(Math.min(dA,dB)<=34){ sim.drag = dA<dB?'A':'B'; e.preventDefault(); return; }
  const bA=len(vec(p,{x:sim.sc.A.x,y:sim.sc.A.y})), bB=len(vec(p,{x:sim.sc.B.x,y:sim.sc.B.y}));
  if(Math.min(bA,bB)<=30){
    const key=bA<bB?'A':'B';
    if(st.night) nightIdentify(key); else openVesselInfo(sim.sc[key].vid);
    e.preventDefault();
  }
}
function onMove(e){
  if(!sim||!sim.drag||sim.running)return;
  const p=svgPt(e); if(sim.drag==='A')sim.hA=p; else sim.hB=p;
  redrawInner(); e.preventDefault();
}
function onUp(){ if(sim)sim.drag=null; }
function openVesselInfo(vid){
  const v=Draw.vById(vid); if(!v)return;
  App.openSheet(v.name, `<p>${App.esc(v.summary)}</p>
    <p class="muted" style="font-size:.86rem"><b>בלילה:</b> ${App.esc(Draw.describeNight(v))}<br><b>ביום:</b> ${App.esc(Draw.describeDay(v))}</p>
    ${v.note?`<p class="muted" style="font-size:.82rem">${App.esc(v.note)}</p>`:''}
    <p><span class="ref">${App.esc(v.ref.colreg)}</span></p>`);
}
/* מצב לילה: זיהוי כלי שיט לפי אורות — חידון קטן בגיליון.
   מסיחים רק מכלי שיט שחתימת האורות שלהם שונה באמת — אחרת ייתכנו שתי תשובות נכונות
   (למשל צלילה מול מוגבל-בתמרון: שניהם אדום-לבן-אדום). */
function nightSig(v){
  const ar=v.lights.filter(l=>l.place==='allround'&&!l.optional).map(l=>l.color).join(',');
  const mast=v.lights.some(l=>(l.place==='masthead'||l.place==='masthead-aft')&&!l.optional)?'M':'';
  const tow=v.lights.some(l=>l.place==='towing')?'T':'';
  return ar+'|'+mast+tow;
}
function nightIdentify(key){
  const v=Draw.vById(sim.sc[key].vid); if(!v)return;
  const R=App.R;
  const pool=R.vessels.filter(x=>x.id!==v.id && !x.idAmbiguous && nightSig(x)!==nightSig(v)).map(x=>x.shortName);
  const opts=App.shuffle([v.shortName].concat(App.sample(pool,3)));
  App.openSheet('זיהוי לילה — איזה כלי שיט זה?',
    `<p class="muted" style="font-size:.82rem">על סמך האורות הנראים בלוח:</p>
     <div id="nidOpts">${opts.map((o,i)=>`<button class="opt" data-i="${i}">${App.esc(o)}</button>`).join('')}</div>
     <div id="nidExp"></div>`);
  let done=false;
  App.$$('#nidOpts .opt').forEach(b=>b.addEventListener('click',()=>{
    if(done)return; done=true;
    const ok=opts[+b.dataset.i]===v.shortName;
    App.$$('#nidOpts .opt').forEach(x=>{x.disabled=true; if(opts[+x.dataset.i]===v.shortName)x.classList.add('correct');});
    if(!ok)b.classList.add('wrong');
    App.recordAnswer('lights', ok, null);
    if(ok) App.bump('nightOk');
    App.$('#nidExp').innerHTML=`<div class="explain"><span class="lbl">${v.name}</span><br>${App.esc(Draw.describeNight(v))}</div>`;
  }));
}

/* ---------- סימולציה ---------- */
function runSim(el){
  if(!sim||sim.running)return;
  if(!App.$('#boardSvg')) return;   // הלוח כבר לא על המסך (ניווט החוצה)
  sim.running=true;
  redrawInner();
  const sc=sim.sc, layer=App.$('#animLayer');
  if(!layer){ sim.running=false; return; }
  const A0={x:sc.A.x,y:sc.A.y}, B0={x:sc.B.x,y:sc.B.y};
  const dirA=norm(vec(A0,sim.hA)), dirB=norm(vec(B0,sim.hB));
  const LA=len(vec(A0,sim.hA)), LB=len(vec(B0,sim.hB));
  const spA=BASE_SPEED*(sc.A.spd||1), spB=BASE_SPEED*(sc.B.spd||1);
  const T=Math.max(LA/spA, LB/spB, 0.15);
  const posAt=(s,dir,L,sp,t)=>{ const d=Math.min(t*sp,L); return {x:s.x+dir.x*d,y:s.y+dir.y*d}; };
  let minD=1e9, hit=false, hitPt=null, lastNow=performance.now(), t=0, prevT=0, trailA='', trailB='';
  function draw(pa,pb){
    trailA+=(trailA?' L':'M')+pa.x.toFixed(1)+','+pa.y.toFixed(1);
    trailB+=(trailB?' L':'M')+pb.x.toFixed(1)+','+pb.y.toFixed(1);
    layer.innerHTML=`<path d="${trailA}" fill="none" stroke="${COLA}" stroke-width="2" opacity=".45"/>
      <path d="${trailB}" fill="none" stroke="${COLB}" stroke-width="2" opacity=".45"/>
      ${hitPt?`<circle cx="${hitPt.x}" cy="${hitPt.y}" r="26" fill="#e2483d" opacity=".3"/><circle cx="${hitPt.x}" cy="${hitPt.y}" r="18" fill="#e2483d" opacity=".55"/><circle cx="${hitPt.x}" cy="${hitPt.y}" r="10" fill="#ffd9d5"/>`:''}
      ${drawBoat(sc,'A',pa.x,pa.y,dirA)}${drawBoat(sc,'B',pb.x,pb.y,dirB)}`;
  }
  function frame(now){
    if(!layer.isConnected){ sim.running=false; return; }
    // אינטגרציה מצטברת — שינוי מהירות ההדמיה תוך כדי ריצה לא "משגר" את הסירות
    t=Math.min(T, t+Math.max(0,(now-lastNow))/1000*st.speed*PLAY_SCALE); lastNow=now;
    const sub=Math.max(1,Math.ceil((t-prevT)/(1/120)));
    for(let i=1;i<=sub && !hit;i++){ const tt=prevT+(t-prevT)*i/sub;
      const a=posAt(A0,dirA,LA,spA,tt), b=posAt(B0,dirB,LB,spB,tt), dd=len(vec(a,b));
      if(dd<minD)minD=dd;
      if(dd<HIT_DIST){ hit=true; hitPt={x:(a.x+b.x)/2,y:(a.y+b.y)/2}; }
    }
    prevT=t;
    const pa=posAt(A0,dirA,LA,spA,t), pb=posAt(B0,dirB,LB,spB,t);
    draw(pa,pb);
    if(hit){
      sim.running=false;
      const board=App.$('#board'); if(board){ board.classList.remove('shake'); void board.offsetWidth; board.classList.add('shake'); }
      App.haptic('bad'); App.sfx('bad');
      showEvaluation(sc); return;
    }
    if(t<T){ requestAnimationFrame(frame); }
    else { sim.running=false; showEvaluation(sc); }
  }
  requestAnimationFrame(frame);
}
function showEvaluation(sc){
  const ev=evaluateManeuver(sc), v=App.$('#verdict');
  if(!v)return;
  const item=it=>`<div class="chk ${it.ok?'ok':'no'}"><span>${it.ok?'✓':'✗'}</span><span>${App.esc(it.t)}</span></div>`;
  const col=key=>`<div class="evcol"><div class="evhead" style="color:var(${key==='A'?'--scnA':'--scnB'})">${App.esc(sc[key].label)} — ${App.esc(Draw.vById(sc[key].vid).shortName)}<br><span style="font-weight:600;opacity:.85">${sc.expected[key].role==='stand-on'?'שומר נתיב':'נותן זכות קדימה'}</span></div>${ev[key].map(item).join('')}</div>`;
  // אות קול נלווה לתמרון של נותני זכות הקדימה
  let snd='';
  ['A','B'].forEach(k=>{
    const sig=turnSignal(sc,k,k==='A'?sim.hA:sim.hB);
    if(sig && ev[k].every(x=>x.ok)) snd+=`<div class="chk ok" style="align-items:center"><span style="color:var(--brass)">${App.icon('horn',14)}</span>
      <span>${App.esc(sc[k].label)}: ${App.esc(sig.txt)} <b style="font-family:var(--mono)">${sig.pat}</b>
      <button class="btn mini" data-snd="${sig.audio.join('')}" style="margin-inline-start:6px">▶</button></span></div>`;
  });
  v.className='verdict show '+(ev.allOk?'safe':'hit');
  v.innerHTML=`<div class="evtop">${ev.allOk?'✓ תמרון נכון לפי התקנות!':'✗ התמרון אינו תקין — ראו פירוט'}</div>
    <div class="evgrid">${col('A')}${col('B')}</div>${item(ev.coll)}${snd}`;
  App.$$('[data-snd]',v).forEach(b=>b.addEventListener('click',()=>{
    App.playSeq(b.dataset.snd.split(''));
  }));
  if(ev.allOk){
    App.sfx('good'); App.haptic('good');
    if(!sim.rewarded){ sim.rewarded=true; App.addXP(20); App.bump('scenarioOk'); App.toast('תמרון מושלם! ‎+20 XP'); App.confetti(50); }
  }
}

/* ---------- תצוגה ---------- */
function chipsBar(){
  const chips=SCN_TYPES().map(t=>`<button class="chip" data-vid="${t.vid}" aria-pressed="${st.types.has(t.vid)}">${App.esc(t.label)}</button>`).join('');
  return `<details class="typesel" ${st.typeselOpen?'open':''}>
    <summary>סוגי כלי שיט בתרחיש · נבחרו ${st.types.size}/${SCN_TYPES().length}</summary>
    <div class="chipbar">${chips}</div>
    <div class="row" style="padding:8px 12px 12px"><button class="btn ghost mini" id="selAll">בחר הכל</button><button class="btn ghost mini" id="selNone">נקה</button></div>
  </details>`;
}
function bindChips(el){
  const det=App.$('.typesel',el); if(det) det.addEventListener('toggle',()=>{st.typeselOpen=det.open;});
  App.$$('.chip[data-vid]',el).forEach(c=>c.addEventListener('click',()=>{
    const vid=c.dataset.vid;
    if(st.types.has(vid)) st.types.delete(vid); else st.types.add(vid);
    regen(el);
  }));
  const sa=App.$('#selAll',el), sn=App.$('#selNone',el);
  if(sa) sa.addEventListener('click',()=>{st.types=new Set(SCN_TYPES().map(t=>t.vid));regen(el);});
  if(sn) sn.addEventListener('click',()=>{st.types=new Set();regen(el);});
}
function regen(el){ st.hist=[]; st.idx=-1; sim=null; paint(el); }
function newScenario(el){ const sc=buildScenario(); if(sc){st.hist.push(sc); st.idx=st.hist.length-1;} sim=null; paint(el); }
function prevScenario(el){ if(st.idx>0){ st.idx--; sim=null; paint(el); } }

function helpSheet(){
  App.openSheet('איך משחקים?', `
    <p><b>1.</b> התבוננו בתרחיש — מי רואה את מי, מאיזה כיוון, ומה סוג כל כלי שיט (לחצו על כלי שיט לזיהוי).</p>
    <p><b>2.</b> ענו על שאלת זכות הקדימה למטה.</p>
    <p><b>3.</b> גררו את העיגולים כדי לשרטט את הנתיב של כל כלי שיט, ולחצו «בדוק תמרון» — הסימולציה תריץ את שני הכלים ותבדוק את התמרון לפי התקנות (פעולה ברורה, כיוון פנייה, מעבר מאחורי הכלי השני, ושמירת נתיב של ה‑stand‑on).</p>
    <p><b>מצב לילה:</b> רואים רק אורות! לחיצה על כלי שיט פותחת חידון זיהוי.</p>`);
}

function paint(el){
  if(!st.types) st.types=new Set(SCN_TYPES().map(t=>t.vid));
  const head=`<div class="section-title"><h2>תרחישי זכות קדימה</h2>
    <span class="grow"></span>
    <button class="btn mini ${st.night?'primary':''}" id="nightBtn">${App.icon(st.night?'moon':'sun',15)} ${st.night?'לילה':'יום'}</button>
    <button class="btn mini ghost" id="helpBtn">?</button>
    </div>${chipsBar()}`;
  const cur=currentScenario();
  if(!cur){
    el.innerHTML=head+`<div class="card" style="padding:20px;text-align:center;color:var(--ink-dim);margin-top:12px">לא ניתן ליצור תרחיש מהבחירה הנוכחית.<br>בחרו לפחות סוג אחד שיכול לתמרן: <b>ממונע</b> / <b>מפרשית</b> / <b>דיג</b>.</div>`;
    bindChips(el);
    App.$('#nightBtn').addEventListener('click',()=>{st.night=!st.night;paint(el);});
    App.$('#helpBtn').addEventListener('click',helpSheet);
    return;
  }
  if(!sim||sim.sc!==cur) initSim();
  const sc=sim.sc;
  const opts=['כלי שיט א׳ נותן זכות קדימה','כלי שיט ב׳ נותן זכות קדימה','שני כלי השיט מתמרנים','אף אחד — שמירת נתיב'];
  const correctIdx = sc.giveWay==='A'?0 : sc.giveWay==='B'?1 : sc.giveWay==='both'?2 : 3;
  el.innerHTML=head+`
    <div class="scn-head">
      <button class="iconbtn" id="prevScn" aria-label="הקודם" title="תרחיש קודם">›</button>
      <div class="t">${App.esc(sc.title)} <span class="ref">${App.esc(sc.ref.colreg)}</span></div>
      <button class="iconbtn" id="newScn" aria-label="תרחיש חדש" title="תרחיש חדש">↻</button>
    </div>
    <div class="board" id="board"><svg id="boardSvg" viewBox="0 0 ${BW} ${BW}">${drawBoardInner()}</svg><svg class="windovl" id="windOvl" viewBox="0 0 ${BW} ${BW}" aria-hidden="true"></svg></div>
    <div class="row" style="margin-top:10px">
      <button class="btn primary" id="simBtn">▶ בדוק תמרון</button>
      <button class="btn" id="solBtn">הצג פתרון</button>
      <button class="btn ghost" id="resetBtn">איפוס</button>
      <button class="btn" id="nextScn" style="margin-inline-start:auto">הבא ←</button>
    </div>
    <label class="spd">מהירות הדמיה
      <input type="range" id="spdRange" min="0.5" max="4" step="0.5" value="${st.speed}">
      <span class="val" id="spdVal">×${st.speed}</span></label>
    <div class="verdict" id="verdict"></div>
    <div class="card quiz" style="margin-top:14px">
      <div class="qtext">מי נותן זכות קדימה (give‑way)?</div>
      <div id="scnOpts">${opts.map((o,i)=>`<button class="opt" data-i="${i}" ${sim.answered?'disabled':''}>${App.esc(o)}</button>`).join('')}</div>
      <div id="scnExp"></div>
    </div>`;
  bindChips(el);
  App.$('#nightBtn').addEventListener('click',()=>{st.night=!st.night;paint(el);});
  App.$('#helpBtn').addEventListener('click',helpSheet);
  App.$('#prevScn').addEventListener('click',()=>prevScenario(el));
  App.$('#newScn').addEventListener('click',()=>newScenario(el));
  App.$('#nextScn').addEventListener('click',()=>newScenario(el));
  App.$('#resetBtn').addEventListener('click',()=>{initSim();redrawInner();App.$('#verdict').className='verdict';});
  App.$('#simBtn').addEventListener('click',()=>runSim(el));
  App.$('#solBtn').addEventListener('click',()=>{sim.hA={...sc.solution.A};sim.hB={...sc.solution.B};redrawInner();setTimeout(()=>runSim(el),250);});
  const sr=App.$('#spdRange'); sr.addEventListener('input',()=>{st.speed=+sr.value;App.$('#spdVal').textContent='×'+sr.value;});
  App.$$('#scnOpts .opt').forEach(b=>b.addEventListener('click',()=>{
    if(sim.answered)return; sim.answered=true;
    const i=+b.dataset.i;
    App.$$('#scnOpts .opt').forEach((x,k)=>{x.disabled=true;if(k===correctIdx)x.classList.add('correct');});
    const ok=i===correctIdx;
    if(!ok)b.classList.add('wrong');
    App.recordAnswer('scenarios', ok, null);
    App.$('#scnExp').innerHTML=`<div class="explain"><span class="lbl">הסבר</span><br>${App.esc(sc.explain)}</div>`;
  }));
  bindBoard();
  startWind();
}

/* ---------- חלקיקי רוח: פסים נסחפים בכיוון שאליו נושבת הרוח ---------- */
let windTok=0;
function startWind(){
  const tok=++windTok;
  const ovl=App.$('#windOvl');
  if(!ovl||!sim||!sim.sc.wind) return;
  if(matchMedia('(prefers-reduced-motion:reduce)').matches) return;
  const to=norm({x:-sim.sc.wind.x,y:-sim.sc.wind.y});   // sc.wind מצביע אל מקור הרוח
  const P=[];
  for(let i=0;i<16;i++) P.push({x:Math.random()*BW, y:Math.random()*BW,
    sp:24+Math.random()*34, o:.10+Math.random()*.22, len:9+Math.random()*13});
  let last=performance.now();
  (function step(now){
    if(tok!==windTok || !ovl.isConnected) return;
    const dt=Math.min(.05,(now-last)/1000); last=now;
    const col = st.night ? '#39607d' : '#a5d8f2';
    let h='';
    P.forEach(p=>{
      p.x+=to.x*p.sp*dt; p.y+=to.y*p.sp*dt;
      if(p.x<-16)p.x=BW+16; else if(p.x>BW+16)p.x=-16;
      if(p.y<-16)p.y=BW+16; else if(p.y>BW+16)p.y=-16;
      h+=`<line x1="${p.x.toFixed(1)}" y1="${p.y.toFixed(1)}" x2="${(p.x-to.x*p.len).toFixed(1)}" y2="${(p.y-to.y*p.len).toFixed(1)}" stroke="${col}" stroke-width="1.4" stroke-linecap="round" opacity="${p.o}"/>`;
    });
    ovl.innerHTML=h;
    requestAnimationFrame(step);
  })(last);
}

App.registerView('scenarios',{render(el){ paint(el); }});
})();
