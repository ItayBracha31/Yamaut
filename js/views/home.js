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

/* תחנות המסלול — סדר לימוד מומלץ, כל תחנה מוליכה למקום התרגול שלה */
const LEGS=[
  {id:'lights',   name:'אורות',       ic:'bulb',  go:()=>App.navigate('learn','boat3d')},
  {id:'shapes',   name:'צורות יום',   ic:'shapes',go:()=>App.navigate('practice','quiz')},
  {id:'giveway',  name:'זכות קדימה',  ic:'scale', go:()=>App.navigate('practice','quiz')},
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
function voyageSVG(){
  const W=360, step=94, y0=62;
  const H=y0+(LEGS.length-1)*step+78;
  const pos=LEGS.map((_,i)=>({x: i%2===0?96:264, y:y0+i*step}));
  const states=LEGS.map(legState);
  let cur=states.findIndex(s=>!s.done); if(cur<0) cur=LEGS.length-1;
  let g='';
  // קטעי הנתיב (עבר=מלא, עתיד=מקווקו — כמו קו מסע על מפה)
  for(let i=0;i<pos.length-1;i++){
    const a=pos[i], b=pos[i+1], my=(a.y+b.y)/2;
    const done=states[i].done;
    g+=`<path d="M${a.x},${a.y} C${a.x},${my} ${b.x},${my} ${b.x},${b.y}" fill="none" stroke="${done?'var(--brass)':'var(--line)'}" stroke-width="3" ${done?'':'stroke-dasharray="2 9"'} stroke-linecap="round" opacity=".9"/>`;
  }
  // תחנות
  LEGS.forEach((l,i)=>{
    const p=pos[i], st=states[i], R=l.port?33:27;
    const pct=st.answered?st.m:0;
    const C=(2*Math.PI*(R+6)).toFixed(1);
    g+=`<g class="leg" data-i="${i}" style="cursor:pointer" role="button" aria-label="${App.esc(l.name)}">`;
    g+=`<circle cx="${p.x}" cy="${p.y}" r="${R+6}" fill="none" stroke="var(--abyss)" stroke-width="5"/>`;
    if(pct>0){
      const col=pct>=0.8?'var(--good)':(pct>=0.5?'var(--yellow)':'var(--bad)');
      g+=`<circle cx="${p.x}" cy="${p.y}" r="${R+6}" fill="none" stroke="${col}" stroke-width="5" stroke-linecap="round" stroke-dasharray="${(C*pct).toString()} ${C}" transform="rotate(-90 ${p.x} ${p.y})"/>`;
    }
    g+=`<circle cx="${p.x}" cy="${p.y}" r="${R}" fill="${st.done?'var(--brass)':'var(--sea2)'}" stroke="var(--line)" stroke-width="1"/>`;
    g+=nestedIcon(p.x,p.y,l.port?30:26,l.ic,st.done?'var(--brass-ink)':'var(--brass)');
    g+=`<text x="${p.x}" y="${p.y+R+22}" text-anchor="middle" font-size="12.5" font-weight="700" fill="var(--ink)">${App.esc(l.name)}</text>`;
    if(st.answered) g+=`<text x="${p.x}" y="${p.y+R+37}" text-anchor="middle" font-size="10" fill="var(--ink-dim)">${Math.round(st.m*100)}%</text>`;
    g+=`</g>`;
    if(i===cur){
      const bx=p.x+(p.x<180?96:-96);
      g+=`<g style="pointer-events:none">${nestedIcon(bx,p.y-8,24,'ship','var(--brass)')}
        <text x="${bx}" y="${p.y+16}" text-anchor="middle" font-size="9.5" font-weight="700" fill="var(--brass)">אתם כאן</text></g>`;
    }
  });
  return `<svg id="voyage" viewBox="0 0 ${W} ${H}" style="width:100%;height:auto;display:block">${g}</svg>`;
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
    <div class="card" style="padding:8px 0 2px">${voyageSVG()}</div>
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
