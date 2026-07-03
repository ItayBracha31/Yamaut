/* ============================================================================
   ימאות — draw.js: ציור SVG משותף (כלי שיט, מצופים, דגלים, סירות במבט־על).
   כל הפונקציות קוראות מ-window.SEA_RULES דרך App.R — כך שהציור תמיד נאמן לנתונים.
   ========================================================================== */
(function(){
"use strict";
const D = window.Draw = {};
const esc = s=>App.esc(s);
const R = ()=>App.R;

/* ---------- תיאורי טקסט הנגזרים מהנתונים ---------- */
D.describeNight = v=>{
  if(v.nightDesc) return v.nightDesc;
  const L=v.lights.filter(l=>!l.optional), parts=[];
  if(L.some(l=>l.place==='anchor')) parts.push('פנס עוגן מעגלי לבן');
  const ar=L.filter(l=>l.place==='allround');
  if(ar.length===1) parts.push('פנס מעגלי '+R().lightColors[ar[0].color].name);
  else if(ar.length>1) parts.push(ar.length+' פנסים מעגליים זה מעל זה ('+ar.map(l=>R().lightColors[l.color].name).join('‑')+')');
  const mh=L.filter(l=>l.place==='masthead'||l.place==='masthead-aft').length;
  if(mh===1) parts.push('פנס תורן'); else if(mh>1) parts.push(mh+' פנסי תורן');
  if(L.some(l=>l.place==='sidelight-stbd'||l.place==='sidelight-port')) parts.push('פנסי צד (ירוק‑ימין, אדום‑שמאל)');
  if(L.some(l=>l.place==='stern')) parts.push('פנס ירכתיים');
  if(L.some(l=>l.place==='towing')) parts.push('פנס גרירה צהוב מעל הירכתיים');
  return parts.join(', ');
};
const SHNAME = D.SHNAME = {ball:'כדור','cone-up':'חרוט (קודקוד למעלה)','cone-down':'חרוט (קודקוד למטה)',diamond:'מעוין',cylinder:'גליל'};
D.describeDay = v=>{
  if(v.dayFlag && !v.shapes.length) return 'דגל '+v.dayFlag+' (Alpha) נוקשה, בגובה ≥1 מ׳';
  if(!v.shapes.length) return 'אין צורות יום';
  const n=v.shapes.map(s=>SHNAME[s.shape]);
  if(v.shapes.length>=2) return v.shapes.length+' צורות זו מעל זו: '+n.join('‑');
  return n[0]+' שחור';
};
D.flagByLetter = l=> R().flags && R().flags.find(f=>f.letter===l);
D.vById = id=> R().vessels.find(v=>v.id===id);

/* ---------- אורות וצורות ---------- */
D.lightSVG = (x,y,colorKey,label,desc,extra)=>{
  const c=R().lightColors[colorKey];
  return `<g class="nf-hot nf-light ${extra||''}" tabindex="0" role="button"
     data-title="${esc(label)}" data-desc="${esc(desc||'')}">
     <circle class="nf-halo" cx="${x}" cy="${y}" r="15" fill="${c.glow}"/>
     <circle cx="${x}" cy="${y}" r="7.5" fill="${c.hex}" stroke="rgba(255,255,255,.6)" stroke-width="1"/></g>`;
};
D.shapePath = (x,y,kind)=>{
  const s=12;
  switch(kind){
    case 'ball':      return `<circle cx="${x}" cy="${y}" r="${s}" />`;
    case 'cone-up':   return `<polygon points="${x},${y-s} ${x-s},${y+s} ${x+s},${y+s}" />`;
    case 'cone-down': return `<polygon points="${x},${y+s} ${x-s},${y-s} ${x+s},${y-s}" />`;
    case 'diamond':   return `<polygon points="${x},${y-s-1} ${x+s},${y} ${x},${y+s+1} ${x-s},${y}" />`;
    case 'cylinder':  return `<rect x="${x-s+2}" y="${y-s-2}" width="${(s-2)*2}" height="${(s+2)*2}" rx="2" />`;
  }
  return '';
};
D.shapeSVG = (x,y,kind,label,desc)=>
  `<g class="nf-hot nf-shape" tabindex="0" role="button" fill="#14181c" stroke="rgba(255,255,255,.5)" stroke-width="1.3"
     data-title="${esc(label)}" data-desc="${esc(desc||'')}">${D.shapePath(x,y,kind)}</g>`;

/* ---------- כלי שיט במבט צד ---------- */
D.buildVesselSVG = (v,mode)=>{
  const sky = mode==='day' ? 'url(#skyDay)' : (mode==='night'?'url(#skyNight)':'url(#skyDusk)');
  const W=400,H=340,water=250, mast=235;
  let g='';
  // גוף + תא + תורן (חרטום מימין)
  g+=`<polygon points="95,230 300,230 332,242 300,254 120,254 95,242" fill="#10202e" stroke="#2c4a66" stroke-width="1.4"/>`;
  g+=`<rect x="150" y="212" width="74" height="19" rx="3" fill="#16293a" stroke="#2c4a66" stroke-width="1"/>`;
  g+=`<line x1="${mast}" y1="231" x2="${mast}" y2="72" stroke="#3a5a78" stroke-width="2.4"/>`;

  if(v.sail){
    g+=`<polygon points="${mast},96 ${mast},226 152,208" fill="rgba(236,227,206,.85)" stroke="#9fb0c0" stroke-width="1"/>`;
    g+=`<line x1="${mast}" y1="226" x2="152" y2="208" stroke="#6d5a3a" stroke-width="2.2"/>`;
    g+=`<g opacity=".9"><line x1="60" y1="96" x2="116" y2="96" stroke="#cfe6ff" stroke-width="2"/>`+
       `<polygon points="116,96 108,92 108,100" fill="#cfe6ff"/>`+
       `<text x="62" y="86" fill="#cfe6ff" font-size="13">רוח</text></g>`;
  }

  // ערימת פנסים מעגליים בראש התורן (מלמעלה למטה)
  const ar=v.lights.filter(l=>l.place==='allround');
  let y=82;
  ar.forEach(l=>{ g+=D.lightSVG(mast,y,l.color,l.label,l.desc,l.optional?'nf-opt':'');
    if(l.optional){g+=`<circle cx="${mast}" cy="${y}" r="15" fill="none" stroke="#d9a441" stroke-width="1" stroke-dasharray="3 3" opacity=".7"/>`;}
    y+=26; });

  // פנסי תורן: 'stack' (גורר — זה מעל זה באותו תורן) או 'aft' (כלי ≥50 מ׳ —
  // קדמי נמוך ליד החרטום + אחורי גבוה בתורן הראשי). ברירת מחדל נגזרת מהנתונים.
  const mhAft=v.lights.find(l=>l.place==='masthead-aft');
  const mh   =v.lights.find(l=>l.place==='masthead');
  const layout = v.mastheadLayout || (v.lights.some(l=>l.place==='towing') ? 'stack' : 'aft');
  if(mh && mhAft && layout==='aft'){
    g+=`<line x1="292" y1="231" x2="292" y2="172" stroke="#3a5a78" stroke-width="2"/>`; // תורן קדמי
    g+=D.lightSVG(292,166,mh.color,mh.label,mh.desc||'פנס התורן הקדמי — נמוך מהאחורי.');
    g+=D.lightSVG(mast,132,mhAft.color,mhAft.label,mhAft.desc||'פנס התורן האחורי — גבוה מהקדמי.');
  } else if(mh && !mhAft && ar.length && v.giveWayClass==='fishing'){
    // מכמורתן: פנס התורן אחורי וגבוה מהפנסים המעגליים (תקנה 26(ב)) — תורן אחורי נפרד
    g+=`<line x1="168" y1="231" x2="168" y2="72" stroke="#3a5a78" stroke-width="2"/>`;
    g+=D.lightSVG(168,66,mh.color,mh.label,mh.desc);
    if(mh.optional) g+=`<circle cx="168" cy="66" r="15" fill="none" stroke="#d9a441" stroke-width="1" stroke-dasharray="3 3" opacity=".7"/>`;
  } else {
    if(mhAft) g+=D.lightSVG(mast,142,mhAft.color,mhAft.label,mhAft.desc);
    if(mh)    g+=D.lightSVG(mast,170,mh.color,mh.label,mh.desc);
  }

  const an=v.lights.find(l=>l.place==='anchor');
  if(an) g+=D.lightSVG(252,168,an.color,an.label,an.desc);
  const sp=v.lights.find(l=>l.place==='sidelight-port');
  const ss=v.lights.find(l=>l.place==='sidelight-stbd');
  if(sp) g+=D.lightSVG(300,222,sp.color,sp.label,sp.desc||'אור אדום בצד שמאל (port).');
  if(ss) g+=D.lightSVG(316,222,ss.color,ss.label,ss.desc||'אור ירוק בצד ימין (starboard).');
  const st=v.lights.find(l=>l.place==='stern');
  if(st) g+=D.lightSVG(100,222,st.color,st.label,st.desc||'אור לבן בירכתיים.');
  const tw=v.lights.find(l=>l.place==='towing');
  if(tw) g+=D.lightSVG(100,202,tw.color,tw.label,tw.desc);

  // צורות יום — בערימה על מיתר מעט אחורי לתורן
  let sy=86;
  v.shapes.filter(s=>s.place!=='fwd').forEach(s=>{ g+=D.shapeSVG(205,sy,s.shape,s.label,s.desc); sy+=30; });
  v.shapes.filter(s=>s.place==='fwd').forEach(s=>{ g+=D.shapeSVG(292,176,s.shape,s.label,s.desc); });
  if(v.dayFlag){ const f=D.flagByLetter(v.dayFlag);
    if(f) g+=`<g class="nf-hot nf-shape" tabindex="0" role="button" data-title="${esc('דגל '+f.letter+' (Alpha) — אות יום')}" data-desc="${esc(f.meaning+' (העתק נוקשה בגובה ≥1 מ׳)')}">
      <svg x="184" y="72" width="44" height="30">${D.drawFlag(f)}</svg></g>`; }
  if(v.sideLights){ ['port','stbd'].forEach(k=>{ const xs=k==='port'?140:312, lbl=k==='port'?'צד המכשול':'צד המעבר';
    (v.sideLights[k]||[]).forEach((c,i)=>{ g+=D.lightSVG(xs,116+i*24,c,'פנס '+lbl,(k==='port'?'שני פנסים אדומים בצד שבו נמצא המכשול.':'שני פנסים ירוקים בצד שבו מותר לעבור.')); }); }); }
  if(v.sideShapes){ ['port','stbd'].forEach(k=>{ const xs=k==='port'?165:288, lbl=k==='port'?'מכשול':'מעבר';
    (v.sideShapes[k]||[]).forEach((sh,i)=>{ g+=D.shapeSVG(xs,114+i*28,sh,lbl,(k==='port'?'שני כדורים = צד המכשול (אל תעבור).':'שני מעוינים = הצד הבטוח למעבר.')); }); }); }

  // שמיים: כוכבים בלילה, שמש ביום (קישוט עדין)
  let deco='';
  if(mode==='night'){
    deco='<g fill="#cfe0ff" opacity=".8">'+
      [[30,40,1.2],[70,24,.9],[120,54,1],[330,30,1.1],[370,60,.8],[190,26,.9],[300,64,.7]]
      .map(p=>`<circle cx="${p[0]}" cy="${p[1]}" r="${p[2]}"/>`).join('')+'</g>'+
      `<circle cx="352" cy="38" r="13" fill="#e8ecf4" opacity=".9"/><circle cx="346" cy="34" r="12" fill="url(#skyNight)"/>`;
  } else if(mode==='day'){
    deco=`<circle cx="352" cy="40" r="16" fill="#ffd23b" opacity=".95"/>`+
      `<g fill="#ffffff" opacity=".85"><ellipse cx="80" cy="42" rx="26" ry="9"/><ellipse cx="102" cy="36" rx="18" ry="7"/></g>`;
  }

  return `<svg viewBox="0 0 ${W} ${H}" data-mode="${mode}" role="img" aria-label="${esc(v.name)}">
    <defs>
      <linearGradient id="skyDay" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#bfe3ff"/><stop offset="1" stop-color="#e8f5ff"/></linearGradient>
      <linearGradient id="skyNight" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#04101d"/><stop offset="1" stop-color="#0a2236"/></linearGradient>
      <linearGradient id="skyDusk" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#26425f"/><stop offset="1" stop-color="#3c5d80"/></linearGradient>
      <filter id="nfglow" x="-60%" y="-60%" width="220%" height="220%"><feGaussianBlur stdDeviation="4"/></filter>
    </defs>
    <rect x="0" y="0" width="${W}" height="${water}" fill="${sky}"/>
    ${deco}
    <rect x="0" y="${water}" width="${W}" height="${H-water}" fill="#06283d"/>
    <path d="M0,${water} Q100,${water-6} 200,${water} T400,${water}" fill="none" stroke="#0e3a55" stroke-width="2" opacity=".7"/>
    <style>.nf-halo{filter:url(#nfglow)}</style>
    ${g}
  </svg>`;
};

/* ---------- מצופים ---------- */
const CMAP = D.CMAP = {red:'#ff3b30',green:'#22d07a',white:'#fff4d6',yellow:'#ffd23b',blue:'#2f7bff',black:'#0c1014'};
function hashStr(s){let h=0;for(let i=0;i<s.length;i++)h=(h*31+s.charCodeAt(i))|0;return h;}
function buoyBody(day){
  const shape=day.shape;
  let clipPath,outline;
  if(shape==='can'){ clipPath=`<rect x="38" y="66" width="44" height="90" rx="4"/>`; outline=`<rect x="38" y="66" width="44" height="90" rx="4" fill="none" stroke="#0a0d11" stroke-width="2"/>`; }
  else if(shape==='cone'){ clipPath=`<polygon points="60,60 36,156 84,156"/>`; outline=`<polygon points="60,60 36,156 84,156" fill="none" stroke="#0a0d11" stroke-width="2"/>`; }
  else if(shape==='sphere'){ clipPath=`<circle cx="60" cy="118" r="40"/>`; outline=`<circle cx="60" cy="118" r="40" fill="none" stroke="#0a0d11" stroke-width="2"/>`; }
  else { clipPath=`<path d="M48,66 h24 v74 l10,16 h-44 l10,-16 z"/>`; outline=`<path d="M48,66 h24 v74 l10,16 h-44 l10,-16 z" fill="none" stroke="#0a0d11" stroke-width="2"/>`; }
  const top=60,bot=158,h=bot-top,c=day.color;
  let fill='';
  const horiz=parts=>{ const bh=h/parts.length; parts.forEach((col,i)=>{ fill+=`<rect x="30" y="${top+i*bh}" width="60" height="${bh+1}" fill="${CMAP[col]||col}"/>`; }); };
  const vert=parts=>{ const bw=60/parts.length; parts.forEach((col,i)=>{ fill+=`<rect x="${30+i*bw}" y="${top}" width="${bw+1}" height="${h}" fill="${CMAP[col]||col}"/>`; }); };
  if(c==='red')horiz(['red']);
  else if(c==='green')horiz(['green']);
  else if(c==='yellow')horiz(['yellow']);
  else if(c==='black-over-yellow')horiz(['black','yellow']);
  else if(c==='yellow-over-black')horiz(['yellow','black']);
  else if(c==='black-yellow-black')horiz(['black','yellow','black']);
  else if(c==='yellow-black-yellow')horiz(['yellow','black','yellow']);
  else if(c==='black-red-black')horiz(['black','red','black']);
  else if(c==='red-white-vert')vert(['red','white','red','white']);
  else if(c==='blue-yellow-vert')vert(['blue','yellow','blue','yellow','blue','yellow']);
  else if(c==='red-green-red')horiz(['red','green','red']);
  else if(c==='green-red-green')horiz(['green','red','green']);
  else horiz(['black']);
  const cid='clip-'+day.shape+'-'+Math.abs(hashStr(c));
  return `<g><clipPath id="${cid}">${clipPath}</clipPath>
    <g clip-path="url(#${cid})">${fill}</g>${outline}</g>`;
}
function topmarkSVG(tm){
  if(!tm)return'';
  const cx=60;
  const conesUp=y=>`<polygon points="${cx},${y} ${cx-9},${y+15} ${cx+9},${y+15}" fill="#0c1014"/>`;
  const conesDn=y=>`<polygon points="${cx},${y+15} ${cx-9},${y} ${cx+9},${y} " fill="#0c1014"/>`;
  switch(tm){
    case 'cones-up':   return conesUp(18)+conesUp(35);
    case 'cones-down': return conesDn(18)+conesDn(35);
    case 'cones-base': return conesUp(16)+conesDn(34);
    case 'cones-point':return conesDn(16)+conesUp(34);
    case 'two-balls':  return `<circle cx="${cx}" cy="26" r="8" fill="#0c1014"/><circle cx="${cx}" cy="46" r="8" fill="#0c1014"/>`;
    case 'one-ball-red':return `<circle cx="${cx}" cy="40" r="9" fill="#ff3b30"/>`;
    case 'x-yellow':   return `<g stroke="#ffd23b" stroke-width="5"><line x1="${cx-12}" y1="26" x2="${cx+12}" y2="50"/><line x1="${cx+12}" y1="26" x2="${cx-12}" y2="50"/></g>`;
    case 'cross-yellow':return `<g stroke="#ffd23b" stroke-width="5"><line x1="${cx}" y1="22" x2="${cx}" y2="54"/><line x1="${cx-15}" y1="38" x2="${cx+15}" y2="38"/></g>`;
    case 'can-red':    return `<rect x="${cx-8}" y="26" width="16" height="16" fill="#ff3b30" stroke="#0a0d11"/>`;
    case 'cone-up-green': return `<polygon points="${cx},24 ${cx-10},42 ${cx+10},42" fill="#22d07a" stroke="#0a0d11"/>`;
  }
  return '';
}
D.buildMarkSVG = m=>
  `<svg viewBox="0 0 120 200" role="img" aria-label="${esc(m.name)}">
    <rect x="0" y="168" width="120" height="32" fill="#06283d"/>
    <path d="M0,170 Q30,166 60,170 T120,170" stroke="#0e3a55" stroke-width="2" fill="none"/>
    <line x1="60" y1="58" x2="60" y2="20" stroke="#33536f" stroke-width="2"/>
    ${topmarkSVG(m.day.topmark)}
    ${buoyBody(m.day)}
    <circle class="nf-marklight" data-mark="${m.id}" cx="60" cy="60" r="6" fill="#000" fill-opacity="0"/>
    <line x1="60" y1="156" x2="60" y2="172" stroke="#22384a" stroke-width="3"/>
  </svg>`;
D.markDayDesc = m=>{
  const cmap={red:'אדום',green:'ירוק',yellow:'צהוב','black-over-yellow':'שחור מעל צהוב','yellow-over-black':'צהוב מעל שחור',
    'black-yellow-black':'שחור‑צהוב‑שחור','yellow-black-yellow':'צהוב‑שחור‑צהוב','black-red-black':'שחור עם פס אדום',
    'red-white-vert':'פסים אנכיים אדום‑לבן','blue-yellow-vert':'פסים אנכיים כחול‑צהוב',
    'red-green-red':'אדום עם פס ירוק','green-red-green':'ירוק עם פס אדום'};
  const tm={'cones-up':'שני חרוטים כלפי מעלה','cones-down':'שני חרוטים כלפי מטה','cones-base':'שני חרוטים בסיס אל בסיס',
    'cones-point':'שני חרוטים קודקוד אל קודקוד','two-balls':'שני כדורים שחורים','one-ball-red':'כדור אדום',
    'x-yellow':'סימן X צהוב','cross-yellow':'צלב צהוב זקוף','can-red':'גליל אדום','cone-up-green':'חרוט ירוק'};
  let s=cmap[m.day.color]||m.day.color; if(m.day.topmark) s+=', '+tm[m.day.topmark]; return s;
};

/* מהבהב חי של אורות מצופים (רץ ברקע פעם אחת) */
function markFrames(id){const m=R().marks.find(x=>x.id===id);return m?m.light.frames:null;}
let tickerOn=false;
D.startMarkTicker = ()=>{
  if(tickerOn) return; tickerOn=true;
  (function tick(){
    const now=Date.now();
    App.$$('.nf-marklight').forEach(el=>{
      const fr=markFrames(el.dataset.mark); if(!fr)return;
      let period=0; fr.forEach(f=>period+=f.ms);
      let t=now%period, col=null;
      for(const f of fr){ if(t<f.ms){col=f.color;break;} t-=f.ms; }
      if(col){ const hex=CMAP[col]||col; el.setAttribute('fill',hex); el.setAttribute('fill-opacity','1');
        el.style.filter='drop-shadow(0 0 6px '+hex+')'; }
      else { el.setAttribute('fill-opacity','0'); el.style.filter='none'; }
    });
    requestAnimationFrame(tick);
  })();
};

/* ---------- דגלים ---------- */
D.drawFlag = f=>{
  const C=R().flagColors, W=90, H=60, col=c=>C[c]||c, d=f.design;
  let inner='';
  if(d.type==='solid') inner=`<rect width="${W}" height="${H}" fill="${col(d.color)}"/>`;
  else if(d.type==='vert'){ const w=W/d.colors.length; inner=d.colors.map((c,i)=>`<rect x="${i*w}" width="${w+0.6}" height="${H}" fill="${col(c)}"/>`).join(''); }
  else if(d.type==='horiz'){ const h=H/d.colors.length; inner=d.colors.map((c,i)=>`<rect y="${i*h}" width="${W}" height="${h+0.6}" fill="${col(c)}"/>`).join(''); }
  else if(d.type==='horiz3') inner=`<rect width="${W}" height="${H/2}" fill="${col(d.colors[0])}"/><rect y="${H/2}" width="${W}" height="${H/2}" fill="${col(d.colors[2])}"/><rect y="${H*0.25}" width="${W}" height="${H*0.5}" fill="${col(d.colors[1])}"/>`;
  else if(d.type==='square') inner=`<rect width="${W}" height="${H}" fill="${col(d.field)}"/><rect x="${W/2-15}" y="${H/2-15}" width="30" height="30" fill="${col(d.sq)}"/>`;
  else if(d.type==='circle') inner=`<rect width="${W}" height="${H}" fill="${col(d.field)}"/><circle cx="${W/2}" cy="${H/2}" r="16" fill="${col(d.dot)}"/>`;
  else if(d.type==='saltire') inner=`<rect width="${W}" height="${H}" fill="${col(d.field)}"/><g stroke="${col(d.cross)}" stroke-width="11"><line x1="0" y1="0" x2="${W}" y2="${H}"/><line x1="${W}" y1="0" x2="0" y2="${H}"/></g>`;
  else if(d.type==='cross') inner=`<rect width="${W}" height="${H}" fill="${col(d.field)}"/><g stroke="${col(d.cross)}" stroke-width="12"><line x1="${W/2}" y1="0" x2="${W/2}" y2="${H}"/><line x1="0" y1="${H/2}" x2="${W}" y2="${H/2}"/></g>`;
  else if(d.type==='diag') inner=`<polygon points="0,0 ${W},0 ${W},${H}" fill="${col(d.a)}"/><polygon points="0,0 ${W},${H} 0,${H}" fill="${col(d.b)}"/>`;
  else if(d.type==='quarters') inner=`<rect width="${W/2}" height="${H/2}" fill="${col(d.a)}"/><rect x="${W/2}" width="${W/2}" height="${H/2}" fill="${col(d.b)}"/><rect y="${H/2}" width="${W/2}" height="${H/2}" fill="${col(d.b)}"/><rect x="${W/2}" y="${H/2}" width="${W/2}" height="${H/2}" fill="${col(d.a)}"/>`;
  else if(d.type==='checker'){ inner=`<rect width="${W}" height="${H}" fill="${col(d.a)}"/>`;
    const cw=W/4,ch=H/4; for(let r=0;r<4;r++)for(let c2=0;c2<4;c2++) if((r+c2)%2) inner+=`<rect x="${c2*cw}" y="${r*ch}" width="${cw+0.5}" height="${ch+0.5}" fill="${col(d.b)}"/>`; }
  else if(d.type==='diagstripe') inner=`<rect width="${W}" height="${H}" fill="${col(d.field)}"/><polygon points="0,${H} ${W*0.25},${H} ${W},0 ${W*0.75},0" fill="${col(d.stripe)}"/>`;
  else if(d.type==='concentric') inner=`<rect width="${W}" height="${H}" fill="${col(d.colors[0])}"/><rect x="9" y="9" width="${W-18}" height="${H-18}" fill="${col(d.colors[1])}"/><rect x="22" y="18" width="${W-44}" height="${H-36}" fill="${col(d.colors[2])}"/>`;
  else if(d.type==='diamond') inner=`<rect width="${W}" height="${H}" fill="${col(d.field)}"/><polygon points="${W/2},4 ${W-8},${H/2} ${W/2},${H-4} 8,${H/2}" fill="${col(d.diamond)}"/>`;
  else if(d.type==='diagstripes'){ inner=`<rect width="${W}" height="${H}" fill="${col(d.a)}"/>`;
    for(let i=-2;i<6;i++){ const x0=i*(W/3); inner+=`<polygon points="${x0},${H} ${x0+W/6},${H} ${x0+W/6+W*0.75},0 ${x0+W*0.75},0" fill="${i%2?col(d.a):col(d.b)}"/>`; } }
  else if(d.type==='zquad') inner=`<polygon points="0,0 ${W},0 ${W/2},${H/2}" fill="${col(d.top)}"/><polygon points="${W},0 ${W},${H} ${W/2},${H/2}" fill="${col(d.left||d.side1)}"/><polygon points="0,${H} ${W},${H} ${W/2},${H/2}" fill="${col(d.bottom)}"/><polygon points="0,0 0,${H} ${W/2},${H/2}" fill="${col(d.right||d.side2)}"/>`;
  const cid='fc-'+f.letter;
  const pts = f.swallow ? `0,0 ${W},0 ${W*0.78},${H/2} ${W},${H} 0,${H}` : `0,0 ${W},0 ${W},${H} 0,${H}`;
  return `<svg viewBox="-1 -1 ${W+2} ${H+2}" role="img" aria-label="דגל ${f.letter}">
    <defs><clipPath id="${cid}"><polygon points="${pts}"/></clipPath></defs>
    <g clip-path="url(#${cid})">${inner}</g>
    <polygon points="${pts}" fill="none" stroke="#0a0d11" stroke-width="1.4"/></svg>`;
};

/* ---------- מבט־על (לתרחישים ולחידות) ---------- */
D.miniShape = (x,y,kind)=>{
  const s=4.5, f='fill="#0c1014" stroke="#cdd9e6" stroke-width=".8"';
  switch(kind){
    case 'ball':      return `<circle cx="${x}" cy="${y}" r="${s}" ${f}/>`;
    case 'cone-up':   return `<polygon points="${x},${y-s} ${x-s},${y+s} ${x+s},${y+s}" ${f}/>`;
    case 'cone-down': return `<polygon points="${x},${y+s} ${x-s},${y-s} ${x+s},${y-s}" ${f}/>`;
    case 'diamond':   return `<polygon points="${x},${y-s} ${x+s},${y} ${x},${y+s} ${x-s},${y}" ${f}/>`;
    case 'cylinder':  return `<rect x="${x-s+1}" y="${y-s-1}" width="${(s-1)*2}" height="${(s+1)*2}" rx="1" ${f}/>`;
  }
  return '';
};
D.signalBadge = (x,y,vid)=>{
  const v=vid&&D.vById(vid); if(!v)return '';
  const ar=v.lights.filter(l=>l.place==='allround'&&!l.optional);
  let lights=ar.map(l=>l.color);
  if(!lights.length && v.lights.some(l=>l.place==='towing')) lights=['yellow'];
  const shapes=v.shapes.map(s=>s.shape);
  const flagItem = v.dayFlag?1:0;
  const shapesCount = shapes.length || flagItem;
  if(!lights.length && !shapesCount) return '';
  const both=lights.length&&shapesCount;
  const rows=Math.max(lights.length,shapesCount), gap=10, top=y-24-(rows-1)*gap;
  const lx=both?x-7:x, sx=both?x+7:x;
  let g=`<line x1="${x}" y1="${y-13}" x2="${x}" y2="${top-2}" stroke="#33536f" stroke-width="1"/>`;
  lights.forEach((c,i)=>{ const cy=top+i*gap, col=R().lightColors[c];
    g+=`<circle cx="${lx}" cy="${cy}" r="4" fill="${col.hex}" stroke="#06121d" stroke-width=".7" style="filter:drop-shadow(0 0 3px ${col.glow})"/>`; });
  shapes.forEach((sh,i)=>{ g+=D.miniShape(sx,top+i*gap,sh); });
  if(flagItem){ const f=D.flagByLetter(v.dayFlag); if(f) g+=`<svg x="${sx-9}" y="${top-6}" width="18" height="12">${D.drawFlag(f)}</svg>`; }
  return g;
};
/* סירה במבט־על. dir=וקטור כיוון; accent=צבע זיהוי; boat={class,vid,windSide} */
D.vesselTop = (x,y,dir,accent,boat,opts)=>{
  opts=opts||{};
  const ang=Math.atan2(dir.y,dir.x)*180/Math.PI;
  const cls=boat.class;
  let g=`<polygon points="20,0 7,-9 -17,-8 -19,0 -17,8 7,9" fill="${accent}" stroke="#06121d" stroke-width="1.5"/>`;
  if(cls==='sail'){
    const side = boat.windSide==='stbd' ? -1 : 1;
    g+=`<line x1="4" y1="0" x2="-14" y2="${side*13}" stroke="#5b4a2e" stroke-width="2"/>`;
    g+=`<polygon points="4,0 -14,${side*13} -7,${side*2}" fill="rgba(236,227,206,.93)" stroke="#9fb0c0" stroke-width="1"/>`;
    g+=`<circle cx="4" cy="0" r="1.8" fill="#cdd9e6"/>`;
  } else {
    g+=`<rect x="-9" y="-6" width="13" height="12" rx="2" fill="#0b1822" opacity=".92"/>`;
    g+=`<circle cx="3" cy="0" r="2.6" fill="#fff4d6"/>`;
  }
  g+=`<circle cx="16" cy="-6" r="2.6" fill="#ff3b30"/><circle cx="16" cy="6" r="2.6" fill="#22d07a"/>`+
     `<circle cx="-18" cy="0" r="2.4" fill="#fff4d6"/>`;
  let s=`<g transform="translate(${x},${y}) rotate(${ang})"><circle cx="0" cy="0" r="20" fill="transparent"/>${g}</g>`;
  if(!opts.noBadge) s+=D.signalBadge(x,y,boat.vid);
  return s;
};

})();
