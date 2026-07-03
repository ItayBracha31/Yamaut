/* ============================================================================
   quiz.js — חידון: שאלות שנוצרות אוטומטית מהתקנות + סינון נושאים,
   קומבו, XP, וחפיסת חזרה על טעויות.
   window.QuizGen חשוף גם לתצוגות אחרות (review).
   ========================================================================== */
(function(){
"use strict";
const G = window.QuizGen = {};

/* ---------- עזרי מחולל ---------- */
function uniqueOptions(correct,poolFn,n){
  const opts=[correct]; let guard=0;
  while(opts.length<n && guard++<200){ const c=poolFn(); if(c && !opts.includes(c)) opts.push(c); }
  return opts;
}
/* רק כלי שיט עם חתימה ייחודית יכולים להיות נושא לשאלת זיהוי —
   אחרת יש שתי תשובות נכונות לאותה תמונה */
let _IDPOOLS=null;
function idPools(){
  if(_IDPOOLS)return _IDPOOLS;
  const R=App.R;
  const idable=R.vessels.filter(v=>!v.idAmbiguous);
  const ws=idable.filter(v=>v.shapes.length);
  const cnt=(arr,f)=>{const m={};arr.forEach(v=>{const k=f(v);m[k]=(m[k]||0)+1;});return m;};
  const nc=cnt(idable,Draw.describeNight), dc=cnt(ws,Draw.describeDay);
  _IDPOOLS={ night:idable.filter(v=>nc[Draw.describeNight(v)]===1),
             day:  ws.filter(v=>dc[Draw.describeDay(v)]===1) };
  return _IDPOOLS;
}

/* ---------- מחוללים (כל אחד מחזיר שאלה עם topic=מזהה נושא) ---------- */
/* חתימות להשוואת מסיחים: מסיח שחתימתו זהה לנבדק עלול להיות תשובה נכונה נוספת
   (למשל צלילה מול מוגבל-בתמרון שאינו מתקדם — שניהם אדום-לבן-אדום בלבד) */
function sigNight(v){ return v.lights.filter(l=>l.place==='allround'&&!l.optional).map(l=>l.color).join(','); }
function sigDay(v){ return (v.dayFlag||'')+'|'+v.shapes.map(s=>s.shape).join(','); }
function genIdentify(allowed){
  const P=idPools(), R=App.R;
  let mode;
  const canN=P.night.length&&(!allowed||allowed.has('lights'));
  const canD=P.day.length&&(!allowed||allowed.has('shapes'));
  if(canN&&canD) mode=Math.random()<0.6?'night':'day';
  else mode=canN?'night':'day';
  const v=App.pick(mode==='night'?P.night:P.day);
  const sig=mode==='night'?sigNight:sigDay;
  const pool=R.vessels.filter(x=>x.id!==v.id && sig(x)!==sig(v)).map(x=>x.shortName);
  const opts=uniqueOptions(v.shortName,()=>App.pick(pool),4);
  return {topic:mode==='night'?'lights':'shapes', topicName:'זיהוי',
    q: mode==='night'?'איזה כלי שיט מראה את האורות הבאים? (לחצו על האורות לפרטים)':'איזה כלי שיט מראה את צורות היום הבאות?',
    options:opts, correct:v.shortName,
    explain:v.summary+' '+v.examTip, ref:v.ref.colreg,
    visual:Draw.buildVesselSVG(v,mode)};
}
function genRecallLights(){
  const R=App.R;
  const v=App.pick(R.vessels), correct=Draw.describeNight(v);
  const opts=uniqueOptions(correct,()=>Draw.describeNight(App.pick(R.vessels)),4);
  return {topic:'lights', topicName:'אורות', q:'אילו אורות מראה בלילה: '+v.name+'?', options:opts, correct, explain:v.summary, ref:v.ref.colreg};
}
function genRecallShapes(){
  const R=App.R;
  const pool=R.vessels.filter(v=>v.shapes.length);
  const v=App.pick(pool), correct=Draw.describeDay(v);
  const opts=uniqueOptions(correct,()=>Draw.describeDay(App.pick(pool)),Math.min(4,pool.length));
  return {topic:'shapes', topicName:'צורות יום', q:'אילו צורות יום מראה: '+v.name+'?', options:opts, correct, explain:v.summary, ref:v.ref.colreg};
}
function genGiveWay(){
  const R=App.R;
  const t=App.pick(['class','headon','crossing','overtaking','sail']);
  if(t==='class'){
    const H=R.giveWay.hierarchy.filter(h=>h.class!=='seaplane');
    const a=App.pick(H); const b=App.pick(H.filter(x=>x.rank!==a.rank));
    const lower=a.rank<b.rank?a:b, higher=a.rank<b.rank?b:a;
    return {topic:'giveway', topicName:'זכות קדימה',
      q:`כלי שיט ${a.name} פוגש כלי שיט ${b.name}. מי נותן זכות קדימה (give‑way)?`,
      options:[`כלי שיט ${a.name}`,`כלי שיט ${b.name}`,'שני כלי השיט מתמרנים','אף אחד — שמירת נתיב'],
      correct:`כלי שיט ${lower.name}`,
      explain:`לפי תקנה 18 (סדר העדיפויות): ${lower.name} נותן זכות קדימה ל${higher.name}.`, ref:'Rule 18'};
  }
  if(t==='headon') return {topic:'giveway', topicName:'זכות קדימה', q:'שני כלי שיט ממונעים מתקרבים חזית מול חזית. כיצד ינהגו?',
    options:['כל אחד יסטה ימינה (starboard)','כל אחד יסטה שמאלה','הקטן יפנה והגדול ימשיך','שניהם ימשיכו ישר ויאיצו'],
    correct:'כל אחד יסטה ימינה (starboard)', explain:R.giveWay.encounters.headon.rule, ref:'Rule 14'};
  if(t==='crossing'){
    const right=Math.random()<0.5;
    if(right) return {topic:'giveway', topicName:'זכות קדימה', q:'אתה (כלי שיט ממונע) רואה כלי שיט ממונע אחר בצדך הימני בחיתוך נתיבים. כיצד תנהג?',
      options:['אני נותן זכות קדימה — פונה ימינה וחולף מאחוריו','אני שומר נתיב ומהירות','אני מאיץ וחוצה לפניו','אני פונה שמאלה'],
      correct:'אני נותן זכות קדימה — פונה ימינה וחולף מאחוריו', explain:R.giveWay.encounters.crossing.rule, ref:'Rule 15'};
    return {topic:'giveway', topicName:'זכות קדימה', q:'אתה (כלי שיט ממונע) רואה כלי שיט ממונע אחר בצדך השמאלי בחיתוך נתיבים. כיצד תנהג?',
      options:['אני שומר נתיב ומהירות (stand‑on)','אני נותן זכות קדימה ופונה ימינה','אני פונה שמאלה ועוצר','אני מאיץ'],
      correct:'אני שומר נתיב ומהירות (stand‑on)', explain:'הכלי האחר נמצא בצדך השמאלי — לכן הוא זה שנותן זכות קדימה, ואתה שומר נתיב ומהירות.', ref:'Rule 15/17'};
  }
  if(t==='overtaking') return {topic:'giveway', topicName:'זכות קדימה', q:'כלי שיט מתקרב אליך מאחור (מזווית גדולה מ‑22.5° מאחורי הזרוע) כדי לעקוף. מי חייב להתרחק?',
    options:['הכלי העוקף','אתה (הנעקף)','שני הכלים','אף אחד'], correct:'הכלי העוקף', explain:R.giveWay.encounters.overtaking.rule, ref:'Rule 13'};
  const diff=Math.random()<0.5;
  if(diff) return {topic:'giveway', topicName:'זכות קדימה', q:'מפרשית א׳ — הרוח בצדה השמאלי (port). מפרשית ב׳ — הרוח בצדה הימני (starboard). מי נותנת זכות קדימה?',
    options:['מפרשית א׳ (הרוח משמאל)','מפרשית ב׳ (הרוח מימין)','שתיהן','אף אחת'], correct:'מפרשית א׳ (הרוח משמאל)',
    explain:R.giveWay.sailTacks.rules[0], ref:'Rule 12'};
  return {topic:'giveway', topicName:'זכות קדימה', q:'לשתי מפרשיות הרוח באותו צד. א׳ נמצאת לרוח (windward) ו‑ב׳ מתחת לרוח (leeward). מי נותנת זכות קדימה?',
    options:['מפרשית א׳ (windward)','מפרשית ב׳ (leeward)','שתיהן','אף אחת'], correct:'מפרשית א׳ (windward)',
    explain:R.giveWay.sailTacks.rules[1], ref:'Rule 12'};
}
function genSound(){
  const R=App.R;
  const uniqPat=R.sounds.filter(s=>R.sounds.filter(o=>o.pattern===s.pattern).length===1);
  if(Math.random()<0.5 && uniqPat.length){
    const s=App.pick(uniqPat);
    const opts=uniqueOptions(s.meaning,()=>App.pick(R.sounds).meaning,4);
    return {topic:'sounds', topicName:'אותות קול', q:'מה משמעות אות הקול הבא?', patternBig:s.pattern, audio:s.audio,
      options:opts, correct:s.meaning, explain:'('+s.when+')', ref:s.ref.colreg};
  }
  const s=App.pick(R.sounds);
  const opts=uniqueOptions(s.pattern,()=>App.pick(R.sounds).pattern,4);
  return {topic:'sounds', topicName:'אותות קול', q:'באיזה אות קול משתמשים עבור: «'+s.meaning+'»?',
    options:opts, correct:s.pattern, explain:'('+s.when+')', ref:s.ref.colreg, mono:true};
}
function genMark(){
  const R=App.R;
  const m=App.pick(R.marks);
  if(Math.random()<0.5){
    const opts=uniqueOptions(m.meaning,()=>App.pick(R.marks).meaning,4);
    return {topic:'marks', topicName:'מצופים', q:'מה תפקיד המצוף הבא?', visual:Draw.buildMarkSVG(m),
      options:opts, correct:m.meaning, explain:'ביום: '+Draw.markDayDesc(m)+'. בלילה: '+m.light.rhythm, ref:m.ref.colreg};
  }
  const opts=uniqueOptions(m.light.rhythm,()=>App.pick(R.marks).light.rhythm,4);
  return {topic:'marks', topicName:'מצופים', q:'מהו מקצב האור של '+m.name+'?', options:opts, correct:m.light.rhythm,
    explain:'ביום: '+Draw.markDayDesc(m), ref:m.ref.colreg};
}
function genFlag(){
  const R=App.R;
  const f=App.pick(R.flags);
  if(Math.random()<0.6){
    const opts=uniqueOptions(f.meaning,()=>App.pick(R.flags).meaning,4);
    return {topic:'flags', topicName:'דגלים', q:'מה משמעות הדגל הבא?',
      visual:`<div style="display:flex;justify-content:center;padding:14px"><div style="width:160px">${Draw.drawFlag(f)}</div></div>`,
      options:opts, correct:f.meaning, explain:'דגל '+f.letter+' · '+f.phonetic, ref:f.ref.colreg};
  }
  const opts=uniqueOptions(f.phonetic,()=>App.pick(R.flags).phonetic,4);
  return {topic:'flags', topicName:'דגלים', q:'באיזה דגל משתמשים עבור: «'+f.meaning+'»?', options:opts, correct:f.phonetic, explain:'דגל '+f.letter, ref:f.ref.colreg};
}

G.TOPICS=[
  {id:'lights', name:'אורות', ic:'bulb'},
  {id:'shapes', name:'צורות יום', ic:'shapes'},
  {id:'giveway', name:'זכות קדימה', ic:'scale'},
  {id:'sounds', name:'אותות קול', ic:'horn'},
  {id:'marks', name:'מצופים', ic:'buoy'},
  {id:'flags', name:'דגלים', ic:'flag'}
];
const GENS=[
  {fn:genIdentify, topics:['lights','shapes'], w:2},
  {fn:genRecallLights, topics:['lights'], w:1},
  {fn:genRecallShapes, topics:['shapes'], w:1},
  {fn:genGiveWay, topics:['giveway'], w:2},
  {fn:genSound, topics:['sounds'], w:1},
  {fn:genMark, topics:['marks'], w:2},
  {fn:genFlag, topics:['flags'], w:1}
];
G.newQuestion = allowed=>{
  const pool=[];
  GENS.forEach(g=>{ if(!allowed || g.topics.some(t=>allowed.has(t))) for(let i=0;i<g.w;i++) pool.push(g); });
  if(!pool.length) return null;
  const q=App.pick(pool).fn(allowed);
  q.options=App.shuffle(q.options);
  return q;
};
function sigOf(q){ let h=0; const s=q.q+'|'+q.correct; for(let i=0;i<s.length;i++)h=(h*31+s.charCodeAt(i))|0; return 'g'+Math.abs(h); }
G.sigOf=sigOf;

/* ---------- הצגת שאלה (משותף לחידון ולחזרה) ---------- */
/* opts: {onAnswered(ok), showTopic, headerHTML} */
G.renderQuestion = (el,q,opts)=>{
  opts=opts||{};
  el.innerHTML=`
    <div class="card quiz">
      ${opts.headerHTML||''}
      <div class="scorebar">
        <span class="topicpill">${App.esc(q.topicName||'')}</span>
        <span id="qFeedback"></span>
      </div>
      <div class="qtext">${App.esc(q.q)}</div>
      ${q.patternBig?`<div class="pattern" style="text-align:center;margin:6px 0">${App.esc(q.patternBig)}</div>`:''}
      ${q.audio?`<div class="row" style="justify-content:center;margin-bottom:10px"><button class="btn primary" id="qplay">נגן את האות</button></div>`:''}
      ${q.visual?`<div class="visual">${q.visual}</div>${/nf-hot/.test(q.visual)?'<div class="clickhint">לחצו על האורות/הצורות לפרטים</div>':''}`:''}
      <div id="opts">${q.options.map((o,i)=>`<button class="opt" data-i="${i}" ${q.mono?'style="font-family:var(--mono);font-size:1.15rem;letter-spacing:.12em"':''}>${App.esc(o)}</button>`).join('')}</div>
      <div id="qexp"></div>
      <div class="row" style="justify-content:flex-end;margin-top:12px"><button class="btn primary" id="nextQ" style="display:none">שאלה הבאה ←</button></div>
    </div>`;
  if(q.audio){ const p=App.$('#qplay',el); p.addEventListener('click',()=>App.playSeq(q.audio)); }
  let answered=false;
  App.$$('#opts .opt',el).forEach(b=>b.addEventListener('click',()=>{
    if(answered)return; answered=true;
    const chosen=q.options[+b.dataset.i], ok=chosen===q.correct;
    App.$$('#opts .opt',el).forEach(x=>{x.disabled=true; if(q.options[+x.dataset.i]===q.correct)x.classList.add('correct');});
    if(!ok){ b.classList.add('wrong'); b.classList.add('shake'); }
    App.$('#qexp',el).innerHTML=`<div class="explain"><span class="lbl">${ok?'נכון! ':'התשובה הנכונה מסומנת. '}</span><br>${App.esc(q.explain)} <span class="ref">${App.esc(q.ref)}</span></div>`;
    const nb=App.$('#nextQ',el); nb.style.display='inline-block'; nb.focus({preventScroll:true});
    if(opts.onAnswered) opts.onAnswered(ok,nb);
  }));
  return {nextBtn:()=>App.$('#nextQ',el)};
};

/* ---------- תצוגת החידון ---------- */
const st={allowed:null, q:null, correct:0, total:0};
App.registerView('quiz',{render(el){
  if(!st.allowed) st.allowed=new Set(G.TOPICS.map(t=>t.id));
  paint(el);
}});
function paint(el){
  if(!st.q) st.q=G.newQuestion(st.allowed);
  const chips=G.TOPICS.map(t=>`<button class="chip" data-t="${t.id}" aria-pressed="${st.allowed.has(t.id)}">${App.icon(t.ic,14)} ${t.name}</button>`).join('');
  const acc=st.total?Math.round(st.correct/st.total*100):0;
  el.innerHTML=`
    <div class="section-title"><h2>חידון</h2>
      <span class="hint">שאלות נוצרות אוטומטית מהתקנות — אינסוף תרגול.</span></div>
    <details class="typesel"><summary>נושאים · נבחרו ${st.allowed.size}/${G.TOPICS.length}</summary>
      <div class="chipbar">${chips}</div>
      <div class="row" style="padding:0 12px 10px"><button class="btn ghost mini" id="selAll">בחר הכל</button></div>
    </details>
    <div class="scorebar" style="display:flex;justify-content:space-between;font-size:.78rem;color:var(--ink-dim);padding:6px 4px">
      <span>ציון: ${st.correct}/${st.total} ${st.total?'('+acc+'%)':''}</span>
      <span>${App.combo()>=3?'<span class="combo">קומבו ×'+App.combo()+'</span>':''}</span>
    </div>
    <div id="qhost"></div>`;
  App.$$('.chip',el).forEach(c=>c.addEventListener('click',()=>{
    const t=c.dataset.t;
    if(st.allowed.has(t)){ if(st.allowed.size>1) st.allowed.delete(t); } else st.allowed.add(t);
    st.q=null; paint(el);
  }));
  App.$('#selAll').addEventListener('click',()=>{ st.allowed=new Set(G.TOPICS.map(t=>t.id)); st.q=null; paint(el); });
  const q=st.q;
  if(!q){ App.$('#qhost').innerHTML='<div class="card" style="padding:18px;text-align:center">בחרו לפחות נושא אחד.</div>'; return; }
  G.renderQuestion(App.$('#qhost'), q, {
    onAnswered:(ok)=>{
      st.total++; if(ok)st.correct++;
      const res=App.recordAnswer(q.topic, ok, ok?null:{sig:sigOf(q), kind:'gen', topic:q.topic, q:q});
      const fb=App.$('#qFeedback');
      if(fb) fb.innerHTML= ok?`<span class="combo" dir="ltr">+${res.xp} XP</span>`:'';
      const nb=App.$('#nextQ');
      nb.addEventListener('click',()=>{ st.q=G.newQuestion(st.allowed); paint(el); });
    }
  });
}
})();
