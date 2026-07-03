/* ============================================================================
   ימאות — boat3d.js: מציג תלת־ממד (פסאודו) של כלי שיט — אורות ניווט וצורות יום
   מכל כיוון, ביום ובלילה. מנוע זעיר משלנו: פוליגונים תלת־ממדיים, מצלמת
   פרספקטיבה מקיפה, מיון עומק (אלגוריתם הצייר) וציור על קנבס דו־ממדי.
   הנתונים נגזרים ישירות מ-App.R.vessels — כמו שאר היישום.
   ========================================================================== */
(function(){
"use strict";

const DEG = Math.PI/180;

/* ---------------- וקטורים ---------------- */
const V   = (x,y,z)=>({x,y,z});
const sub = (a,b)=>V(a.x-b.x, a.y-b.y, a.z-b.z);
const dot = (a,b)=>a.x*b.x + a.y*b.y + a.z*b.z;
const cross=(a,b)=>V(a.y*b.z-a.z*b.y, a.z*b.x-a.x*b.z, a.x*b.y-a.y*b.x);
const norm= a=>{ const l=Math.hypot(a.x,a.y,a.z)||1; return V(a.x/l,a.y/l,a.z/l); };

function hexRGB(h){
  h=h.replace('#','');
  return [parseInt(h.slice(0,2),16),parseInt(h.slice(2,4),16),parseInt(h.slice(4,6),16)];
}
const lerp=(a,b,t)=>a+(b-a)*t;
/* צבע לאחר תאורה + מעבר לילה: base=rgb, s=הארה, nk=מקדם לילה */
function shade(rgb,s,nk){
  const nR=10,nG=17,nB=28; // גוון "לילה" כהה
  const r=lerp(rgb[0]*s, nR+rgb[0]*s*0.13, nk);
  const g=lerp(rgb[1]*s, nG+rgb[1]*s*0.13, nk);
  const b=lerp(rgb[2]*s, nB+rgb[2]*s*0.16, nk);
  return 'rgb('+(r|0)+','+(g|0)+','+(b|0)+')';
}

/* מערכת צירים של הסירה: +x חרטום, +y שמאל (port), +z מעלה. ימין = ‎-y */

/* ---------------- מידות לפי כלי השיט ---------------- */
function dims(v){
  const tug = v.lights.some(l=>l.place==='towing');
  const big = v.id==='power_over_50' || v.id==='cbd';
  const sail= !!v.sail || v.giveWayClass==='sail';
  return {
    L:   big?14 : sail?10.6 : tug?10 : 11,
    HB:  sail?1.12 : tug?1.5 : big?1.5 : 1.35,   // חצי־רוחב מרבי
    FB:  big?1.3 : tug?1.05 : 0.95,              // גובה סיפון (freeboard)
    mastH: sail?9.4 : big?7.2 : tug?6.2 : 5.6,
    mastX: sail?1.3 : tug?-0.4 : 0.1,
    sail, big, tug
  };
}

/* תחנות הגוף: t=0 ירכתיים → t=1 חרטום. w=רוחב יחסי, s=קו סיפון, k=שוקע */
const ST=[
  {t:0.00,w:0.60,s:0.74,k:0.30},
  {t:0.12,w:0.80,s:0.67,k:0.42},
  {t:0.30,w:0.95,s:0.63,k:0.50},
  {t:0.50,w:1.00,s:0.63,k:0.52},
  {t:0.68,w:0.92,s:0.69,k:0.46},
  {t:0.84,w:0.68,s:0.80,k:0.34},
  {t:0.95,w:0.32,s:0.92,k:0.20},
  {t:1.00,w:0.05,s:1.02,k:0.10}
];
function hullHalfWidth(d,x){          // חצי־רוחב הגוף בגובה הסיפון בנקודה x
  const t=App.clamp(x/d.L+0.5,0,1);
  for(let i=0;i<ST.length-1;i++){
    if(t<=ST[i+1].t){
      const f=(t-ST[i].t)/(ST[i+1].t-ST[i].t||1);
      return lerp(ST[i].w,ST[i+1].w,f)*d.HB;
    }
  }
  return ST[ST.length-1].w*d.HB;
}

/* צבעי בסיס (RGB) */
const C_TOP =hexRGB('#2b4d68'), C_BOT =hexRGB('#7c332b'), C_DECK=hexRGB('#a98a5f'),
      C_CAB =hexRGB('#ded5c0'), C_ROOF=hexRGB('#b9ac90'), C_SAIL=hexRGB('#ece3ce'),
      C_TRAN=hexRGB('#26455e');

/* ---------------- בניית מודל הגוף ---------------- */
function buildModel(v){
  const d=dims(v);
  const faces=[], masts=[];
  const P=[],Sd=[],Ch=[],K=[];               // סיפון־שמאל, סיפון־ימין, כתף, שדרית
  ST.forEach(st=>{
    const x=(st.t-0.5)*d.L, w=st.w*d.HB, zT=st.s*d.FB;
    const zB=Math.max(-0.16,-st.k*0.5);
    P.push(V(x, w,zT)); Sd.push(V(x,-w,zT));
    Ch.push({p:V(x, w*0.93,0.10), s:V(x,-w*0.93,0.10)});
    K.push(V(x,0,zB));
  });
  const face=(pts,c,o)=>faces.push({pts,c,two:false,alpha:o==null?1:o});
  for(let i=0;i<ST.length-1;i++){
    face([P[i],P[i+1],Ch[i+1].p,Ch[i].p],C_TOP);              // דופן שמאל עליון
    face([Sd[i],Sd[i+1],Ch[i+1].s,Ch[i].s],C_TOP);            // דופן ימין עליון
    face([Ch[i].p,Ch[i+1].p,K[i+1],K[i]],C_BOT);              // תחתית שמאל
    face([Ch[i].s,Ch[i+1].s,K[i+1],K[i]],C_BOT);              // תחתית ימין
    face([P[i],Sd[i],Sd[i+1],P[i+1]],C_DECK);                 // סיפון
  }
  face([P[0],Ch[0].p,K[0],Ch[0].s,Sd[0]],C_TRAN);             // ירכתיים (טרנזום)

  /* קו־מים (מתאר בגובה 0) — לעיגון הסירה במים */
  const wl=[];
  ST.forEach(st=>wl.push(V((st.t-0.5)*d.L, st.w*d.HB*0.97,0.02)));
  for(let i=ST.length-1;i>=0;i--) wl.push(V((ST[i].t-0.5)*d.L,-ST[i].w*d.HB*0.97,0.02));
  const water=wl;

  /* תא / מבנה־על */
  function box(x0,x1,hw,z0,z1,cWall,cTop,slant){
    const xf=x1-(slant||0);
    const a=V(x0, hw,z0),b=V(x0,-hw,z0),c2=V(x1,-hw,z0),e=V(x1, hw,z0);
    const A=V(x0, hw,z1),B=V(x0,-hw,z1),C2=V(xf,-hw,z1),E=V(xf, hw,z1);
    face([a,e,E,A],cWall); face([b,c2,C2,B],cWall);           // דפנות
    face([e,c2,C2,E],cWall,0.92);                             // חזית (משופעת)
    face([a,b,B,A],cWall);                                    // אחור
    face([A,B,C2,E],cTop);                                    // גג
  }
  const deckZ=0.66*d.FB;
  if(d.sail){
    box(-2.2,0.9,d.HB*0.72,deckZ,deckZ+0.5,C_CAB,C_ROOF,0.5);
  }else if(d.tug){
    box(-2.6,0.4,d.HB*0.8,deckZ,deckZ+0.9,C_CAB,C_ROOF,0);
    box(-2.1,0.2,d.HB*0.62,deckZ+0.9,deckZ+1.9,C_CAB,C_ROOF,0.45);
  }else if(d.big){
    box(-5.4,-1.4,d.HB*0.82,deckZ,deckZ+1.5,C_CAB,C_ROOF,0);
    box(-4.9,-2.4,d.HB*0.6,deckZ+1.5,deckZ+2.7,C_CAB,C_ROOF,0.4);
  }else{
    box(-1.4,1.9,d.HB*0.78,deckZ,deckZ+1.0,C_CAB,C_ROOF,0.55);
  }

  /* תרנים */
  const mainTop=V(d.mastX,0,d.mastH);
  masts.push({a:V(d.mastX,0,deckZ),b:mainTop,w:0.09});
  const mhAft=v.lights.find(l=>l.place==='masthead-aft');
  const mh  =v.lights.find(l=>l.place==='masthead');
  const hasAR=v.lights.some(l=>l.place==='allround');
  const anchor=v.lights.find(l=>l.place==='anchor');
  const fwdShape=v.shapes.some(s=>s.place==='fwd');
  const layout=v.mastheadLayout||(d.tug?'stack':'aft');   // כמו ב-draw.js
  const foreX=d.L*0.31, foreH=Math.max(3.9,d.FB*3);
  const aftX=d.mastX-1.9, aftH=d.mastH+1.0;               // מכמורתן: תורן אחורי גבוה
  const mhOnFore=mh&&!mh.optional&&((mhAft&&layout==='aft')||hasAR);
  const mhOnAft =mh&&mh.optional&&hasAR;
  if(mhOnFore||anchor||fwdShape) masts.push({a:V(foreX,0,0.8*d.FB),b:V(foreX,0,foreH),w:0.07});
  if(mhOnAft) masts.push({a:V(aftX,0,deckZ),b:V(aftX,0,aftH),w:0.07});
  if(v.lights.some(l=>l.place==='anchor-aft')) masts.push({a:V(-d.L/2+0.7,0,d.FB*0.8),b:V(-d.L/2+0.7,0,2.15),w:0.06});

  /* מפרשים */
  const sails=[];
  if(d.sail){
    masts.push({a:V(d.mastX,0,1.55),b:V(d.mastX-3.5,0,1.4),w:0.07});   // מנור
    sails.push({pts:[V(d.mastX,0.07,d.mastH-0.5),V(d.mastX,0.07,1.65),V(d.mastX-3.3,0.07,1.55)],c:C_SAIL,two:true,alpha:0.94});
    sails.push({pts:[V(d.mastX+0.1,-0.1,d.mastH-1.3),V(d.L*0.5-0.4,-0.05,0.95),V(d.mastX-0.4,-0.35,1.25)],c:C_SAIL,two:true,alpha:0.9});
  }
  sails.forEach(s=>faces.push(s));

  /* ---------- מיקום אורות (מהנתונים) ---------- */
  const lights=[];
  let arI=0;
  const triangle = v.signalLayout==='triangle';
  const yardHalf=1.6, yardZ=d.mastH-1.35;
  if(triangle) masts.push({a:V(d.mastX,-yardHalf,yardZ),b:V(d.mastX,yardHalf,yardZ),w:0.07}); // זרוע קדמית
  v.lights.forEach(l=>{
    let pos=null;
    switch(l.place){
      case 'allround':
        if(triangle){ // שולת מוקשים: אחד בראש התורן, אחד בכל קצה זרוע (תקנה 27(ו))
          pos = arI===0 ? V(d.mastX,0,d.mastH+0.35)
              : V(d.mastX, arI===1?yardHalf:-yardHalf, yardZ);
          arI++; break;
        }
        pos=V(d.mastX,0,d.mastH+0.35-arI*0.95); arI++; break;
      case 'masthead':
        if(mhAft&&layout==='stack') pos=V(d.mastX,0,d.mastH-0.75); // גורר: נמוך בזוג האנכי
        else if(mhOnAft)            pos=V(aftX,0,aftH+0.15);       // מכמורתן: אחורי וגבוה
        else if(mhOnFore)           pos=V(foreX,0,foreH+0.15);     // בתורן הקדמי
        else if(d.sail)             pos=V(d.mastX,0,d.mastH*0.62); // פנס הנעה במפרשית
        else                        pos=V(d.mastX,0,d.mastH+0.3);
        break;
      case 'masthead-aft':
        pos=V(d.mastX,0,d.mastH+0.3);                             // תורן ראשי — גבוה
        break;
      case 'sidelight-stbd': pos=V(2.3,-(hullHalfWidth(d,2.3)+0.1),d.FB*0.72+0.22); break;
      case 'sidelight-port': pos=V(2.3, (hullHalfWidth(d,2.3)+0.1),d.FB*0.72+0.22); break;
      case 'stern':  pos=V(-d.L/2+0.12,0,d.FB*0.95); break;
      case 'towing': pos=V(-d.L/2+0.12,0,d.FB*0.95+1.0); break;
      case 'anchor': pos=V(foreX,0,foreH-0.55); break;
      case 'anchor-aft': pos=V(-d.L/2+0.7,0,2.1); break;    // אחורי — נמוך מהקדמי
      case 'torch':  pos=V(-0.6,0.35,d.FB+1.0); break;      // פנס יד בגובה יד
    }
    if(pos) lights.push({place:l.place,color:l.color,label:l.label,optional:!!l.optional,pos});
  });
  /* מחפר/עבודות תת-מימיות: פנסי צד-מכשול/צד-מעבר (מעגליים) על זרוע רוחבית */
  if(v.sideLights){
    const zY=d.mastH-2.35, half=1.7;
    masts.push({a:V(d.mastX,-half,zY),b:V(d.mastX,half,zY),w:0.07});
    [['stbd',-1],['port',1]].forEach(([k,sgn])=>{
      (v.sideLights[k]||[]).forEach((c,i)=>{
        lights.push({place:'side-'+k,color:c,
          label:k==='port'?'פנס צד המכשול':'פנס צד המעבר',
          optional:false,pos:V(d.mastX,sgn*half,zY+0.35-i*0.7)});
      });
    });
  }

  /* ---------- צורות יום ודגל ---------- */
  const shapes=[];
  let shI=0;
  v.shapes.forEach(s=>{
    if(s.place==='fwd') shapes.push({kind:s.shape,pos:V(foreX,0,foreH-1.15),label:s.label});
    else if(triangle){ // צורות היום של שולת מוקשים — באותם מיקומי משולש
      shapes.push({kind:s.shape,
        pos: shI===0 ? V(d.mastX,0,d.mastH+0.35) : V(d.mastX, shI===1?yardHalf:-yardHalf, yardZ),
        label:s.label}); shI++;
    }
    else { shapes.push({kind:s.shape,pos:V(d.mastX,0,d.mastH-1.1-shI*1.08),label:s.label}); shI++; }
  });
  /* מחפר: צורות צד-מכשול (כדורים) / צד-מעבר (מעוינים) על הזרוע */
  if(v.sideShapes){
    const zY=d.mastH-2.35, half=1.7;
    [['stbd',-1],['port',1]].forEach(([k,sgn])=>{
      (v.sideShapes[k]||[]).forEach((sh,i)=>{
        shapes.push({kind:sh,pos:V(d.mastX,sgn*half,zY+0.35-i*0.85),
          label:k==='port'?'צד המכשול':'צד המעבר',small:true});
      });
    });
  }
  let flag=null;
  if(v.dayFlag) flag={letter:v.dayFlag,pos:V(d.mastX,0,d.mastH-0.55)};

  return {v,d,faces,masts,lights,shapes,flag,water};
}
/* ---------------- קשתות אורות ---------------- */
/* כיוון־יחסי (bearing) מהסירה אל הצופה: 0=חרטום, 90=ימין, 180=ירכתיים, 270=שמאל */
const ARCS={
  'masthead':      {c:0,   hw:112.5},
  'masthead-aft':  {c:0,   hw:112.5},
  'sidelight-stbd':{c:56.25,hw:56.25},
  'sidelight-port':{c:303.75,hw:56.25},
  'stern':         {c:180, hw:67.5},
  'towing':        {c:180, hw:67.5}
};
function angDiff(a,b){ let x=(a-b)%360; if(x>180)x-=360; if(x<-180)x+=360; return x; }
/* עוצמת נראות 0..1 עם דעיכה של ~6° בקצות הקשת */
function arcVis(place,az){
  const a=ARCS[place];
  if(!a) return 1;                       // allround / anchor — 360°
  const inside=a.hw-Math.abs(angDiff(az,a.c));
  return App.clamp((inside+3)/6,0,1);
}

const BEAR_NAMES=[[22.5,'חרטום'],[67.5,'חרטום ימין'],[112.5,'צד ימין'],[157.5,'ירכתיים ימין'],
  [202.5,'ירכתיים'],[247.5,'ירכתיים שמאל'],[292.5,'צד שמאל'],[337.5,'חרטום שמאל'],[360.1,'חרטום']];
function bearName(az){ for(const b of BEAR_NAMES){ if(az<b[0]) return b[1]; } return 'חרטום'; }

/* ---------------- מצלמה ---------------- */
function makeCam(az,el,d,w,h){
  const B=az*DEG, E=el*DEG;
  const dist=Math.max(d.L*1.55, d.mastH*2.55);
  const eye=V(Math.cos(B)*Math.cos(E)*dist, -Math.sin(B)*Math.cos(E)*dist, Math.sin(E)*dist+1.0);
  const tgt=V(0,0,Math.min(0.42*d.mastH,1.2+el*0.045));
  const f=norm(sub(tgt,eye));
  const r=norm(cross(f,V(0,0,1)));
  const u=cross(r,f);
  return {eye,f,r,u,focal:h*1.28,cx:w/2,cy:h*0.56,w,h};
}
function project(cam,p){
  const dd=sub(p,cam.eye), z=dot(dd,cam.f);
  if(z<0.5) return null;
  return {x:cam.cx+dot(dd,cam.r)*cam.focal/z, y:cam.cy-dot(dd,cam.u)*cam.focal/z, z};
}

/* ---------------- שמיים, ים, כוכבים ---------------- */
const SKY_DT=hexRGB('#8fd0ff'),SKY_DB=hexRGB('#dff2ff'),SKY_NT=hexRGB('#030b16'),SKY_NB=hexRGB('#0d2438'),
      SEA_DT=hexRGB('#1a6a96'),SEA_DB=hexRGB('#0b3a58'),SEA_NT=hexRGB('#0a2033'),SEA_NB=hexRGB('#041018');
function mix(a,b,t){
  return 'rgb('+(lerp(a[0],b[0],t)|0)+','+(lerp(a[1],b[1],t)|0)+','+(lerp(a[2],b[2],t)|0)+')';
}
function skyGrad(ctx,w,hy,nk){
  const g=ctx.createLinearGradient(0,0,0,Math.max(hy,1));
  g.addColorStop(0,mix(SKY_DT,SKY_NT,nk)); g.addColorStop(1,mix(SKY_DB,SKY_NB,nk));
  return g;
}
function seaGrad(ctx,hy,h,nk){
  const g=ctx.createLinearGradient(0,Math.max(hy,0),0,h);
  g.addColorStop(0,mix(SEA_DT,SEA_NT,nk)); g.addColorStop(1,mix(SEA_DB,SEA_NB,nk));
  return g;
}
function makeStars(w,h){
  const s=[];
  for(let i=0;i<46;i++) s.push({x:Math.random()*w,y:Math.random()*h*0.5,r:0.4+Math.random()*1.1,ph:Math.random()*6.28});
  return s;
}

/* ---------------- ציור סצנה ---------------- */
function drawScene(ctx,cam,model,st){
  const {w,h}=cam, nk=st.nightK, t=st.time;
  /* אופק: הטלה של נקודה רחוקה בגובה פני הים */
  const hf=norm(V(cam.f.x,cam.f.y,0));
  const hp=project(cam,V(cam.eye.x+hf.x*4000,cam.eye.y+hf.y*4000,0));
  const hy=hp?App.clamp(hp.y,h*0.12,h*0.8):h*0.4;

  ctx.fillStyle=skyGrad(ctx,w,hy,nk); ctx.fillRect(0,0,w,hy);
  ctx.fillStyle=seaGrad(ctx,hy,h,nk); ctx.fillRect(0,hy,w,h-hy);

  /* שמש / ירח + כוכבים */
  const cxs=w*0.82, cys=Math.min(hy*0.4,h*0.14);
  if(nk>0.05){
    ctx.globalAlpha=nk;
    st.stars.forEach(s=>{
      const tw=st.anim?0.55+0.45*Math.sin(t*1.7+s.ph):0.8;
      if(s.y<hy-6){ ctx.globalAlpha=nk*tw; ctx.fillStyle='#cfe0ff';
        ctx.beginPath(); ctx.arc(s.x,s.y,s.r,0,6.283); ctx.fill(); }
    });
    ctx.globalAlpha=nk;
    ctx.fillStyle='#e8ecf4'; ctx.beginPath(); ctx.arc(cxs,cys,13,0,6.283); ctx.fill();
    ctx.fillStyle='rgba(9,22,38,0.92)'; ctx.beginPath(); ctx.arc(cxs-6,cys-3.5,11.5,0,6.283); ctx.fill();
    ctx.globalAlpha=1;
  }
  if(nk<0.95){
    ctx.globalAlpha=1-nk;
    const sg=ctx.createRadialGradient(cxs,cys,2,cxs,cys,34);
    sg.addColorStop(0,'#fff6cf'); sg.addColorStop(0.35,'#ffd23b'); sg.addColorStop(1,'rgba(255,210,59,0)');
    ctx.fillStyle=sg; ctx.beginPath(); ctx.arc(cxs,cys,34,0,6.283); ctx.fill();
    ctx.globalAlpha=1;
  }
  /* נצנוץ על המים מתחת לשמש/ירח */
  const glintC = nk>0.5?'rgba(214,228,255,':'rgba(255,244,214,';
  for(let i=0;i<12;i++){
    const gy=hy+4+i*((h-hy)/13);
    const jig=st.anim?Math.sin(t*1.4+i*1.9)*(3+i*1.2):0;
    const gw=(6+i*3.4)*(0.55+0.45*Math.sin(i*2.1+t*(st.anim?0.9:0)));
    ctx.fillStyle=glintC+(0.16*(1-i/14))+')';
    ctx.fillRect(cxs+jig-gw/2,gy,gw,1.4);
  }
  /* אדוות עדינות לרוחב */
  ctx.strokeStyle=nk>0.5?'rgba(120,160,200,0.10)':'rgba(255,255,255,0.13)';
  ctx.lineWidth=1;
  for(let i=1;i<=4;i++){
    const gy=hy+(h-hy)*i*0.21, ph=st.anim?t*0.7:0;
    ctx.beginPath();
    for(let x=0;x<=w;x+=14) ctx.lineTo(x,gy+Math.sin(x*0.025+ph+i)*1.7);
    ctx.stroke();
  }

  /* ---------- הסירה ---------- */
  const items=[];
  /* כתם מגע במים */
  const wpts=model.water.map(p=>project(cam,p));
  if(wpts.every(p=>p)){
    let dsum=0; wpts.forEach(p=>dsum+=p.z);
    items.push({d:dsum/wpts.length+0.35,fn:()=>{
      ctx.fillStyle=nk>0.5?'rgba(2,8,14,0.5)':'rgba(6,30,48,0.42)';
      ctx.beginPath(); wpts.forEach((p,i)=>i?ctx.lineTo(p.x,p.y+1.5):ctx.moveTo(p.x,p.y+1.5));
      ctx.closePath(); ctx.fill();
      ctx.strokeStyle=nk>0.5?'rgba(160,190,220,0.14)':'rgba(255,255,255,0.35)';
      ctx.lineWidth=1.6; ctx.stroke();
    }});
  }
  /* פאות */
  const Ldir=norm(V(cam.f.x*-0.5+cam.u.x*0.75+cam.r.x*0.3, cam.f.y*-0.5+cam.u.y*0.75+cam.r.y*0.3, cam.f.z*-0.5+cam.u.z*0.75+cam.r.z*0.3));
  model.faces.forEach(fc=>{
    const pp=[]; let dsum=0;
    for(const p of fc.pts){ const q=project(cam,p); if(!q)return; pp.push(q); dsum+=q.z; }
    const n=norm(cross(sub(fc.pts[1],fc.pts[0]),sub(fc.pts[2],fc.pts[0])));
    const s=0.42+0.58*Math.abs(dot(n,Ldir));
    items.push({d:dsum/pp.length,fn:()=>{
      ctx.globalAlpha=fc.alpha;
      ctx.fillStyle=shade(fc.c,s,nk);
      ctx.beginPath(); pp.forEach((p,i)=>i?ctx.lineTo(p.x,p.y):ctx.moveTo(p.x,p.y));
      ctx.closePath(); ctx.fill();
      ctx.strokeStyle=shade(fc.c,s*0.7,nk); ctx.lineWidth=0.6; ctx.stroke();
      ctx.globalAlpha=1;
    }});
  });
  /* תרנים */
  model.masts.forEach(m=>{
    const a=project(cam,m.a), b=project(cam,m.b);
    if(!a||!b)return;
    items.push({d:(a.z+b.z)/2-0.15,fn:()=>{
      ctx.strokeStyle=shade(hexRGB('#5d7c96'),0.9,nk);
      ctx.lineWidth=Math.max(1,m.w*cam.focal/((a.z+b.z)/2));
      ctx.lineCap='round';
      ctx.beginPath(); ctx.moveTo(a.x,a.y); ctx.lineTo(b.x,b.y); ctx.stroke();
    }});
  });
  /* קו קישוט לאורך הסיפון (sheer) */
  const sheerP=[],sheerS=[];
  ST.forEach(stn=>{
    const x=(stn.t-0.5)*model.d.L, wdt=stn.w*model.d.HB, z=stn.s*model.d.FB+0.01;
    sheerP.push(V(x,wdt,z)); sheerS.push(V(x,-wdt,z));
  });
  [sheerP,sheerS].forEach(line=>{
    const pp=line.map(p=>project(cam,p));
    if(pp.some(p=>!p))return;
    let dm=0; pp.forEach(p=>dm+=p.z);
    items.push({d:dm/pp.length-0.25,fn:()=>{
      ctx.strokeStyle=nk>0.5?'rgba(120,140,160,0.35)':'rgba(217,164,65,0.85)';
      ctx.lineWidth=1.3;
      ctx.beginPath(); pp.forEach((p,i)=>i?ctx.lineTo(p.x,p.y):ctx.moveTo(p.x,p.y)); ctx.stroke();
    }});
  });
  /* צורות יום — לוחיות הפונות תמיד למצלמה (ביום בלבד, מוצללות בלילה) */
  const shapeAlpha=1-nk*0.9;
  if(shapeAlpha>0.03){
    model.shapes.forEach(sp=>{
      const q=project(cam,sp.pos); if(!q)return;
      const s=0.55*cam.focal/q.z;
      items.push({d:q.z-0.3,fn:()=>drawShape(ctx,q,s,sp.kind,shapeAlpha)});
    });
    if(model.flag){
      const q=project(cam,model.flag.pos); if(q){
        const s=0.62*cam.focal/q.z;
        items.push({d:q.z-0.3,fn:()=>drawFlagA(ctx,q,s,shapeAlpha)});
      }
    }
  }
  items.sort((a,b)=>b.d-a.d).forEach(it=>it.fn());

  /* ---------- אורות ---------- */
  drawLights(ctx,cam,model,st);
}

function drawShape(ctx,q,s,kind,alpha){
  ctx.globalAlpha=alpha; ctx.fillStyle='#14181c';
  ctx.strokeStyle='rgba(255,255,255,0.4)'; ctx.lineWidth=1;
  ctx.beginPath();
  if(kind==='ball') ctx.arc(q.x,q.y,s,0,6.283);
  else if(kind==='cone-up'){ ctx.moveTo(q.x,q.y-s); ctx.lineTo(q.x-s,q.y+s); ctx.lineTo(q.x+s,q.y+s); ctx.closePath(); }
  else if(kind==='cone-down'){ ctx.moveTo(q.x,q.y+s); ctx.lineTo(q.x-s,q.y-s); ctx.lineTo(q.x+s,q.y-s); ctx.closePath(); }
  else if(kind==='diamond'){ ctx.moveTo(q.x,q.y-s*1.2); ctx.lineTo(q.x+s*0.85,q.y); ctx.lineTo(q.x,q.y+s*1.2); ctx.lineTo(q.x-s*0.85,q.y); ctx.closePath(); }
  else { const wD=s*0.75,hD=s*1.25; ctx.rect(q.x-wD,q.y-hD,wD*2,hD*2); }  // גליל
  ctx.fill(); ctx.stroke(); ctx.globalAlpha=1;
}
function drawFlagA(ctx,q,s,alpha){
  const wF=s*1.6,hF=s*1.05,notch=wF*0.28;
  ctx.globalAlpha=alpha;
  ctx.save(); ctx.translate(q.x,q.y);
  ctx.beginPath(); ctx.moveTo(0,-hF/2); ctx.lineTo(0,hF/2); ctx.lineTo(0,hF/2+s*1.4);
  ctx.strokeStyle='rgba(200,210,220,0.6)'; ctx.lineWidth=1; ctx.stroke();
  const flag=(x0,x1,col)=>{ ctx.fillStyle=col; ctx.beginPath();
    ctx.moveTo(x0,-hF/2); ctx.lineTo(x1,-hF/2);
    if(x1>=wF-0.5){ ctx.lineTo(wF-notch,0); ctx.lineTo(wF,hF/2); } else ctx.lineTo(x1,hF/2);
    ctx.lineTo(x0,hF/2); ctx.closePath(); ctx.fill(); };
  flag(0,wF/2,'#f4f6f8'); flag(wF/2,wF,'#1457b5');
  ctx.strokeStyle='rgba(10,13,17,0.7)'; ctx.lineWidth=0.8;
  ctx.beginPath(); ctx.moveTo(0,-hF/2); ctx.lineTo(wF,-hF/2); ctx.lineTo(wF-notch,0);
  ctx.lineTo(wF,hF/2); ctx.lineTo(0,hF/2); ctx.closePath(); ctx.stroke();
  ctx.restore(); ctx.globalAlpha=1;
}

function drawLights(ctx,cam,model,st){
  const nk=st.nightK, az=st.az;
  model.lights.forEach(l=>{
    if(st.quiz&&st.quiz.active&&l.optional) return;   // בלי אורות רשות בחידון
    const q=project(cam,l.pos); if(!q)return;
    const vis=arcVis(l.place,az)*(l.optional?0.6:1);
    const col=App.R.lightColors[l.color];
    const base=1.6*cam.focal/q.z;
    if(nk<0.9){                                        // ביום: גוף פנס עמום
      ctx.globalAlpha=(1-nk)*0.5;
      ctx.fillStyle='#22303c'; ctx.beginPath(); ctx.arc(q.x,q.y,Math.max(1.6,base*0.14),0,6.283); ctx.fill();
      ctx.globalAlpha=1;
    }
    const a=vis*nk;
    if(a<=0.02) return;
    const rr=base*(0.85+0.2*(st.anim?Math.sin(st.time*5+q.x):0)*0.15);
    const g=ctx.createRadialGradient(q.x,q.y,0,q.x,q.y,rr);
    g.addColorStop(0,col.hex); g.addColorStop(0.25,col.glow);
    g.addColorStop(1,'rgba(0,0,0,0)');
    ctx.globalAlpha=a*0.85;
    ctx.fillStyle=g; ctx.beginPath(); ctx.arc(q.x,q.y,rr,0,6.283); ctx.fill();
    ctx.globalAlpha=a;
    ctx.fillStyle=col.hex; ctx.beginPath(); ctx.arc(q.x,q.y,Math.max(1.8,rr*0.16),0,6.283); ctx.fill();
    ctx.fillStyle='rgba(255,255,255,'+(0.85*a)+')';
    ctx.beginPath(); ctx.arc(q.x,q.y,Math.max(0.9,rr*0.07),0,6.283); ctx.fill();
    ctx.globalAlpha=1;
  });
}
/* ---------------- "מה רואים עכשיו" ---------------- */
function seesDesc(v,az,night,quizOn){
  if(!night){
    const parts=v.shapes.map(s=>window.Draw&&Draw.SHNAME?Draw.SHNAME[s.shape]:s.shape);
    if(v.dayFlag) parts.push('דגל '+v.dayFlag+' (Alpha)');
    if(v.sideShapes) parts.push('2 כדורים (צד המכשול) + 2 מעוינים (צד המעבר)');
    return parts.length?parts.join(' + '):'אין צורות יום';
  }
  const L=v.lights.filter(l=>!(quizOn&&l.optional));
  if(!L.length) return v.nightDesc||'אין פנסים קבועים';
  const nm=c=>App.R.lightColors[c].name;
  const parts=[];
  const ar=L.filter(l=>l.place==='allround');
  if(ar.length===1) parts.push('פנס מעגלי '+nm(ar[0].color)+(ar[0].optional?' (רשות)':''));
  else if(ar.length) parts.push(ar.map(l=>nm(l.color)).join('־מעל־')+(ar.some(l=>l.optional)?' (רשות)':''));
  const vis=p=>arcVis(p,az)>=0.5;
  let mh=0,mhOpt=0;
  L.forEach(l=>{ if((l.place==='masthead'||l.place==='masthead-aft')&&vis(l.place)){ if(l.optional)mhOpt++; else mh++; } });
  if(mh===1) parts.push('פנס תורן לבן'); else if(mh>1) parts.push(mh+' פנסי תורן לבנים');
  if(mhOpt) parts.push('פנס תורן לבן (רשות)');
  if(L.some(l=>l.place==='sidelight-stbd')&&vis('sidelight-stbd')) parts.push('פנס צד ירוק');
  if(L.some(l=>l.place==='sidelight-port')&&vis('sidelight-port')) parts.push('פנס צד אדום');
  if(L.some(l=>l.place==='stern')&&vis('stern')) parts.push('פנס ירכתיים לבן');
  if(L.some(l=>l.place==='towing')&&vis('towing')) parts.push('פנס גרירה צהוב');
  const anch=L.filter(l=>l.place==='anchor'||l.place==='anchor-aft').length;
  if(anch===1) parts.push('פנס עוגן לבן');
  else if(anch>1) parts.push('שני פנסי עוגן לבנים (קדמי גבוה, אחורי נמוך)');
  if(L.some(l=>l.place==='torch')) parts.push('פנס יד לבן (מוצג רק בעת הצורך)');
  if(v.sideLights) parts.push('2 אדומים מעגליים (צד המכשול) + 2 ירוקים מעגליים (צד המעבר)');
  return parts.length?parts.join(' + '):'שום אור אינו נראה מזווית זו';
}

/* ================================================================
   התצוגה
   ================================================================ */
App.registerView('boat3d',{ render(el){
  const vessels=App.R.vessels;
  const reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;

  el.innerHTML=`
    <div class="section-title"><h2>אורות וצורות</h2>
      <span class="hint">גררו את כלי השיט להקפה · מעלה/מטה לגובה המבט</span></div>
    <div class="row" style="justify-content:center;gap:10px;margin-bottom:8px" id="d3pick">
      <button class="iconbtn" id="d3prev" aria-label="כלי השיט הקודם">›</button>
      <button class="chip" id="d3cur" style="min-width:180px;justify-content:center;font-size:.84rem" aria-pressed="true"></button>
      <button class="iconbtn" id="d3next" aria-label="כלי השיט הבא">‹</button>
    </div>
    <div class="viewer3d" id="d3wrap">
      <canvas id="d3cv"></canvas>
      <div class="bearing" id="d3bear"></div>
    </div>
    <div class="row" style="margin-top:10px">
      <div class="seg" id="d3seg">
        <button data-m="day"   aria-pressed="false">יום</button>
        <button data-m="night" aria-pressed="true">לילה</button>
      </div>
      <button class="btn mini" id="d3rot">עצירת סיבוב</button>
      <div class="grow"></div>
      <button class="btn mini primary" id="d3quizBtn">זהה מהחשכה</button>
    </div>
    <div class="card" style="padding:12px 14px;margin-top:10px">
      <div class="row" style="gap:8px"><b id="d3name" style="color:var(--parchment);font-size:.92rem"></b>
        <span class="ref" id="d3ref"></span></div>
      <div style="font-size:.85rem;margin-top:5px"><span class="muted">מה רואים עכשיו: </span><b id="d3sees" style="color:var(--parchment)"></b></div>
      <div id="d3detail"></div>
    </div>
    <div id="d3quizBox"></div>`;

  const cv=App.$('#d3cv',el), wrap=App.$('#d3wrap',el), ctx=cv.getContext('2d');
  const bearEl=App.$('#d3bear',el), nameEl=App.$('#d3name',el), refEl=App.$('#d3ref',el),
        seesEl=App.$('#d3sees',el), quizBox=App.$('#d3quizBox',el),
        rotBtn=App.$('#d3rot',el), segEl=App.$('#d3seg',el), quizBtn=App.$('#d3quizBtn',el),
        detEl=App.$('#d3detail',el),
        prevBtn=App.$('#d3prev',el), nextBtn=App.$('#d3next',el), curBtn=App.$('#d3cur',el);

  const st={ az:38, el:16, vaz:0, mode:'night', nightK:1, time:0,
    rot:!reduced, anim:!reduced, stars:[], w:0,h:0,dpr:1,
    vid:vessels[0].id, model:null, quiz:{active:false,v:null,answered:false},
    lastBear:'', lastSees:'' };

  /* ---------- בחירת כלי שיט ---------- */
  function markSeen(id){
    App.store.seen.d3=App.store.seen.d3||{};
    App.store.seen.d3[id]=1; App.save(); App.checkBadges();
  }
  /* דפדוף בין כלי השיט — כמו נגן: הקודם/הבא, והקשה על השם פותחת רשימה מלאה */
  function buildPicker(){
    const v=vessels.find(x=>x.id===st.vid);
    curBtn.textContent = st.quiz.active ? '? כלי שיט לא מזוהה' : v.shortName;
    prevBtn.disabled=nextBtn.disabled=curBtn.disabled=st.quiz.active;
  }
  function stepVessel(d){
    const i=vessels.findIndex(v=>v.id===st.vid);
    selectVessel(vessels[(i+d+vessels.length)%vessels.length].id);
  }
  prevBtn.addEventListener('click',()=>{ if(!st.quiz.active){ App.sfx('click'); stepVessel(-1); } });
  nextBtn.addEventListener('click',()=>{ if(!st.quiz.active){ App.sfx('click'); stepVessel(1); } });
  curBtn.addEventListener('click',()=>{
    if(st.quiz.active) return;
    App.openSheet('בחרו כלי שיט', `<div class="chipbar" style="padding:6px 0">${vessels.map(v=>
      `<button class="chip" data-v="${v.id}" aria-pressed="${v.id===st.vid}">${App.esc(v.shortName)}</button>`).join('')}</div>`);
    App.$$('#sheetBody .chip').forEach(b=>b.addEventListener('click',()=>{
      App.sfx('click'); selectVessel(b.dataset.v);
      setTimeout(App.closeSheet,360);
    }));
  });
  function selectVessel(id){
    st.vid=id; st.model=buildModel(vessels.find(v=>v.id===id));
    if(!st.quiz.active) markSeen(id);
    buildPicker(); updateInfo();
  }
  function updateInfo(){
    const v=vessels.find(x=>x.id===st.vid);
    if(st.quiz.active&&!st.quiz.answered){
      nameEl.textContent='כלי שיט לא מזוהה'; refEl.style.display='none';
      detEl.innerHTML='';
    }else{
      nameEl.textContent=v.name; refEl.style.display='';
      refEl.textContent=v.ref&&v.ref.colreg?v.ref.colreg:'';
      // פרטי הלימוד המלאים (מוזגו לכאן מהלומדה הדו-ממדית)
      detEl.innerHTML=`
        <p style="font-size:.86rem;margin:8px 0 4px">${App.esc(v.summary)}</p>
        <p class="muted" style="font-size:.8rem;margin:4px 0"><b>בלילה:</b> ${App.esc(Draw.describeNight(v))}<br><b>ביום:</b> ${App.esc(Draw.describeDay(v))}</p>
        ${v.note?`<p class="muted" style="font-size:.78rem;line-height:1.5;margin:4px 0">${App.esc(v.note)}</p>`:''}
        <div class="tip" style="margin-top:8px">${App.icon('bulb',14)} ${App.esc(v.examTip)}</div>`;
    }
    st.lastSees=null;
  }

  /* ---------- קנבס ---------- */
  function resize(){
    const w=wrap.clientWidth||300, h=Math.min(420,Math.round(w*0.72));
    const dpr=window.devicePixelRatio||1;
    if(cv.width!==Math.round(w*dpr)||cv.height!==Math.round(h*dpr)){
      cv.width=Math.round(w*dpr); cv.height=Math.round(h*dpr);
      cv.style.height=h+'px'; st.stars=makeStars(w,h);
    }
    st.w=w; st.h=h; st.dpr=dpr;
  }

  /* ---------- מגע וגרירה ---------- */
  let drag=null;
  cv.addEventListener('pointerdown',e=>{
    drag={x:e.clientX,y:e.clientY}; st.vaz=0;
    try{ cv.setPointerCapture(e.pointerId); }catch(err){}
  });
  cv.addEventListener('pointermove',e=>{
    if(!drag) return;
    const dx=e.clientX-drag.x, dy=e.clientY-drag.y;
    drag.x=e.clientX; drag.y=e.clientY;
    st.az=((st.az+dx*0.45)%360+360)%360;
    st.el=App.clamp(st.el+dy*0.25,5,45);
    st.vaz=dx*0.45;
  });
  const endDrag=()=>{ drag=null; };
  cv.addEventListener('pointerup',endDrag);
  cv.addEventListener('pointercancel',endDrag);

  /* ---------- בקרים ---------- */
  function paintRot(){ rotBtn.textContent=st.rot?'עצירת סיבוב':'סיבוב אוטומטי'; }
  rotBtn.addEventListener('click',()=>{ App.sfx('click'); st.rot=!st.rot; paintRot(); });
  function paintSeg(){
    App.$$('button',segEl).forEach(b=>{
      b.setAttribute('aria-pressed',String(b.dataset.m===st.mode));
      b.disabled=st.quiz.active;
    });
  }
  App.$$('button',segEl).forEach(b=>b.addEventListener('click',()=>{
    if(st.quiz.active) return;
    App.sfx('click'); st.mode=b.dataset.m; paintSeg();
  }));

  /* ---------- חידון: זהה מהחשכה ---------- */
  function startQuiz(){
    st.quiz.active=true; st.rot=false; st.vaz=0; st.mode='night';
    quizBtn.textContent='סיום החידון';
    paintRot(); paintSeg(); buildChips(); nextRound();
  }
  function endQuiz(){
    st.quiz={active:false,v:null,answered:false};
    quizBox.innerHTML=''; quizBtn.textContent='זהה מהחשכה';
    st.rot=!reduced; paintRot(); paintSeg(); buildChips();
    markSeen(st.vid); updateInfo();
  }
  quizBtn.addEventListener('click',()=>{ App.sfx('click'); st.quiz.active?endQuiz():startQuiz(); });

  function nextRound(){
    st.quiz.answered=false;
    /* בלי כלים "דו־משמעיים" (נגרר≈מפרשית וכד׳) — אי אפשר לזהותם מהאורות בלבד */
    const pool=vessels.filter(x=>!x.idAmbiguous&&x.lights.length);
    const v=App.pick(pool);
    st.quiz.v=v; st.vid=v.id; st.model=buildModel(v);
    st.az=Math.floor(Math.random()*360); st.el=8+Math.random()*20;
    const opts=App.shuffle([v].concat(App.sample(pool.filter(x=>x.id!==v.id),3)));
    quizBox.innerHTML=`<div class="card quiz" style="margin-top:10px">
      <div class="qtext">לילה בים. לפי האורות — מה כלי השיט שמולך?</div>
      ${opts.map(o=>`<button class="opt" data-id="${o.id}">${App.esc(o.shortName)}</button>`).join('')}
      <div id="d3after"></div></div>`;
    App.$$('.opt',quizBox).forEach(b=>b.addEventListener('click',()=>answerQuiz(b)));
    buildChips(); updateInfo();
  }
  function answerQuiz(btn){
    if(st.quiz.answered) return;
    st.quiz.answered=true;
    const ok=btn.dataset.id===st.quiz.v.id;
    App.$$('.opt',quizBox).forEach(b=>{
      b.disabled=true;
      if(b.dataset.id===st.quiz.v.id) b.classList.add('correct');
      else if(b===btn) b.classList.add('wrong');
    });
    App.recordAnswer('lights',ok,null);
    App.bump('d3quiz');
    updateInfo();
    const after=App.$('#d3after',quizBox);
    after.innerHTML=`<div class="explain"><span class="lbl">${App.esc(st.quiz.v.name)}</span><br>${App.esc(st.quiz.v.summary||'')}</div>
      <button class="btn primary" id="d3next" style="margin-top:10px;width:100%">הבא</button>`;
    App.$('#d3next',quizBox).addEventListener('click',()=>{ App.sfx('click'); nextRound(); });
  }

  /* ---------- לולאת ציור ---------- */
  let lastT=performance.now();
  function loop(now){
    if(!cv.isConnected) return;                 // המשתמש ניווט הלאה — עוצרים נקי
    requestAnimationFrame(loop);
    const dt=Math.min(0.05,(now-lastT)/1000); lastT=now;
    st.time=now/1000;
    resize();
    if(st.rot&&!drag) st.az=(st.az+dt*9)%360;
    if(!drag&&Math.abs(st.vaz)>0.02){ st.az=((st.az+st.vaz)%360+360)%360; st.vaz*=0.92; }
    const tgt=st.mode==='night'?1:0;
    st.nightK+=(tgt-st.nightK)*Math.min(1,dt*5);
    if(Math.abs(tgt-st.nightK)<0.004) st.nightK=tgt;
    ctx.setTransform(st.dpr,0,0,st.dpr,0,0);
    const cam=makeCam(st.az,st.el,st.model.d,st.w,st.h);
    drawScene(ctx,cam,st.model,st);
    /* HUD — מתעדכן רק כשהטקסט משתנה */
    const a=Math.round(st.az)%360;
    const bt='צופה מכיוון: '+a+'° — '+bearName(a);
    const bearMoved=bt!==st.lastBear;
    if(bearMoved){ st.lastBear=bt; bearEl.textContent=bt; }
    if(bearMoved||st.lastSees===null||(st.nightK>0&&st.nightK<1)){
      const sd=seesDesc(vessels.find(x=>x.id===st.vid),st.az,st.nightK>0.5,st.quiz.active);
      if(sd!==st.lastSees){ st.lastSees=sd; seesEl.textContent=sd; }
    }
  }

  selectVessel(st.vid);
  paintRot(); paintSeg();
  requestAnimationFrame(loop);
}});

/* חשיפה עדינה לניפוי שגיאות מהקונסולה */
App.d3={buildModel,makeCam,drawScene,arcVis,seesDesc,bearName};

})();
