/* ============================================================================
   home.js — מסך הבית: דרגה, רצף, יעד יומי, שליטה בנושאים, תגים, פעולות מהירות
   ========================================================================== */
(function(){
"use strict";

function ring(pct,color,size){
  size=size||74; const r=(size/2)-6, c=2*Math.PI*r, off=c*(1-pct);
  return `<div class="ring" style="width:${size}px;height:${size}px">
    <svg width="${size}" height="${size}">
      <circle cx="${size/2}" cy="${size/2}" r="${r}" fill="none" stroke="var(--abyss)" stroke-width="7"/>
      <circle cx="${size/2}" cy="${size/2}" r="${r}" fill="none" stroke="${color}" stroke-width="7"
        stroke-linecap="round" stroke-dasharray="${c}" stroke-dashoffset="${off}"/>
    </svg>
    <div class="pct">${Math.round(pct*100)}%</div>
  </div>`;
}
function greet(){
  const h=new Date().getHours();
  if(h<5) return 'משמרת לילה טובה';
  if(h<12) return 'בוקר טוב';
  if(h<17) return 'צהריים טובים';
  if(h<21) return 'ערב טוב';
  return 'לילה טוב';
}

function homeTopics(){
  const base=(window.QuizGen&&QuizGen.TOPICS)?QuizGen.TOPICS.slice():[];
  return base.concat([
    {id:'scenarios', name:'תרחישים', ic:'ship'},
    {id:'nav', name:'ניווט', ic:'map'},
    {id:'exam', name:'מבחן', ic:'grad'}
  ]);
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

App.registerView('home',{render(el){
  const S=App.store, r=App.rankOf(S.xp), ri=App.rankIdx(S.xp);
  const next=App.RANKS[ri+1];
  const span=next? (next.xp-r.xp) : 1;
  const into=next? (S.xp-r.xp) : 1;
  const pct=next? Math.min(100,Math.round(into/span*100)) : 100;
  const today=App.todayStr();
  const dailyXp=S.daily.date===today?S.daily.xp:0;
  const dailyPct=Math.min(1,dailyXp/(S.daily.goal||50));
  const reviewN=S.review.length;
  const topics=homeTopics();

  const quicks=[
    {ic:'dice', t:'חידון מהיר', d:'שאלות מהתקנות', go:()=>App.navigate('practice','quiz')},
    {ic:'ship', t:'תרחיש זכות קדימה', d:'שרטטו את התמרון', go:()=>App.navigate('practice','scenarios')},
    {ic:'grad', t:'מבחן סימולציה', d:'כמו בבחינה האמיתית', go:()=>App.navigate('exam')},
    {ic:'map', t:'תרגול ניווט', d:'קביעת מקום על המפה', go:()=>App.navigate('nav','chart')},
    {ic:'cube', t:'תלת־ממד', d:'אורות מכל הכיוונים', go:()=>App.navigate('learn','boat3d')},
    {ic:'broom', t:'חזרה על טעויות', d:reviewN?reviewN+' שאלות ממתינות':'החפיסה ריקה', go:()=>App.navigate('practice','review')}
  ];

  el.innerHTML=`
    <div class="card hero">
      ${buntingSVG()}
      <div class="greet">${greet()}, ${App.esc(r.name)}</div>
      <div>
        <div class="xpbar"><div style="width:${pct}%"></div></div>
        <div class="ranklabel"><span>${S.xp} XP</span>
          <span>${next? (next.xp-S.xp)+' XP לדרגת '+next.name : 'הדרגה הגבוהה ביותר!'}</span></div>
      </div>
      <div class="statrow">
        <div class="stat"><div class="v">${App.icon('flame',15)} ${S.streak.count||0}</div><div class="l">רצף ימים</div></div>
        <div class="stat"><div class="v">${dailyXp}/${S.daily.goal}</div><div class="l">יעד יומי ${dailyPct>=1?'✓':''}</div></div>
        <div class="stat"><div class="v">${S.counters.correct||0}</div><div class="l">תשובות נכונות</div></div>
      </div>
    </div>

    <div class="section-title"><h2>המשך תרגול</h2></div>
    <div class="quickgrid">
      ${quicks.map((q,i)=>`<button class="quick" data-q="${i}">
        <span class="qi" style="color:var(--brass)">${App.icon(q.ic,26)}</span><span class="qt">${q.t}</span><span class="qd">${q.d}</span>
      </button>`).join('')}
    </div>

    <div class="section-title"><h2>שליטה בנושאים</h2>
      <span class="hint">לפי 20 התשובות האחרונות בכל נושא</span></div>
    <div class="topicgrid">
      ${topics.map(t=>{
        const m=App.masteryOf(t.id);
        const answered=(S.topics[t.id]&&S.topics[t.id].t)||0;
        const col=m>=0.8?'var(--good)':(m>=0.5?'var(--yellow)':'var(--bad)');
        return `<div class="topiccard" data-t="${t.id}">
          ${answered?ring(m,col,64):'<div class="ring" style="width:64px;height:64px"><div class="pct" style="color:var(--ink-dim)">'+App.icon(t.ic||'anchor',24)+'</div></div>'}
          <div class="tn">${t.name}</div>
        </div>`;
      }).join('')}
    </div>

    <div class="section-title"><h2>תגים</h2>
      <span class="hint">${S.badges.length}/${App.BADGES.length} הושגו</span></div>
    <div class="badgegrid">
      ${App.BADGES.map(b=>`<div class="badge ${S.badges.includes(b.id)?'earned':''}" title="${App.esc(b.desc)}">
        <div class="bi">${b.icon}</div><div class="bn">${b.name}</div></div>`).join('')}
    </div>

    ${S.examHistory.length?`
    <div class="section-title"><h2>מבחנים אחרונים</h2></div>
    <div style="display:grid;gap:8px">
      ${S.examHistory.slice(-3).reverse().map(h=>`
        <div class="card" style="padding:11px 14px;display:flex;justify-content:space-between;align-items:center">
          <span style="font-weight:800;color:${h.passed?'var(--good)':'var(--bad)'}">${h.passed?'✓ עבר':'✗ נכשל'} · ${h.score}%</span>
          <span class="muted" style="font-size:.74rem">${h.correct}/${h.total} · ${App.esc(h.date)}</span>
        </div>`).join('')}
    </div>`:''}
  `;
  App.$$('.quick',el).forEach(b=>b.addEventListener('click',()=>{ App.sfx('click'); quicks[+b.dataset.q].go(); }));
  App.$$('.topiccard',el).forEach(c=>c.addEventListener('click',()=>{
    const id=c.dataset.t;
    if(id==='scenarios') App.navigate('practice','scenarios');
    else if(id==='nav') App.navigate('nav','chart');
    else if(id==='exam') App.navigate('exam');
    else App.navigate('practice','quiz');
  }));
}});
})();
