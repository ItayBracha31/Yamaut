/* ============================================================================
   flags.js — דגלי קוד בינלאומי (ICS)
   ========================================================================== */
(function(){
"use strict";

/* אילו דגלים מופיעים בפועל במאגר הבחינה הרשמי — נגזר אוטומטית מהמאגר (App.deriveExamFlags,
   ראו core.js), משותף גם לחידון (שאלות דגלים). נקרא בזמן render כדי לשקף עדכון חי של המאגר.
   "נס אדום" הוא אות ישראלי נפרד ואינו דגל ICS — לא נכלל. */
function tile(f){
  return `<div class="tile flagtile" role="button" tabindex="0" data-flag="${f.letter}">
    <div class="flagimg">${Draw.drawFlag(f)}</div>
    <div class="nm">${App.esc(f.letter)} · ${App.esc(f.phonetic.split(' ')[0])}</div></div>`;
}

App.registerView('flags',{render(el){
  const R=App.R;
  const EXAM_FLAGS=new Set(R.examFlags||[]);
  const grid=list=>`<div class="grid small">${list.map(tile).join('')}</div>`;
  const inExam=R.flags.filter(f=>EXAM_FLAGS.has(f.letter));
  const notExam=R.flags.filter(f=>!EXAM_FLAGS.has(f.letter));
  el.innerHTML=`
    <p class="screen-hint">דגלי הקוד הבינלאומי · דגל אות בודד ומשמעותו · לחצו לפרטים</p>
    <h3 class="flag-group">מופיעים בבחינה <span class="flag-count">${inExam.length}</span></h3>
    <p class="flag-note">דגלים אלו מופיעים במאגר השאלות הרשמי — כדאי לשלוט בהם היטב.</p>
    ${grid(inExam)}
    <h3 class="flag-group">להעשרה · לא בבחינה <span class="flag-count">${notExam.length}</span></h3>
    <p class="flag-note">שאר דגלי הקוד הבינלאומי. לא נבחנים עליהם, אך טוב להכירם.</p>
    ${grid(notExam)}`;
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
