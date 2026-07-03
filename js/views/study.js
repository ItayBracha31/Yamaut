/* ============================================================================
   study.js — לומדה: אורות וצורות של כלי שיט (גלריה + פירוט + מצב כרטיסיות)
   ========================================================================== */
(function(){
"use strict";
const st={vessel:null, mode:'both', flash:false, flashIdx:0, flashRevealed:false};

function gallery(el){
  const R=App.R, v=Draw.vById(st.vessel), mode=st.mode;
  const tiles=R.vessels.map(x=>`<div class="tile" role="button" tabindex="0" data-v="${x.id}" aria-current="${x.id===v.id}">
     ${Draw.buildVesselSVG(x,'night')}<div class="nm">${App.esc(x.shortName)}</div></div>`).join('');
  const night=Draw.describeNight(v), day=Draw.describeDay(v);
  const idx=R.vessels.indexOf(v);
  el.innerHTML=`
    <div class="section-title"><h2>לומדה — אורות וצורות</h2>
      <span class="hint">בחרו כלי שיט. לחצו על כל אור/צורה להסבר.</span>
      <span class="grow"></span>
      <button class="btn mini" id="flashBtn">מצב כרטיסיות</button></div>
    <div class="grid">${tiles}</div>
    <div class="card detail" id="detail">
      <div class="row" style="justify-content:space-between">
        <div class="seg" role="group" aria-label="תצוגה">
          <button data-m="day"   aria-pressed="${mode==='day'}">יום</button>
          <button data-m="night" aria-pressed="${mode==='night'}">לילה</button>
          <button data-m="both"  aria-pressed="${mode==='both'}">שניהם</button>
        </div>
        <span class="ref">${App.esc(v.ref.colreg)}</span>
      </div>
      <div class="clickhint">↓ לחצו על אור או צורה לקבלת הסבר ↓</div>
      <div class="stage">${Draw.buildVesselSVG(v,mode)}</div>
      <div class="row" style="justify-content:space-between;margin-top:6px">
        <button class="btn mini ghost" id="prevV" ${idx===0?'disabled':''}>→ הקודם</button>
        <h3 style="margin:0">${App.esc(v.name)}</h3>
        <button class="btn mini ghost" id="nextV" ${idx===R.vessels.length-1?'disabled':''}>הבא ←</button>
      </div>
      <p class="sum">${App.esc(v.summary)}</p>
      <p class="muted" style="font-size:.84rem"><b>בלילה:</b> ${App.esc(night)}<br><b>ביום:</b> ${App.esc(day)}</p>
      ${v.note?`<p class="muted" style="font-size:.82rem;line-height:1.5">${App.esc(v.note)}</p>`:''}
      <div class="tip">${App.icon('bulb',14)} ${App.esc(v.examTip)}</div>
    </div>`;
  App.$$('.tile',el).forEach(t=>{
    const go=()=>{ st.vessel=t.dataset.v; App.sfx('click'); paint(el);
      const d=App.$('#detail'); if(d) window.scrollTo({top:d.offsetTop-70,behavior:'smooth'}); };
    t.addEventListener('click',e=>{ if(!e.target.closest('.nf-hot'))go(); });
    t.addEventListener('keydown',e=>{ if(e.key==='Enter'||e.key===' '){e.preventDefault();go();} });
  });
  App.$$('.seg button',el).forEach(b=>b.addEventListener('click',()=>{ st.mode=b.dataset.m; paint(el); }));
  App.$('#prevV').addEventListener('click',()=>{ st.vessel=R.vessels[idx-1].id; paint(el); });
  App.$('#nextV').addEventListener('click',()=>{ st.vessel=R.vessels[idx+1].id; paint(el); });
  App.$('#flashBtn').addEventListener('click',()=>{ st.flash=true; st.flashIdx=0; st.flashRevealed=false; st.deck=App.shuffle(R.vessels.map(v=>v.id)); paint(el); });
}

/* מצב כרטיסיות: מציג את הציור — נסו להיזכר, הפכו, דרגו את עצמכם */
function flashcards(el){
  const R=App.R;
  if(!st.deck||!st.deck.length) st.deck=App.shuffle(R.vessels.map(v=>v.id));
  if(st.flashIdx>=st.deck.length){ st.flashIdx=0; st.deck=App.shuffle(st.deck); }
  const v=Draw.vById(st.deck[st.flashIdx]);
  const mode=Math.random()<0.5?'night':'day';
  // נעילת מצב לכרטיס הנוכחי (לא להגריל מחדש בכל ציור)
  if(!st.cardMode||st.cardKey!==v.id+':'+st.flashIdx){ st.cardMode=mode; st.cardKey=v.id+':'+st.flashIdx; }
  el.innerHTML=`
    <div class="section-title"><h2>כרטיסיות — אורות וצורות</h2>
      <span class="hint">כרטיס ${st.flashIdx+1}/${st.deck.length}</span>
      <span class="grow"></span>
      <button class="btn mini" id="backBtn">חזרה לגלריה</button></div>
    <div class="card detail">
      <div class="stage">${Draw.buildVesselSVG(v,st.cardMode)}</div>
      ${st.flashRevealed?`
        <h3>${App.esc(v.name)}</h3>
        <p class="sum">${App.esc(v.summary)}</p>
        <div class="tip">${App.icon('bulb',14)} ${App.esc(v.examTip)}</div>
        <div class="row" style="margin-top:12px;justify-content:center">
          <button class="btn" id="hardBtn">לא ידעתי</button>
          <button class="btn primary" id="easyBtn">✓ ידעתי</button>
        </div>`
      :`
        <p class="sum" style="text-align:center">איזה כלי שיט זה? (${st.cardMode==='night'?'לילה':'יום'})</p>
        <div class="row" style="justify-content:center">
          <button class="btn primary" id="revealBtn">הפוך את הכרטיס</button>
        </div>`}
    </div>`;
  App.$('#backBtn').addEventListener('click',()=>{ st.flash=false; paint(el); });
  if(st.flashRevealed){
    const next=ok=>{ App.recordAnswer(st.cardMode==='night'?'lights':'shapes', ok, null);
      st.flashIdx++; st.flashRevealed=false; paint(el); };
    App.$('#easyBtn').addEventListener('click',()=>next(true));
    App.$('#hardBtn').addEventListener('click',()=>next(false));
  } else {
    App.$('#revealBtn').addEventListener('click',()=>{ st.flashRevealed=true; App.sfx('click'); paint(el); });
  }
}

function paint(el){ st.flash ? flashcards(el) : gallery(el); }

App.registerView('study',{render(el){
  if(!st.vessel) st.vessel=App.R.vessels[0].id;
  paint(el);
}});
})();
