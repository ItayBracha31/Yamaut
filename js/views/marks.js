/* ============================================================================
   marks.js — מצופים (IALA אזור A) עם אורות מהבהבים במקצב אמיתי
   ========================================================================== */
(function(){
"use strict";
const GROUPS=[
  {id:'all', name:'הכל', test:()=>true},
  {id:'lateral', name:'סימני צד', test:m=>m.id.startsWith('lateral')||m.id.startsWith('preferred')},
  {id:'cardinal', name:'קרדינליים', test:m=>m.id.startsWith('card_')},
  {id:'other', name:'אחרים', test:m=>!m.id.startsWith('lateral')&&!m.id.startsWith('card_')&&!m.id.startsWith('preferred')}
];
let group='all';

App.registerView('marks',{render(el){
  const R=App.R;
  const g=GROUPS.find(x=>x.id===group)||GROUPS[0];
  const list=R.marks.filter(g.test);
  const chips=GROUPS.map(x=>`<button class="chip" data-g="${x.id}" aria-pressed="${x.id===group}">${x.name}</button>`).join('');
  const cards=list.map(m=>`
    <div class="tile" role="button" tabindex="0" data-mark="${m.id}">
      ${Draw.buildMarkSVG(m)}<div class="nm">${App.esc(m.shortName)}</div>
    </div>`).join('');
  el.innerHTML=`
    <p class="screen-hint">מערכת IALA אזור A · האור מהבהב במקצב האמיתי · לחצו למידע מלא</p>
    <div class="chipbar" style="padding:0 0 10px">${chips}</div>
    <div class="grid">${cards}</div>
    <div class="card" style="padding:12px;margin-top:14px;font-size:.8rem" id="memoCard">
      <b style="color:var(--parchment)">טריק לזכירת קרדינליים:</b>
      מספר ההבהובים כמו שעון — מזרח 3 (03:00), דרום 6 (06:00), מערב 9 (09:00), צפון — רצוף (12).
      דרומי מוסיף הבהוב ארוך אחרי ה‑6 כדי שלא יתבלבל.
    </div>`;
  App.$$('.chip',el).forEach(c=>c.addEventListener('click',()=>{ group=c.dataset.g; App.sfx('click'); App.render(); }));
  App.$$('.tile[data-mark]',el).forEach(t=>{
    const m=R.marks.find(x=>x.id===t.dataset.mark);
    const body=`<div style="max-width:130px;margin:0 auto">${Draw.buildMarkSVG(m)}</div>
      <p>${App.esc(m.meaning)}</p>
      <p class="muted" style="font-size:.86rem"><b>ביום:</b> ${App.esc(Draw.markDayDesc(m))}<br>
      <b>בלילה:</b> ${App.esc(m.light.rhythm)}</p>
      <p><span class="ref">${App.esc(m.ref.colreg)}</span></p>`;
    const open=()=>App.openSheet(m.name,body);
    t.addEventListener('click',open);
    t.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();open();}});
  });
  Draw.startMarkTicker();
}});
})();
