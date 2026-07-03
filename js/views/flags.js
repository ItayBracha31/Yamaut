/* ============================================================================
   flags.js — דגלי קוד בינלאומי (ICS)
   ========================================================================== */
(function(){
"use strict";
App.registerView('flags',{render(el){
  const R=App.R;
  const cards=R.flags.map(f=>`<div class="tile flagtile" role="button" tabindex="0" data-flag="${f.letter}">
    <div class="flagimg">${Draw.drawFlag(f)}</div><div class="nm">${App.esc(f.letter)} · ${App.esc(f.phonetic.split(' ')[0])}</div></div>`).join('');
  el.innerHTML=`<div class="section-title"><h2>דגלי קוד בינלאומי (ICS)</h2>
    <span class="hint">דגל אות בודד ומשמעותו. לחצו לפרטים.</span></div><div class="grid small">${cards}</div>`;
  App.$$('.flagtile',el).forEach(t=>{
    const f=R.flags.find(x=>x.letter===t.dataset.flag);
    const open=()=>App.openSheet('דגל '+f.letter+' · '+f.phonetic,
      `<div style="max-width:170px;margin:0 auto 10px">${Draw.drawFlag(f)}</div>
       <p>${App.esc(f.meaning)}</p><p><span class="ref">${App.esc(f.ref.colreg)}</span></p>`);
    t.addEventListener('click',open);
    t.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();open();}});
  });
}});
})();
