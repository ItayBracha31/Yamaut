/* ============================================================================
   review.js — חזרה על טעויות: כל שאלה שטעיתם בה חוזרת עד שעונים נכון פעמיים.
   ========================================================================== */
(function(){
"use strict";
const st={cur:null};

function toRenderable(item){
  if(item.kind==='gen') return item.q;
  if(item.kind==='exam' && window.EXAM_BANK){
    const q=window.EXAM_BANK.questions.find(x=>x.id===item.id);
    if(!q) return null;
    let qText=q.q, explain=q.explain||'';
    // שאלת איור — מוסיפים את התיאור החזותי לשאלה ואת הפירוש המלא להסבר
    const F=window.EXAM_FIGURES;
    if(q.figure && q.figure>0 && F && F[String(q.figure)]){
      const d=F[String(q.figure)].desc||'';
      const i=d.lastIndexOf(':');
      qText+=' [תמונה '+q.figure+': '+(i>0?d.slice(0,i):d).trim()+']';
      explain=(explain?explain+' ':'')+'תמונה '+q.figure+': '+d;
    }
    return {topic:item.topic||'exam', topicName:'מאגר רשמי', q:qText, options:q.options.slice(),
      correct:q.options[q.correct], explain:explain, ref:'מאגר משרד התחבורה'};
  }
  return null;
}

App.registerView('review',{render(el){ paint(el); }});

function paint(el){
  const deck=App.store.review;
  if(!deck.length){
    st.cur=null;
    el.innerHTML=`
      <div class="section-title"><h2>חזרה על טעויות</h2></div>
      <div class="card" style="padding:28px;text-align:center">
        <div style="color:var(--good)">${App.icon('broom',40)}</div>
        <p style="font-weight:800;color:var(--parchment)">אין טעויות לחזרה — הסיפון נקי!</p>
        <p class="muted" style="font-size:.84rem">כל שאלה שטועים בה (בחידון או במבחן) נכנסת לכאן,
        ויוצאת רק אחרי שעונים עליה נכון פעמיים.</p>
        <button class="btn primary" id="goQuiz">לחידון ←</button>
      </div>`;
    App.$('#goQuiz').addEventListener('click',()=>App.navigate('practice','quiz'));
    return;
  }
  // בוחרים את הפריט עם הכי הרבה טעויות (ואקראי בין שווים)
  if(!st.cur || !deck.some(d=>d.sig===st.cur.sig)){
    const maxWrong=Math.max(...deck.map(d=>d.wrong||1));
    st.cur=App.pick(deck.filter(d=>(d.wrong||1)===maxWrong));
  }
  const item=st.cur;
  const q=toRenderable(item);
  if(!q){ // פריט לא ניתן לשחזור — מסירים
    App.store.review=deck.filter(d=>d.sig!==item.sig); App.save(); st.cur=null; paint(el); return;
  }
  q.options=App.shuffle(q.options);
  el.innerHTML=`
    <div class="section-title"><h2>חזרה על טעויות</h2>
      <span class="hint">${deck.length} שאלות בחפיסה · נכון פעמיים = יוצאת</span></div>
    <div id="qhost"></div>`;
  QuizGen.renderQuestion(App.$('#qhost'), q, {
    headerHTML:`<div style="font-size:.72rem;color:var(--ink-dim);margin-bottom:6px">טעויות קודמות: ${item.wrong||1} · תשובות נכונות ברצף: ${item.ok||0}/2</div>`,
    onAnswered:(ok)=>{
      App.reviewResolve(item.sig, ok);
      App.recordAnswer(item.topic||'exam', ok, null);
      App.$('#nextQ').addEventListener('click',()=>{ st.cur=null; paint(el); });
    }
  });
}
})();
