/* ============================================================================
   exam.js — סימולציית מבחן עיוני אמיתית:
   • מסלולים מהמאגר הרשמי של רשות הספנות והנמלים (משיט 11/12/13/30)
   • שאלות פוסלות — כמו במבחן האמיתי: תשובה פוסלת = פסילה אוטומטית
   • שאלות איור מוצגות עם שחזור האיור הרשמי (figures.js) כשניתן
   • מבחן תרגול מחולל (מהתקנות) כחלופה
   ========================================================================== */
(function(){
"use strict";
let exam=null;          // {qs, answers, flags, idx, endsAt, timeMin, mode, trackId, finished, result}
let timerId=null;
let cfg={track:'m30_yam', topics:null, n:50, includeFigures:true};

function bank(){ return window.EXAM_BANK && window.EXAM_BANK.questions && window.EXAM_BANK.questions.length ? window.EXAM_BANK : null; }
function figures(){ return window.EXAM_FIGURES || null; }
function trackById(id){ const b=bank(); return b ? b.tracks.find(t=>t.id===id) : null; }
function topicName(id){
  const b=bank();
  if(b){ const t=(b.topics||[]).find(x=>x.id===id); if(t) return t.name; }
  const g=(window.QuizGen&&QuizGen.TOPICS||[]).find(x=>x.id===id);
  return g?g.name:id;
}
function figSpec(q){
  const F=figures();
  return (q.figure && q.figure>0 && F && F[String(q.figure)]) ? F[String(q.figure)] : null;
}
function trackQuestions(trackId){
  const b=bank(); if(!b) return [];
  return b.questions.filter(q=>q.tracks.includes(trackId));
}
function eligible(trackId, topics, includeFigures){
  return trackQuestions(trackId).filter(q=>{
    if(topics && topics.size && !topics.has(q.topic)) return false;
    if(q.figure){ const s=figSpec(q); if(!s) return false; if(!includeFigures) return false; }
    return true;
  });
}

/* ---------- שחזור איור רשמי ---------- */
const LC={red:'#ff3b30',green:'#22d07a',white:'#fff4d6',yellow:'#ffd23b'};
function shapeSil(x,y,kind){
  const s=11;
  switch(kind){
    case 'ball': return `<circle cx="${x}" cy="${y}" r="${s}"/>`;
    case 'cone-up': return `<polygon points="${x},${y-s} ${x-s},${y+s} ${x+s},${y+s}"/>`;
    case 'cone-down': return `<polygon points="${x},${y+s} ${x-s},${y-s} ${x+s},${y-s}"/>`;
    case 'diamond': return `<polygon points="${x},${y-s-2} ${x+s-2},${y} ${x},${y+s+2} ${x-s+2},${y}"/>`;
    case 'cylinder': return `<rect x="${x-s+3}" y="${y-s-2}" width="${(s-3)*2}" height="${(s+2)*2}" rx="1.5"/>`;
    case 'cones-point': return `<polygon points="${x},${y} ${x-s},${y-2*s} ${x+s},${y-2*s}"/><polygon points="${x},${y} ${x-s},${y+2*s} ${x+s},${y+2*s}"/>`;
    case 'hourglass': return `<polygon points="${x-s},${y-s-2} ${x+s},${y-s-2} ${x},${y}"/><polygon points="${x},${y} ${x-s},${y+s+2} ${x+s},${y+s+2}"/>`;
    case 'basket': return `<path d="M${x-s},${y-6} h${2*s} l-4,${s+6} h-${2*s-8} z"/>`;
  }
  return `<circle cx="${x}" cy="${y}" r="${s}"/>`;
}
/* מפריד את תיאור התמונה: "תיאור חזותי: משמעות רשמית" — במבחן מציגים רק את
   החלק החזותי (אחרת התשובה נחשפת); המשמעות המלאה מוצגת במסך התוצאות. */
function splitFigDesc(desc){
  const pre='אות קולי:';
  let prefix='', s=desc;
  if(s.indexOf(pre)===0){ prefix=pre+' '; s=s.slice(pre.length); }
  const i=s.indexOf(':');
  return { visual:(prefix+(i>0?s.slice(0,i):s)).trim(), meaning:i>0?s.slice(i+1).trim():'' };
}
function figCaption(q){ return `<div class="muted" style="font-size:.76rem;text-align:center">תמונה ${q.figure} — שחזור מהחוברת הרשמית${'</div>'}`; }
function renderFigure(q){
  const f=figSpec(q); if(!f) return '';
  // עדיפות ראשונה: האיור הרשמי האמיתי מהחוברת (חולץ מה-PDF הממשלתי)
  const img=window.EXAM_FIGURE_IMGS && window.EXAM_FIGURE_IMGS[String(q.figure)];
  if(img) return `<div class="visual" style="display:flex;flex-direction:column;align-items:center;gap:6px;padding:12px;background:#fdfdfa">
    <img src="${img}" alt="תמונה ${q.figure}" loading="lazy" style="max-width:min(340px,100%);height:auto;border-radius:6px">
    <div class="muted" style="font-size:.74rem">תמונה ${q.figure} — מהחוברת הרשמית</div></div>`;
  const parts=splitFigDesc(f.desc||'');
  // דגל — מציירים את הדגל האמיתי לפי האות, בלי לחשוף את שמו
  if(f.kind==='flag'){
    const m=(f.desc||'').match(/דגל\s+([A-Z])/);
    const fl=m&&App.R.flags.find(x=>x.letter===m[1]);
    if(fl) return `<div class="visual" style="display:flex;flex-direction:column;align-items:center;gap:6px;padding:12px">
      <div style="width:170px">${Draw.drawFlag(fl)}</div>${figCaption(q)}</div>`;
  }
  // אות קולי — מציגים את התבנית + נגינה, בלי המשמעות
  if(f.kind==='other' && (f.desc||'').indexOf('אות קולי')===0){
    const pm=(f.desc||'').match(/\(([●▬\s]+)\)/);
    if(pm){
      const glyphs=pm[1].trim();
      const audio=glyphs.replace(/\s/g,'').split('').map(ch=>ch==='▬'?'L':'S').join('');
      return `<div class="visual" style="display:flex;flex-direction:column;align-items:center;gap:6px;padding:12px">
        <div class="pattern" style="direction:ltr">${App.esc(glyphs)}</div>
        <button class="btn mini" data-figaudio="${audio}">נגן</button>${figCaption(q)}</div>`;
    }
  }
  let svg='';
  if(f.kind==='lights' && (f.stack||f.side)){
    const stack=f.stack||[], side=f.side||[];
    const top=40, gap=26;
    let g='';
    stack.forEach((c,i)=>{ const col=LC[c]||c;
      g+=`<circle cx="90" cy="${top+i*gap}" r="12" fill="${col}" opacity=".25"/>
          <circle cx="90" cy="${top+i*gap}" r="6.5" fill="${col}" style="filter:drop-shadow(0 0 6px ${col})"/>`; });
    const sy=top+stack.length*gap+14;
    side.forEach((c,i)=>{ const col=LC[c]||c;
      g+=`<circle cx="${side.length===1?90:(65+i*50)}" cy="${sy}" r="5.5" fill="${col}" style="filter:drop-shadow(0 0 5px ${col})"/>`; });
    const h=sy+34;
    svg=`<svg viewBox="0 0 180 ${h}" style="max-width:210px"><rect width="180" height="${h}" fill="#04101d" rx="8"/>
      <line x1="90" y1="${top-16}" x2="90" y2="${sy+14}" stroke="#22384a" stroke-width="2"/>
      <path d="M45,${sy+18} q45,14 90,0 l-6,10 h-78 z" fill="#101c28"/>${g}</svg>`;
  } else if(f.kind==='shapes' && f.stack){
    const stack=f.stack||[]; const top=36, gap=30, h=top+stack.length*gap+30;
    let g=''; let y=top;
    stack.forEach(k=>{ g+=`<g fill="#14181c" stroke="#3a3a3a" stroke-width="1">${shapeSil(90,y,k)}</g>`; y+=gap; });
    svg=`<svg viewBox="0 0 180 ${h}" style="max-width:210px"><rect width="180" height="${h}" fill="#cfe6f4" rx="8"/>
      <line x1="90" y1="14" x2="90" y2="${y}" stroke="#555" stroke-width="2"/>
      <path d="M45,${y} q45,14 90,0 l-6,10 h-78 z" fill="#3d4a55"/>${g}</svg>`;
  }
  if(svg) return `<div class="visual" style="display:flex;flex-direction:column;align-items:center;gap:6px;padding:12px">
    ${svg}${figCaption(q)}</div>`;
  // ללא שחזור גרפי — מציגים את התיאור החזותי בלבד (בלי המשמעות הרשמית)
  return `<div class="visual" style="padding:12px">
    <div style="font-size:.86rem;color:var(--parchment)">תמונה ${q.figure}: ${App.esc(parts.visual)}</div>
  </div>`;
}

/* ---------- בניית מבחן ---------- */
function buildFromBank(){
  const pool=App.shuffle(eligible(cfg.track,cfg.topics,cfg.includeFigures)).slice(0,cfg.n);
  return pool.map(q=>{
    const order=App.shuffle(q.options.map((_,i)=>i));
    return { id:q.id, q:q.q, options:order.map(i=>q.options[i]), correct:order.indexOf(q.correct),
      dq:q.dq?order.map(i=>q.dq[i]):null, isDQcat:q.topic==='rules_dq',
      topic:q.topic, sub:q.sub, figure:q.figure, _orig:q };
  });
}
function buildGenerated(n){
  const out=[]; const seen=new Set();
  let guard=0;
  while(out.length<n && guard++<n*30){
    const g=QuizGen.newQuestion(null); if(!g) break;
    const sig=QuizGen.sigOf(g); if(seen.has(sig)) continue; seen.add(sig);
    out.push({ id:null, q:g.q, options:g.options, correct:g.options.indexOf(g.correct),
      topic:g.topic, explain:g.explain, ref:g.ref, visual:g.visual, patternBig:g.patternBig, audio:g.audio, mono:g.mono });
  }
  return out;
}
function startExam(mode){
  let qs, timeMin, trackId=null;
  if(mode==='bank'){
    qs=buildFromBank(); trackId=cfg.track;
    const tr=trackById(cfg.track);
    timeMin=Math.max(10,Math.round(tr.time*qs.length/tr.n));
  } else {
    qs=buildGenerated(cfg.n);
    timeMin=Math.max(10,Math.round(qs.length*1.5));
  }
  if(!qs.length){ App.toast('אין שאלות זמינות בבחירה הזו'); return; }
  exam={ qs, answers:new Array(qs.length).fill(null), flags:new Array(qs.length).fill(false),
    idx:0, timeMin, endsAt:Date.now()+timeMin*60*1000, mode, trackId, finished:false, result:null };
  persistExam();
  startTimer();
}
function startTimer(){
  clearInterval(timerId);
  timerId=setInterval(()=>{
    if(!exam||exam.finished){ clearInterval(timerId); return; }
    const left=exam.endsAt-Date.now();
    const tEl=document.getElementById('examTimer');
    if(tEl){ tEl.textContent=fmtTime(left); tEl.classList.toggle('low', left<5*60*1000); }
    if(left<=0){
      finishExam();
      // מציירים את התוצאות רק אם המשתמש נמצא כרגע בלשונית המבחן —
      // אחרת אין לדרוס תצוגה אחרת (התוצאות יופיעו כשיחזור)
      if(App.current && App.current.tab==='exam'){
        const el=document.querySelector('#view > div'); if(el) paint(el);
      }
      App.toast('הזמן נגמר — המבחן הוגש');
    }
  },500);
}
/* שמירת מבחן פעיל — שרידות לרענון/פינוי לשונית בטלפון (מבחני מאגר בלבד) */
function persistExam(){
  try{
    if(exam && !exam.finished && exam.mode==='bank') localStorage.setItem('yamaut2.exam', JSON.stringify(exam));
    else localStorage.removeItem('yamaut2.exam');
  }catch(e){}
}
function restoreExam(){
  try{
    const raw=localStorage.getItem('yamaut2.exam'); if(!raw) return;
    const e=JSON.parse(raw);
    if(e && e.qs && e.qs.length && !e.finished){
      exam=e;
      if(Date.now()>=e.endsAt){ finishExam(); persistExam(); App.toast('זמן המבחן שנשמר הסתיים — הוגש אוטומטית'); }
      else { startTimer(); App.toast('ממשיכים מבחן שנשמר'); }
    } else localStorage.removeItem('yamaut2.exam');
  }catch(e){}
}
function fmtTime(ms){
  ms=Math.max(0,ms);
  const m=Math.floor(ms/60000), s=Math.floor(ms%60000/1000);
  return String(m).padStart(2,'0')+':'+String(s).padStart(2,'0');
}

/* ---------- הגשה ---------- */
function finishExam(){
  if(!exam||exam.finished) return;
  exam.finished=true; clearInterval(timerId);
  let correct=0; const byTopic={}; const disq=[];
  exam.qs.forEach((q,i)=>{
    const a=exam.answers[i];
    const ok=a===q.correct;
    if(ok)correct++;
    if(!ok && a!=null && q.dq && q.dq[a]) disq.push(i);
    const t=byTopic[q.topic]||(byTopic[q.topic]={c:0,t:0}); t.t++; if(ok)t.c++;
    const ts=App.store.topics[q.topic==='rules_dq'?'rules':q.topic]||(App.store.topics[q.topic==='rules_dq'?'rules':q.topic]={c:0,t:0,recent:[]});
    ts.t++; if(ok)ts.c++; ts.recent.push(ok?1:0); if(ts.recent.length>20)ts.recent.shift();
    if(!ok){
      if(q.id) App.reviewAdd({sig:'x'+q.id, kind:'exam', id:q.id, topic:q.topic});
      else App.reviewAdd({sig:QuizGen.sigOf({q:q.q,correct:q.options[q.correct]}), kind:'gen', topic:q.topic,
        q:{topic:q.topic, topicName:topicName(q.topic), q:q.q, options:q.options, correct:q.options[q.correct],
           explain:q.explain||'', ref:q.ref||'', visual:q.visual, patternBig:q.patternBig, audio:q.audio, mono:q.mono}});
    }
  });
  const total=exam.qs.length;
  const score=Math.round(correct/total*100);
  const tr=exam.trackId?trackById(exam.trackId):null;
  const passPct=tr?tr.passPct:70;
  const disqualified=disq.length>0;
  const passed=score>=passPct && !disqualified;
  exam.result={correct,total,score,passed,byTopic,passPct,disq,disqualified};
  App.store.examHistory.push({date:App.todayStr(), score, correct, total, passed,
    mode:exam.mode, track:tr?tr.name:'תרגול', dq:disqualified});
  if(App.store.examHistory.length>30) App.store.examHistory.shift();
  App.bump('correct',correct); App.bump('answers',total);
  if(passed) App.bump('examPass');
  if(score===100 && !disqualified) App.bump('examPerfect');
  App.addXP(correct*2+(passed?30:0));
  persistExam();
  App.save(); App.checkBadges();
  if(passed){ App.confetti(score===100?220:120); App.sfx('level'); }
  else { App.haptic('bad'); }
}

/* ---------- מסך הגדרות מבחן ---------- */
function configScreen(el){
  const b=bank();
  let bankCard='';
  if(b){
    const tr=trackById(cfg.track)||b.tracks[0]; cfg.track=tr.id;
    const tq=trackQuestions(tr.id);
    const topicIds=[...new Set(tq.map(q=>q.topic))];
    if(!cfg.topics || cfg._topicsTrack!==tr.id){ cfg.topics=new Set(topicIds); cfg._topicsTrack=tr.id; }
    const nElig=eligible(tr.id,cfg.topics,cfg.includeFigures).length;
    const figN=tq.filter(q=>q.figure&&figSpec(q)).length;
    const figMissing=tq.filter(q=>q.figure&&!figSpec(q)).length;
    const starN=eligible(tr.id,cfg.topics,cfg.includeFigures).filter(q=>q.dq).length;
    const timeMin=Math.max(10,Math.round(tr.time*Math.min(cfg.n,nElig)/tr.n));
    const lbl=t=>`<div style="font-size:.72rem;font-weight:700;color:var(--ink-dim);letter-spacing:.04em;margin:12px 0 6px">${t}</div>`;
    bankCard=`
    <div class="card" style="padding:14px;margin-bottom:12px">
      <h3 style="margin:0 0 2px;color:var(--parchment)">המבחן הרשמי</h3>
      <p class="muted" style="font-size:.78rem;margin:0">
        ${b.questions.length} שאלות אמיתיות מתוך מאגר רשות הספנות והנמלים${b.meta.live?' (עדכון חי)':''}.</p>

      ${lbl('1 · מסלול ההסמכה')}
      <div class="chipbar" style="padding:0" id="trackChips">
        ${b.tracks.map(t=>`<button class="chip" data-tr="${t.id}" aria-pressed="${t.id===cfg.track}">${t.name}</button>`).join('')}
      </div>

      ${lbl('2 · נושאים')}
      <details class="typesel">
        <summary>נבחרו ${cfg.topics.size}/${topicIds.length} נושאים · ${nElig} שאלות זמינות</summary>
        <div class="chipbar" id="bankTopics">
          ${topicIds.map(t=>{const tp=(b.topics||[]).find(x=>x.id===t)||{name:t};
            return `<button class="chip" data-t="${t}" aria-pressed="${cfg.topics.has(t)}">${tp.name} · ${tq.filter(q=>q.topic===t).length}</button>`;}).join('')}
        </div>
      </details>

      ${lbl('3 · היקף')}
      <div class="row">
        <div class="seg" id="bankCount">${[10,25,50].map(n=>`<button data-n="${n}" aria-pressed="${cfg.n===n}">${n} שאלות</button>`).join('')}</div>
        ${figN?`<button class="btn mini ${cfg.includeFigures?'primary':''}" id="figTgl">איורים רשמיים (${figN})</button>`:''}
      </div>

      <div style="border-top:1px solid var(--line);margin:14px 0 10px"></div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:6px;font-size:.78rem">
        <div><span class="muted">משך:</span> <b>${timeMin} דק׳</b></div>
        <div><span class="muted">ציון עובר:</span> <b dir="ltr">~${tr.passPct}%</b> <span class="muted">(לפי בתי ספר)</span></div>
        <div style="grid-column:1/-1"><b style="color:var(--bad)">★</b> ${starN} שאלות כוכבית בבחירה —
          <span class="muted">בחירה בתשובה פוסלת בשאלת כוכבית נכשלת את המבחן כולו, כמו במבחן האמיתי.</span></div>
        ${figMissing?`<div style="grid-column:1/-1" class="muted">${figMissing} שאלות איור שלא ניתן להציג הוסתרו.</div>`:''}
      </div>
      <button class="btn primary" id="startBank" style="width:100%;margin-top:12px">התחל מבחן — ${App.esc(tr.name)}</button>
    </div>`;
  } else {
    bankCard=`<div class="card" style="padding:14px;margin-bottom:12px;text-align:center">
      <h3 style="margin:0 0 4px;color:var(--parchment)">המאגר הרשמי</h3>
      <p class="muted" style="font-size:.82rem">מאגר השאלות הרשמי לא נטען.</p></div>`;
  }
  el.innerHTML=`
    <div class="section-title"><h2>מבחן סימולציה</h2>
      <span class="hint">כמו בבחינה האמיתית: טיימר, בלי משוב עד ההגשה, ושאלות פוסלות.</span></div>
    ${bankCard}
    ${App.store.examHistory.length?`
    <div class="section-title"><h2>היסטוריה</h2></div>
    <div style="display:grid;gap:8px">
      ${App.store.examHistory.slice(-5).reverse().map(h=>`
        <div class="card" style="padding:11px 14px;display:flex;justify-content:space-between;align-items:center;gap:8px">
          <span style="font-weight:800;color:${h.passed?'var(--good)':'var(--bad)'}">${h.passed?'✓ עבר':(h.dq?'נפסל':'✗ נכשל')} · ${h.score}%</span>
          <span class="muted" style="font-size:.72rem">${h.correct}/${h.total} · ${App.esc(h.track||'')} · ${App.esc(h.date)}</span>
        </div>`).join('')}
    </div>`:''}
  `;
  App.$$('#trackChips .chip',el).forEach(c=>c.addEventListener('click',()=>{ cfg.track=c.dataset.tr; App.sfx('click'); configScreen(el); }));
  App.$$('#bankTopics .chip',el).forEach(c=>c.addEventListener('click',()=>{
    const t=c.dataset.t;
    if(cfg.topics.has(t)){ if(cfg.topics.size>1) cfg.topics.delete(t); } else cfg.topics.add(t);
    configScreen(el);
  }));
  App.$$('#bankCount button',el).forEach(x=>x.addEventListener('click',()=>{ cfg.n=+x.dataset.n; configScreen(el); }));
  const ft=App.$('#figTgl',el); if(ft) ft.addEventListener('click',()=>{ cfg.includeFigures=!cfg.includeFigures; configScreen(el); });
  const sb=App.$('#startBank',el); if(sb) sb.addEventListener('click',()=>{ startExam('bank'); paint(el); });
  const sg=App.$('#startGen',el); if(sg) sg.addEventListener('click',()=>{ startExam('gen'); paint(el); });
}

/* ---------- מסך מבחן רץ ---------- */
/* שאלות "מעגל המצבים": שני כלי שיט מסומנים באותיות — מציגים גם את תמונה 127 */
function needsCircle(q){
  if(!q.topic || q.topic.indexOf('rules')!==0 || q.figure===127) return false;
  const m=q.q.match(/[("״"]\s?([A-P])\s?[)"״"]/g)||[];
  return new Set(m.map(s=>s.replace(/[^A-P]/g,''))).size>=2;
}
function circleHTML(){
  const IM=window.EXAM_FIGURE_IMGS;
  const src=IM&&IM['127']; if(!src) return '';
  return `<div class="visual" style="display:flex;flex-direction:column;align-items:center;gap:4px;padding:10px;background:#fdfdfa">
    <img id="circleImg" src="${src}" alt="מעגל המצבים" loading="lazy" style="max-width:min(300px,100%);height:auto;cursor:zoom-in">
    <div class="muted" style="font-size:.72rem">מעגל המצבים (תמונה 127) — מיקומי כלי השיט לפי האותיות · הקישו להגדלה</div>
  </div>`;
}
function runScreen(el){
  persistExam();
  const q=exam.qs[exam.idx];
  const answered=exam.answers.filter(a=>a!=null).length;
  el.innerHTML=`
    <div class="card quiz">
      <div class="scorebar">
        <span class="topicpill">${App.esc(topicName(q.topic))}${q.dq?' <b style="color:var(--bad)" title="שאלת כוכבית — תשובה פוסלת נכשלת את המבחן">★</b>':''}</span>
        <span>שאלה ${exam.idx+1}/${exam.qs.length}</span>
        <span class="exam-timer" id="examTimer">${fmtTime(exam.endsAt-Date.now())}</span>
      </div>
      <div class="exam-prog"><div style="width:${answered/exam.qs.length*100}%"></div></div>
      <div class="row" style="margin:4px 0 10px">
        <button class="btn mini" id="prevQ" ${exam.idx===0?'disabled':''}>→ הקודמת</button>
        <button class="btn mini ${exam.flags[exam.idx]?'primary':''}" id="flagQ">⚑ סימון</button>
        <span class="grow"></span>
        ${exam.idx<exam.qs.length-1?`<button class="btn mini primary" id="nextQ">הבאה ←</button>`:''}
        <button class="btn mini ${exam.idx===exam.qs.length-1?'primary':''}" id="submitQ">הגש</button>
      </div>
      <div class="qtext">${App.esc(q.q)}</div>
      ${needsCircle(q)?circleHTML():''}
      ${q.figure?renderFigure(q)||`<p class="muted" style="font-size:.76rem">שאלה זו מתייחסת לתמונה ${q.figure} מהחוברת הרשמית.</p>`:''}
      ${q.patternBig?`<div class="pattern" style="text-align:center;margin:6px 0">${App.esc(q.patternBig)}</div>`:''}
      ${q.audio?`<div class="row" style="justify-content:center;margin-bottom:10px"><button class="btn" id="qplay">נגן</button></div>`:''}
      ${q.visual?`<div class="visual">${q.visual}</div>`:''}
      <div id="opts">${q.options.map((o,i)=>`<button class="opt" data-i="${i}" style="${exam.answers[exam.idx]===i?'border-color:var(--brass);background:rgba(217,164,65,.14)':''}${q.mono?';font-family:var(--mono)':''}">${App.esc(o)}</button>`).join('')}</div>
      <div class="exam-nav">${exam.qs.map((_,i)=>`<button data-g="${i}"
        class="${exam.answers[i]!=null?'answered':''} ${i===exam.idx?'current':''} ${exam.flags[i]?'flagged':''}">${i+1}</button>`).join('')}</div>
    </div>`;
  if(q.audio) App.$('#qplay',el).addEventListener('click',()=>App.playSeq(q.audio));
  const ci=App.$('#circleImg',el);
  if(ci) ci.addEventListener('click',()=>App.openSheet('מעגל המצבים — תמונה 127',
    `<div style="background:#fdfdfa;border-radius:10px;padding:8px;text-align:center">
       <img src="${ci.src}" alt="מעגל המצבים" style="max-width:100%;height:auto"></div>
     <p class="muted" style="font-size:.78rem">16 כלי שיט (A–P) סביב המעגל בקפיצות של 22.5° — כולם בכיוון המרכז, פרט ל-E ו-I המפליגים החוצה.</p>`));
  App.$$('[data-figaudio]',el).forEach(b=>b.addEventListener('click',()=>App.playSeq(b.dataset.figaudio.split(''))));
  App.$$('#opts .opt',el).forEach(b=>b.addEventListener('click',()=>{
    exam.answers[exam.idx]= exam.answers[exam.idx]===+b.dataset.i ? null : +b.dataset.i;
    App.sfx('click'); App.haptic('click');
    if(exam.answers[exam.idx]!=null && exam.idx<exam.qs.length-1) exam.idx++; // התקדמות אוטומטית
    paint(el);
  }));
  const pq=App.$('#prevQ',el); if(pq) pq.addEventListener('click',()=>{exam.idx--;paint(el);});
  const nq=App.$('#nextQ',el); if(nq) nq.addEventListener('click',()=>{exam.idx++;paint(el);});
  App.$('#flagQ',el).addEventListener('click',()=>{exam.flags[exam.idx]=!exam.flags[exam.idx];paint(el);});
  App.$$('.exam-nav button',el).forEach(b=>b.addEventListener('click',()=>{exam.idx=+b.dataset.g;paint(el);}));
  App.$('#submitQ',el).addEventListener('click',()=>{
    const un=exam.qs.length-exam.answers.filter(a=>a!=null).length;
    if(un>0 && !confirm('יש '+un+' שאלות ללא מענה. להגיש בכל זאת?')) return;
    finishExam(); paint(el);
  });
}

/* ---------- מסך תוצאות ---------- */
function resultScreen(el){
  const r=exam.result;
  const b=bank();
  const topicRows=Object.keys(r.byTopic).map(t=>{
    const x=r.byTopic[t], pct=Math.round(x.c/x.t*100);
    return `<div style="margin:7px 0">
      <div style="display:flex;justify-content:space-between;font-size:.78rem;font-weight:700">
        <span>${App.esc(topicName(t))}</span><span>${x.c}/${x.t}</span></div>
      <div class="exam-prog"><div style="width:${pct}%;background:${pct>=r.passPct?'var(--good)':'var(--bad)'}"></div></div>
    </div>`;
  }).join('');
  const wrong=exam.qs.map((q,i)=>({q,i})).filter(x=>exam.answers[x.i]!==x.q.correct);
  el.innerHTML=`
    <div class="card" style="padding:18px;text-align:center">
      <div style="color:${r.passed?'var(--good)':'var(--bad)'}">${App.icon(r.passed?'grad':(r.disqualified?'scale':'anchor'),44)}</div>
      <div class="bigscore ${r.passed?'pass':'fail'}">${r.score}%</div>
      <div style="font-weight:800;color:${r.passed?'var(--good)':'var(--bad)'}">
        ${r.passed?'עברת את המבחן!':(r.disqualified?'נפסלת — טעות בשאלת כוכבית':'הפעם לא — ממשיכים לתרגל')}</div>
      <p class="muted" style="font-size:.8rem">${r.correct} נכונות מתוך ${r.total} · ציון עובר: ${r.passPct}%</p>
      ${r.disqualified?`<p style="font-size:.8rem;color:var(--bad);font-weight:700">
        במבחן האמיתי, בחירה בתשובה המסומנת במאגר הרשמי כ"פוסלת" גוררת פסילה אוטומטית —
        גם אם שאר המבחן מושלם. שאלות: ${r.disq.map(i=>i+1).join(', ')}</p>`:''}
      <div class="row" style="justify-content:center;margin-top:10px">
        <button class="btn primary" id="againBtn">מבחן חדש</button>
        ${wrong.length?'<button class="btn" id="revBtn">לתרגול הטעויות</button>':''}
      </div>
    </div>
    <div class="card" style="padding:14px;margin-top:12px">
      <h3 style="margin:0 0 8px;color:var(--parchment)">פירוט לפי נושא</h3>
      ${topicRows}
    </div>
    ${wrong.length?`
    <div class="section-title"><h2>שאלות שטעית בהן (${wrong.length})</h2>
      <span class="hint">נוספו אוטומטית לחפיסת החזרה</span></div>
    <div style="display:grid;gap:10px">
      ${wrong.map(({q,i})=>`
        <div class="card" style="padding:13px;${r.disq.includes(i)?'border-color:var(--bad)':''}">
          <div style="font-weight:700;font-size:.88rem;color:var(--parchment);margin-bottom:6px">${i+1}. ${App.esc(q.q)} ${r.disq.includes(i)?'<span style="color:var(--bad)">★ פוסלת</span>':''}</div>
          ${exam.answers[i]!=null?`<div class="chk no"><span>✗</span><span>ענית: ${App.esc(q.options[exam.answers[i]])}</span></div>`:'<div class="chk no"><span>—</span><span>לא נענתה</span></div>'}
          <div class="chk ok"><span>✓</span><span>נכון: ${App.esc(q.options[q.correct])}</span></div>
          ${q.explain?`<div class="muted" style="font-size:.78rem;margin-top:4px">${App.esc(q.explain)}</div>`:''}
          ${figSpec(q)?`<div class="muted" style="font-size:.78rem;margin-top:4px">תמונה ${q.figure}: ${App.esc(figSpec(q).desc)}</div>`:''}
        </div>`).join('')}
    </div>`:'<div class="card" style="padding:16px;text-align:center;margin-top:12px">אפס טעויות — מושלם!</div>'}`;
  App.$('#againBtn',el).addEventListener('click',()=>{exam=null;paint(el);});
  const rb=App.$('#revBtn',el); if(rb) rb.addEventListener('click',()=>App.navigate('practice','review'));
}

function paint(el){
  if(!el.isConnected) return;
  if(!exam) configScreen(el);
  else if(!exam.finished) runScreen(el);
  else resultScreen(el);
}

App.registerView('exam',{render(el){
  if(!exam) restoreExam();
  if(exam && !exam.finished) startTimer();
  paint(el);
}});
})();
