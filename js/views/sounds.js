/* ============================================================================
   sounds.js — אותות קול, עם הדגשה חזותית של כל צפירה בזמן הנגינה
   ========================================================================== */
(function(){
"use strict";

/* מנגן ומדגיש את התבנית בהתאם לתזמון האמיתי של core.playSeq.
   משכי הקודים תואמים ל-App.playSeq: S/L צפירות, B צלצול פעמון, K נקישה, G גונג.
   כשאין התאמה 1:1 בין סימני התבנית לרצף האודיו (אותות פעמון) — מדגישים את כל התבנית. */
const TOK={S:{d:700,gap:320},L:{d:1900,gap:320},B:{d:2260,gap:0},K:{d:550,gap:0},G:{d:1000,gap:0}};
function playAnimated(s, patEl){
  App.playSeq(s.audio);
  if(!patEl) return;
  const glyphs=App.$$('.beep',patEl);
  const oneToOne=glyphs.length===s.audio.length;
  let t=50;
  s.audio.forEach((b,i)=>{
    const tk=TOK[b]||TOK.S;
    const el=oneToOne?glyphs[i]:patEl;
    setTimeout(()=>{ if(el&&el.isConnected){ el.classList.remove('on'); void el.offsetWidth; el.classList.add('on');
      el.style.color='var(--brass)'; } }, t);
    setTimeout(()=>{ if(el&&el.isConnected) el.style.color=''; }, t+tk.d);
    t+=tk.d+tk.gap;
  });
}
function patternHTML(s){
  const parts=s.pattern.split(' ');
  return parts.map(p=>`<span class="beep">${App.esc(p)}</span>`).join(' ');
}

App.registerView('sounds',{render(el){
  const R=App.R;
  const groups={};
  R.sounds.forEach(s=>{ (groups[s.when]=groups[s.when]||[]).push(s); });
  let html=`<div class="section-title"><h2>אותות קול</h2>
      <span class="hint">• = צפירה קצרה (~1 שנ׳) · ▬ = צפירה ממושכת (4–6 שנ׳)</span></div>`;
  Object.keys(groups).forEach(when=>{
    html+=`<div class="section-title" style="margin-top:16px"><h2 style="font-size:.86rem;color:var(--brass)">${App.esc(when)}</h2></div>
      <div style="display:grid;gap:10px">`+
      groups[when].map(s=>`
      <div class="card sound-card" data-s="${s.id}">
        <div class="row" style="justify-content:space-between">
          <span class="pattern" data-pat="${s.id}">${patternHTML(s)}</span>
          <button class="btn primary play" data-s="${s.id}">▶ נגן</button>
        </div>
        <div class="meaning">${App.esc(s.meaning)}</div>
        <div class="row" style="justify-content:flex-end">
          <span class="ref">${App.esc(s.ref.colreg)}</span>
        </div>
      </div>`).join('')+`</div>`;
  });
  el.innerHTML=html;
  App.$$('.play',el).forEach(b=>b.addEventListener('click',()=>{
    const s=R.sounds.find(x=>x.id===b.dataset.s);
    playAnimated(s, App.$('[data-pat="'+s.id+'"]',el));
  }));
}});
})();
