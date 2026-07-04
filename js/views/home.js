/* ============================================================================
   home.js — מסך הבית: "מסלול ההפלגה" — הנושאים כתחנות על נתיב משורטט במפה
   (בהשראת מסך המסלול של Duolingo, בשפה של מפה ימית), עם דרגה, רצף ותגים.
   ========================================================================== */
(function(){
"use strict";

function greet(){
  const h=new Date().getHours();
  if(h<5) return 'משמרת לילה טובה';
  if(h<12) return 'בוקר טוב';
  if(h<17) return 'צהריים טובים';
  if(h<21) return 'ערב טוב';
  return 'לילה טוב';
}

/* דגלוני רגטה — קישוט החתימה של כרטיס הבית */
function buntingSVG(){
  const cols=['#16405e','#d6403a','#0e7d94','#e8a800'];
  let s='<svg class="bunting" viewBox="0 0 300 26" aria-hidden="true"><path d="M2,4 Q150,16 298,4" fill="none" stroke="currentColor" stroke-width="1.1" opacity=".4"/>';
  for(let i=0;i<8;i++){
    const x=18+i*34, t=(x+9)/296, y=4+20*t*(1-t);
    s+=`<polygon points="${x},${y.toFixed(1)} ${x+20},${y.toFixed(1)} ${x+10},${(y+15).toFixed(1)}" fill="${cols[i%4]}"/>`;
  }
  return s+'</svg>';
}

/* תחנות המסלול — סדר לימוד מומלץ; תחנות ידע פותחות חידון מסונן לנושא שלהן */
const quizOn = ids=>()=>{ if(window.QuizGen) QuizGen.setFilter(ids); App.navigate('practice','quiz'); };
const LEGS=[
  {id:'lights',   name:'אורות',       ic:'bulb',  go:()=>App.navigate('learn','boat3d')},
  {id:'shapes',   name:'צורות יום',   ic:'shapes',go:quizOn(['shapes'])},
  {id:'giveway',  name:'זכות קדימה',  ic:'scale', go:quizOn(['giveway'])},
  {id:'sounds',   name:'אותות קול',   ic:'horn',  go:()=>App.navigate('learn','sounds')},
  {id:'marks',    name:'מצופים',      ic:'buoy',  go:()=>App.navigate('learn','marks')},
  {id:'flags',    name:'דגלים',       ic:'flag',  go:()=>App.navigate('learn','flags')},
  {id:'scenarios',name:'תרחישים',     ic:'ship',  go:()=>App.navigate('practice','scenarios')},
  {id:'nav',      name:'ניווט חופי',  ic:'map',   go:()=>App.navigate('nav','chart')},
  {id:'exam',     name:'מבחן ההסמכה', ic:'grad',  go:()=>App.navigate('exam'), port:true}
];
function legState(l){
  const t=App.store.topics[l.id];
  const answered=(t&&t.t)||0, m=App.masteryOf(l.id);
  return {answered, m, done:answered>=5&&m>=0.8};
}
function nestedIcon(x,y,size,name,color){
  return `<g color="${color}"><svg x="${x-size/2}" y="${y-size/2}" width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="${App.ICONS[name]||''}"/></svg></g>`;
}
/* ---------- מסך הבית: מפת מסע ימית ("מפה" ולא כרטיס לבן — לשקיעה בחוויה) ---------- */
function chartDefs(){
  return `<defs>
    <linearGradient id="vwater" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="var(--water)" stop-opacity=".95"/><stop offset="1" stop-color="var(--water)" stop-opacity=".72"/></linearGradient>
    <radialGradient id="vsheen" cx="50%" cy="26%" r="75%"><stop offset="0" stop-color="#ffffff" stop-opacity=".11"/><stop offset="1" stop-color="#ffffff" stop-opacity="0"/></radialGradient>
    <linearGradient id="vland" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#e7d3a0"/><stop offset="1" stop-color="#c7ab70"/></linearGradient>
    <radialGradient id="vmedal" cx="36%" cy="30%" r="82%"><stop offset="0" stop-color="#f6d38c"/><stop offset=".55" stop-color="var(--brass)"/><stop offset="1" stop-color="var(--brass-dim)"/></radialGradient>
    <radialGradient id="vnode" cx="36%" cy="28%" r="86%"><stop offset="0" stop-color="var(--sea2)"/><stop offset="1" stop-color="var(--sea3)"/></radialGradient>
    <filter id="vshadow" x="-50%" y="-50%" width="200%" height="200%"><feDropShadow dx="0" dy="1.5" stdDeviation="2" flood-color="#001018" flood-opacity=".4"/></filter>
    <filter id="vglow" x="-90%" y="-90%" width="280%" height="280%"><feGaussianBlur stdDeviation="4.5"/></filter>
  </defs>`;
}
/* שושנת רוחות: כוכב 8 קצוות בהצללה מתחלפת */
function compassRoseHome(cx,cy,R){
  const star=(len,w,rot)=>{ let s=''; for(let i=0;i<4;i++){ const a=rot+i*Math.PI/2,dx=Math.cos(a),dy=Math.sin(a),ox=-dy*w,oy=dx*w;
    s+=`<polygon points="${(cx+ox).toFixed(1)},${(cy+oy).toFixed(1)} ${(cx+dx*len).toFixed(1)},${(cy+dy*len).toFixed(1)} ${(cx-ox).toFixed(1)},${(cy-oy).toFixed(1)}" fill="var(--brass)" opacity="${i%2?.4:.75}"/>`; } return s; };
  return `<g opacity=".8" style="pointer-events:none">
    <circle cx="${cx}" cy="${cy}" r="${R}" fill="none" stroke="var(--brass)" stroke-width="1"/>
    <circle cx="${cx}" cy="${cy}" r="${R-4}" fill="none" stroke="var(--brass)" stroke-width=".5" opacity=".5"/>
    ${star(R-3,3,Math.PI/4)}${star(R,3.3,0)}
    <circle cx="${cx}" cy="${cy}" r="1.8" fill="var(--brass)"/>
    <text x="${cx}" y="${cy-R+8}" text-anchor="middle" font-size="7" font-weight="800" fill="var(--brass)">N</text></g>`;
}
/* מפרשית קטנה שחוצה את המפה (מונפשת ב-SMIL; במצב reduced-motion — נייחת) */
function chartBoat(y,dur,dir,delay,sc,rm){
  const W=360, from=dir>0?-28:W+28, to=dir>0?W+28:-28, fx=dir>0?1:-1;
  const shape=`<g transform="scale(${(sc*fx).toFixed(2)},${sc})">
    <path d="M-11,4 L11,4 L8,10 L-9,10 Z" fill="#16405e" stroke="#0c2233" stroke-width=".6"/>
    <line x1="0" y1="4" x2="0" y2="-13" stroke="#5b4a2e" stroke-width="1.2"/>
    <path d="M.6,-12 Q7,-4 6,3 L.6,3 Z" fill="#fdfcf5" stroke="#c2ccce" stroke-width=".5"/>
    <path d="M-.6,-9 L-5,2 L-.6,2 Z" fill="#d6403a"/></g>`;
  if(rm) return `<g transform="translate(${dir>0?90:270},${y.toFixed(0)})" opacity=".8">${shape}</g>`;
  return `<g transform="translate(${from},${y.toFixed(0)})" opacity=".85">
    <animateTransform attributeName="transform" type="translate" values="${from},${y.toFixed(0)}; ${to},${y.toFixed(0)}" dur="${dur}s" begin="${delay}s" repeatCount="indefinite"/>${shape}</g>`;
}
/* רקע "מפה ימית": מים, רשת, קווי עומק, חוף + מגדלור, סימוני עומק, מפרשיות, שושנה ומסגרת */
function chartBg(W,H,rm){
  let g=`<rect x="2" y="2" width="${W-4}" height="${H-4}" rx="16" fill="url(#vwater)"/>`;
  g+=`<rect x="2" y="2" width="${W-4}" height="${H-4}" rx="16" fill="url(#vsheen)"/>`;
  g+='<g stroke="var(--line)" stroke-width=".6" opacity=".32">';
  for(let x=44;x<W-12;x+=52) g+=`<line x1="${x}" y1="12" x2="${x}" y2="${H-12}"/>`;
  for(let y=52;y<H-12;y+=52) g+=`<line x1="12" y1="${y}" x2="${W-12}" y2="${y}"/>`;
  g+='</g>';
  g+=`<g fill="none" stroke="#4a86a6" stroke-width="1" stroke-dasharray="1 6" stroke-linecap="round" opacity=".4">
    <path d="M14,${(H*0.26)|0} Q${(W*0.45)|0},${(H*0.2)|0} ${W-14},${(H*0.3)|0}"/>
    <path d="M14,${(H*0.55)|0} Q${(W*0.5)|0},${(H*0.48)|0} ${W-14},${(H*0.58)|0}"/>
    <path d="M14,${(H*0.83)|0} Q${(W*0.5)|0},${(H*0.77)|0} ${W-14},${(H*0.86)|0}"/></g>`;
  // חופים בפינות התחתונות (הרחק משושנת הרוחות ומהתחנה הנוכחית שבראש) + מגדלור על החוף השמאלי
  g+=`<path d="M4,${H-4} Q56,${H-16} 82,${H-58} Q50,${H-92} 4,${H-100} Z" fill="url(#vland)" opacity=".42" stroke="#a98d52" stroke-width="1"/>`;
  g+=`<g opacity=".75"><rect x="38" y="${H-74}" width="4" height="13" fill="#c0492f"/><polygon points="36,${H-74} 44,${H-74} 40,${H-80}" fill="#7a2c1d"/><circle cx="40" cy="${H-77}" r="2.1" fill="#ffd23b"/></g>`;
  g+=`<path d="M${W-4},${H-4} Q${W-56},${H-16} ${W-82},${H-58} Q${W-50},${H-92} ${W-4},${H-100} Z" fill="url(#vland)" opacity=".34" stroke="#a98d52" stroke-width="1"/>`;
  g+='<g fill="var(--ink-dim)" opacity=".5" font-size="8" font-style="italic" font-family="Georgia,serif" style="pointer-events:none">';
  [[46,150,'12'],[300,205,'18'],[300,300,'31'],[150,235,'9'],[300,410,'19'],[176,150,'7'],[196,470,'22'],[60,330,'24']].forEach(d=>g+=`<text x="${d[0]}" y="${d[1]}">${d[2]}</text>`);
  g+='</g>';
  g+=chartBoat(H*0.2,26,1,0,1,rm)+chartBoat(H*0.47,34,-1,4,.8,rm)+chartBoat(H*0.72,30,1,9,.9,rm);
  g+=compassRoseHome(W-40,50,24);
  return g;   // המסגרת מצוירת ב-voyageSVG, מעל תוכן שנחתך לפינות מעוגלות
}
function voyageSVG(){
  const W=360, step=58, y0=52;
  const H=y0+(LEGS.length-1)*step+52;
  const pos=LEGS.map((_,i)=>({x: i%2===0?112:248, y:y0+i*step}));
  const states=LEGS.map(legState);
  let cur=states.findIndex(s=>!s.done); if(cur<0) cur=LEGS.length-1;
  const rm=matchMedia('(prefers-reduced-motion:reduce)').matches;
  let g=chartBg(W,H,rm);
  // קו המסע בין תחנות (עבר=מלא, עתיד=מקווקו)
  for(let i=0;i<pos.length-1;i++){
    const a=pos[i], b=pos[i+1], my=(a.y+b.y)/2, done=states[i].done;
    g+=`<path d="M${a.x},${a.y} C${a.x},${my} ${b.x},${my} ${b.x},${b.y}" fill="none" stroke="${done?'var(--brass)':'var(--line)'}" stroke-width="${done?3.4:2.8}" ${done?'':'stroke-dasharray="1 9"'} stroke-linecap="round" opacity=".9"/>`;
  }
  // תחנות — מדליוני זהב (הושלם) / עוגני מפה (בהמשך), עם טבעת שליטה והילה על התחנה הנוכחית
  LEGS.forEach((l,i)=>{
    const p=pos[i], stt=states[i], R=l.port?23:19, pct=stt.answered?stt.m:0, C=(2*Math.PI*(R+5)).toFixed(1);
    g+=`<g class="leg" data-i="${i}" style="cursor:pointer" role="button" aria-label="${App.esc(l.name)}">`;
    if(i===cur) g+=`<circle cx="${p.x}" cy="${p.y}" r="${R+13}" fill="var(--brass)" opacity=".2" filter="url(#vglow)"/>`;
    g+=`<circle cx="${p.x}" cy="${p.y}" r="${R+5}" fill="none" stroke="var(--abyss)" stroke-width="4.5" opacity=".85"/>`;
    if(pct>0){ const col=pct>=0.8?'var(--good)':(pct>=0.5?'var(--yellow)':'var(--bad)');
      g+=`<circle cx="${p.x}" cy="${p.y}" r="${R+5}" fill="none" stroke="${col}" stroke-width="4.5" stroke-linecap="round" stroke-dasharray="${(C*pct)} ${C}" transform="rotate(-90 ${p.x} ${p.y})"/>`; }
    g+=`<circle cx="${p.x}" cy="${p.y}" r="${R}" fill="${stt.done?'url(#vmedal)':'url(#vnode)'}" stroke="${stt.done?'#8a6a28':'var(--line)'}" stroke-width="1.2" filter="url(#vshadow)"/>`;
    if(stt.done) g+=`<circle cx="${p.x}" cy="${p.y}" r="${R-3}" fill="none" stroke="#fff" stroke-width=".8" opacity=".4"/>`;
    g+=nestedIcon(p.x,p.y,l.port?21:18,l.ic,stt.done?'#3a2a08':'var(--brass)');
    const lx=p.x<180?p.x+R+12:p.x-R-12, anchor=p.x<180?'end':'start';
    g+=`<text x="${lx}" y="${p.y+1}" text-anchor="${anchor}" font-size="12.5" font-weight="800" fill="var(--ink)">${App.esc(l.name)}</text>`;
    if(stt.answered) g+=`<text x="${lx}" y="${p.y+15}" text-anchor="${anchor}" font-size="9.5" fill="var(--ink-dim)">${Math.round(stt.m*100)}%</text>`;
    g+=`</g>`;
    if(i===cur){ const bx=p.x<180?p.x-R-26:p.x+R+26;
      g+=`<g style="pointer-events:none">${nestedIcon(bx,p.y-7,22,'ship','var(--brass)')}<text x="${bx}" y="${p.y+15}" text-anchor="middle" font-size="9" font-weight="800" fill="var(--brass)">אתם כאן</text></g>`; }
  });
  return `<svg id="voyage" viewBox="0 0 ${W} ${H}" style="width:100%;max-width:440px;height:auto;display:block;margin:0 auto">${chartDefs()}
    <clipPath id="vclip"><rect x="2" y="2" width="${W-4}" height="${H-4}" rx="16"/></clipPath>
    <g clip-path="url(#vclip)">${g}</g>
    <rect x="2" y="2" width="${W-4}" height="${H-4}" rx="16" fill="none" stroke="var(--brass)" stroke-width="1.5" opacity=".55"/>
    <rect x="6.5" y="6.5" width="${W-13}" height="${H-13}" rx="12" fill="none" stroke="var(--brass)" stroke-width=".7" opacity=".35"/>
  </svg>`;
}

App.registerView('home',{render(el){
  const S=App.store, r=App.rankOf(S.xp), ri=App.rankIdx(S.xp);
  const next=App.RANKS[ri+1];
  const span=next? (next.xp-r.xp) : 1;
  const into=next? (S.xp-r.xp) : 1;
  const pct=next? Math.min(100,Math.round(into/span*100)) : 100;
  const today=App.todayStr();
  const dailyXp=S.daily.date===today?S.daily.xp:0;
  const reviewN=S.review.length;

  el.innerHTML=`
    <div class="card hero">
      ${buntingSVG()}
      <div class="greet">${greet()}, ${App.esc(r.name)}</div>
      <div>
        <div class="xpbar"><div style="width:${pct}%"></div></div>
        <div class="ranklabel"><span dir="ltr">${S.xp} XP</span>
          <span>${next? (next.xp-S.xp)+' XP לדרגת '+next.name : 'הדרגה הגבוהה ביותר!'}</span></div>
      </div>
      <div class="statrow">
        <div class="stat"><div class="v">${App.icon('flame',15)} ${S.streak.count||0}</div><div class="l">רצף ימים</div></div>
        <div class="stat"><div class="v">${dailyXp}/${S.daily.goal}</div><div class="l">יעד יומי ${dailyXp>=S.daily.goal?'✓':''}</div></div>
        <div class="stat"><div class="v">${S.counters.correct||0}</div><div class="l">תשובות נכונות</div></div>
      </div>
      <div class="row">
        ${reviewN?`<button class="btn mini" id="revQuick">${App.icon('broom',14)} ${reviewN} לחזרה</button>`:''}
        <span class="grow"></span>
        <button class="btn mini ghost" id="profileBtn">תגים והישגים ←</button>
      </div>
    </div>

    <div class="section-title"><h2>מסלול ההפלגה</h2>
      <span class="hint">הקישו על תחנה כדי לתרגל · הטבעת מציגה את השליטה בנושא</span></div>
    <div class="voyage-wrap">${voyageSVG()}</div>
  `;
  App.$$('#voyage .leg',el).forEach(gEl=>gEl.addEventListener('click',()=>{
    App.sfx('click'); LEGS[+gEl.dataset.i].go();
  }));
  const rq=App.$('#revQuick',el);
  if(rq) rq.addEventListener('click',()=>App.navigate('practice','review'));
  App.$('#profileBtn',el).addEventListener('click',openProfile);
}});

/* גיליון פרופיל: תגים + היסטוריית מבחנים — יורדים ממסך הבית לטובת חוויה קצרה */
function openProfile(){
  const S=App.store, r=App.rankOf(S.xp);
  App.openSheet('ההישגים שלי — '+r.name, `
    <div class="badgegrid" style="margin-top:6px">
      ${App.BADGES.map(b=>`<div class="badge ${S.badges.includes(b.id)?'earned':''}" title="${App.esc(b.desc)}">
        <div class="bi">${b.icon}</div><div class="bn">${b.name}</div></div>`).join('')}
    </div>
    <p class="muted" style="font-size:.72rem;text-align:center">${S.badges.length}/${App.BADGES.length} תגים הושגו</p>
    ${S.examHistory.length?`
    <h3 style="font-size:.95rem">מבחנים אחרונים</h3>
    <div style="display:grid;gap:8px">
      ${S.examHistory.slice(-5).reverse().map(h=>`
        <div style="padding:9px 12px;border:1px solid var(--line);border-radius:10px;display:flex;justify-content:space-between;align-items:center">
          <span style="font-weight:800;color:${h.passed?'var(--good)':'var(--bad)'}">${h.passed?'✓ עבר':'✗ נכשל'} · ${h.score}%</span>
          <span class="muted" style="font-size:.74rem">${h.correct}/${h.total} · ${App.esc(h.date)}</span>
        </div>`).join('')}
    </div>`:''}
  `);
}
})();
