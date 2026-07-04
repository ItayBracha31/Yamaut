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
  // רק דגלים שמופיעים בבחינה (שאר הדגלים נשארים במסך הלימוד בלבד). fallback: כל הדגלים.
  const pool=(R.examFlags&&R.examFlags.length) ? R.flags.filter(f=>R.examFlags.includes(f.letter)) : R.flags;
  const f=App.pick(pool);
  if(Math.random()<0.6){
    const opts=uniqueOptions(f.meaning,()=>App.pick(pool).meaning,4);
    return {topic:'flags', topicName:'דגלים', q:'מה משמעות הדגל הבא?',
      visual:`<div style="display:flex;justify-content:center;padding:14px"><div style="width:160px">${Draw.drawFlag(f)}</div></div>`,
      options:opts, correct:f.meaning, explain:'דגל '+f.letter+' · '+f.phonetic, ref:f.ref.colreg};
  }
  // "באיזה דגל...": מציגים את הדגלים כאפשרויות חזותיות (לא רק שם פונטי).
  // optionVisual ממופה לפי טקסט האפשרות — כך הוא נשאר מסונכרן גם אחרי ערבוב האפשרויות.
  const optFlags=uniqueOptions(f,()=>App.pick(pool),4);
  const optionVisual={};
  optFlags.forEach(x=>{ optionVisual[x.phonetic]=`<div style="width:66px;margin:0 auto 5px">${Draw.drawFlag(x)}</div>`; });
  return {topic:'flags', topicName:'דגלים', q:'באיזה דגל משתמשים עבור: «'+f.meaning+'»?',
    options:optFlags.map(x=>x.phonetic), correct:f.phonetic, explain:'דגל '+f.letter, ref:f.ref.colreg, optionVisual};
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
      <div id="opts" ${q.optionVisual?'class="opts-visual"':''}>${q.options.map((o,i)=>`<button class="opt${q.optionVisual?' opt-vis':''}" data-i="${i}" ${q.mono?'style="font-family:var(--mono);font-size:1.15rem;letter-spacing:.12em"':''}>${q.optionVisual&&q.optionVisual[o]?q.optionVisual[o]:''}<span>${App.esc(o)}</span></button>`).join('')}</div>
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
    if(ok) App.confetti(38+Math.min(App.combo(),12)*9);   // מנת דופמין — הפיצוץ גדל עם הקומבו
  }));
  return {nextBtn:()=>App.$('#nextQ',el)};
};

/* ---------- קטגוריות‑אב (מקצועות עיוניים) ותתי‑נושאים ----------
   gen  = נושאי מחולל COLREG (שאלות אינסופיות מצוירות);
   bank = נושאי המאגר הרשמי שתת‑הנושא כולל;
   sub  = תת‑קטגוריות (מחרוזות) מתוך שדה sub של השאלה במאגר;
   rest = "כללי" — קולט כל שאלה בנושא שלא שובצה לתת‑נושא אחר.
   כך כל שאלת מאגר משובצת לתת‑נושא אחד בדיוק (כיסוי מלא של הסילבוס). */
const CATS=[
  {id:'yam', name:'ימאות', ic:'anchor', subs:[
    {id:'colreg', name:'חוקי הדרך', gen:['lights','shapes','giveway','sounds','marks','flags'], bank:['rules','rules_dq']},
    {id:'safety', name:'בטיחות', bank:['safety']},
    {id:'proc',   name:'נהלים', bank:['procedures']},
    {id:'emerg',  name:'חירום ומצוקה', bank:['emergency']},
    {id:'weather',name:'מזג אוויר', bank:['weather']},
    {id:'ygen',   name:'כללי', bank:['general']}
  ]},
  {id:'inst', name:'ניווט (מכשירים)', ic:'target', subs:[
    {id:'i_compass', name:'מצפן', bank:['inst'], sub:['מצפן']},
    {id:'i_map',     name:'מפה וקווים', bank:['inst'], sub:['מפה','קווים']},
    {id:'i_pos',     name:'מערכות מיקום', bank:['inst'], sub:['מיקום']},
    {id:'i_time',    name:'זמן ואסטרונומיה', bank:['inst'], sub:['זמן','אסטרונומיה']},
    {id:'i_comm',    name:'תדרים ו‑NAVTEX', bank:['inst'], sub:['תדר','NAVTEX']},
    {id:'i_meas',    name:'כלי מדידה', bank:['inst'], sub:['מדידה']},
    {id:'i_gen',     name:'כללי', bank:['inst'], rest:true}
  ]},
  {id:'mech', name:'מכונאות וחשמל', ic:'gear', subs:[
    {id:'m_eng',   name:'מנועים', bank:['mech'], sub:['מנוע']},
    {id:'m_elec',  name:'חשמל', bank:['mech'], sub:['חשמל']},
    {id:'m_fault', name:'תקלות', bank:['mech'], sub:['תקלות']},
    {id:'m_pump',  name:'משאבות וקירור', bank:['mech'], sub:['משאב','קרור']},
    {id:'m_steer', name:'הגה', bank:['mech'], sub:['הגה']},
    {id:'m_gen',   name:'כללי', bank:['mech'], rest:true}
  ]}
];
const SUBS={}; CATS.forEach(c=>c.subs.forEach(s=>{ SUBS[s.id]=s; }));

/* אינדקס: תת‑נושא → מערך שאלות מהמאגר. שיבוץ מלא — כל שאלה נכנסת לתת‑נושא יחיד. */
let _bankIdx=null;
function bankIndex(){
  if(_bankIdx) return _bankIdx;
  _bankIdx={}; CATS.forEach(c=>c.subs.forEach(s=>_bankIdx[s.id]=[]));
  const b=window.EXAM_BANK;
  if(b&&b.questions) b.questions.forEach(q=>{
    CATS.forEach(cat=>{
      const subs=cat.subs.filter(s=>s.bank&&s.bank.includes(q.topic));
      if(!subs.length) return;
      const t=subs.find(s=>s.sub&&s.sub.some(x=>(q.sub||'').indexOf(x)>=0)) || subs.find(s=>s.rest) || subs[subs.length-1];
      _bankIdx[t.id].push(q);
    });
  });
  return _bankIdx;
}
function subCount(s){ if(s.gen) return '∞'; const a=bankIndex()[s.id]; return a?a.length:0; }

/* התאמת שאלת מאגר ל‑renderable (עם האיור הרשמי מהחוברת אם קיים) */
function bankVisual(q){
  if(!q.figure||q.figure<=0) return '';
  const img=window.EXAM_FIGURE_IMGS && window.EXAM_FIGURE_IMGS[String(q.figure)];
  return img ? `<div class="visual" style="display:flex;flex-direction:column;align-items:center;gap:6px;padding:12px;background:#fdfdfa">
    <img src="${img}" alt="תמונה ${q.figure}" loading="lazy" style="max-width:min(320px,100%);height:auto;border-radius:6px">
    <div class="muted" style="font-size:.72rem">תמונה ${q.figure} — מהחוברת הרשמית</div></div>` : '';
}
function bankRenderable(q){
  const F=window.EXAM_FIGURES, fs=(q.figure&&q.figure>0&&F)?F[String(q.figure)]:null;
  const visual=bankVisual(q);
  let qText=q.q, explain='';
  if(fs){
    explain='תמונה '+q.figure+': '+(fs.desc||'');
    if(!visual){ const d=fs.desc||'', i=d.lastIndexOf(':'); qText+=' [תמונה '+q.figure+': '+(i>0?d.slice(0,i):d).trim()+']'; }
  }
  return {topic:q.topic, topicName:'מאגר רשמי', q:qText, options:App.shuffle(q.options.slice()),
    correct:q.options[q.correct], explain, ref:'מאגר משרד התחבורה', visual, _bankId:q.id};
}

/* ---------- תצוגת החידון ---------- */
const st={selected:null, genFilter:null, openCats:null, q:null, correct:0, total:0};
/* כניסה מסוננת (ממסלול ההפלגה): חידון על נושא COLREG ספציפי — בוחר את "חוקי הדרך" ומגביל את המחולל */
G.setFilter = ids=>{ st.genFilter=new Set(ids); st.genFilterFresh=true; st.selected=new Set(['colreg']); st.openCats=new Set(['yam']); st.q=null; };

function buildQuestion(){
  const sel=st.selected?[...st.selected]:[];
  if(!sel.length) return null;
  const sources=[];
  const legFiltered = !!(st.genFilter&&st.genFilter.size);   // כניסה מתחנת מסלול → מחולל בלבד
  sel.forEach(id=>{
    const s=SUBS[id]; if(!s) return;
    if(s.gen) sources.push({kind:'gen', topics:s.gen});
    if(!legFiltered){
      const bq=bankIndex()[id];
      if(bq&&bq.length) sources.push({kind:'bank', pool:bq});
    }
  });
  if(!sources.length) return null;
  const src=App.pick(sources);
  if(src.kind==='gen'){
    let topics=src.topics;
    if(st.genFilter&&st.genFilter.size){ const f=topics.filter(t=>st.genFilter.has(t)); if(f.length) topics=f; }
    return G.newQuestion(new Set(topics));
  }
  return bankRenderable(App.pick(src.pool));
}

App.registerView('quiz',{render(el){
  if(!st.selected) st.selected=new Set(['colreg']);
  if(!st.openCats) st.openCats=new Set(['yam']);
  if(st.genFilter && !st.genFilterFresh) st.genFilter=null;   // סינון‑תחנה חד‑פעמי — לא נדבק לביקור הבא
  st.genFilterFresh=false;
  st.q=null;                                                  // שאלה טרייה בכל כניסה למסך (מונע מענה כפול)
  paint(el);
}});
function paint(el){
  if(!st.q) st.q=buildQuestion();
  const acc=st.total?Math.round(st.correct/st.total*100):0;
  const cats=CATS.map(cat=>{
    const chips=cat.subs.map(s=>`<button class="chip" data-sub="${s.id}" aria-pressed="${st.selected.has(s.id)}">${App.esc(s.name)} <span class="chip-n">${subCount(s)}</span></button>`).join('');
    const sc=cat.subs.filter(s=>st.selected.has(s.id)).length;
    return `<details class="typesel" data-cat="${cat.id}" ${st.openCats.has(cat.id)?'open':''}>
      <summary>${App.icon(cat.ic,15)} ${App.esc(cat.name)} <span class="cat-sel">${sc}/${cat.subs.length}</span></summary>
      <div class="chipbar">${chips}</div></details>`;
  }).join('');
  el.innerHTML=`
    <div class="section-title"><h2>חידון עיוני</h2>
      <span class="hint">בחרו מקצוע ותת‑נושא — שאלות מהמאגר הרשמי, ותרגול אינסופי בחוקי הדרך.</span></div>
    <div class="quiz-cats">${cats}</div>
    <div class="row" style="padding:2px 4px 0"><button class="btn ghost mini" id="selNone">נקה בחירה</button></div>
    <div class="scorebar" style="display:flex;justify-content:space-between;font-size:.78rem;color:var(--ink-dim);padding:8px 4px">
      <span>ציון: ${st.correct}/${st.total} ${st.total?'('+acc+'%)':''}</span>
      <span>${App.combo()>=3?'<span class="combo">קומבו ×'+App.combo()+'</span>':''}</span>
    </div>
    <div id="qhost"></div>`;
  App.$$('.typesel[data-cat]',el).forEach(d=>d.addEventListener('toggle',()=>{ if(d.open)st.openCats.add(d.dataset.cat); else st.openCats.delete(d.dataset.cat); }));
  App.$$('.chip[data-sub]',el).forEach(c=>c.addEventListener('click',()=>{
    const id=c.dataset.sub; st.genFilter=null;   // בחירה ידנית מבטלת סינון מחולל
    if(st.selected.has(id)) st.selected.delete(id); else st.selected.add(id);
    st.q=null; paint(el);
  }));
  App.$('#selNone').addEventListener('click',()=>{ st.selected=new Set(); st.genFilter=null; st.q=null; paint(el); });
  const q=st.q;
  if(!q){ App.$('#qhost').innerHTML='<div class="card" style="padding:18px;text-align:center;color:var(--ink-dim)">בחרו לפחות תת‑נושא אחד כדי להתחיל.</div>'; return; }
  G.renderQuestion(App.$('#qhost'), q, {
    onAnswered:(ok)=>{
      st.total++; if(ok)st.correct++;
      const reviewItem = ok ? null : (q._bankId ? {sig:'x'+q._bankId, kind:'exam', id:q._bankId, topic:q.topic}
                                                : {sig:sigOf(q), kind:'gen', topic:q.topic, q:q});
      const res=App.recordAnswer(q.topic, ok, reviewItem);
      const fb=App.$('#qFeedback');
      if(fb) fb.innerHTML= ok?`<span class="combo" dir="ltr">+${res.xp} XP</span>`:'';
      const nb=App.$('#nextQ');
      nb.addEventListener('click',()=>{ st.q=buildQuestion(); paint(el); });
    }
  });
}
})();
