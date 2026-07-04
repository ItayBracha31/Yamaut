/* ============================================================================
   update.js — עדכון חי של מאגר השאלות מהמקור הרשמי (data.gov.il, רספ"ן).
   מושך את כל הרשומות מה‑Datastore API, מרכיב מאגר מעודכן, שומר כ"עדכון מקומי"
   ב‑localStorage ומחליף את המאגר המובנה. תקנות (rules.js) ותכנים אחרים
   מתעדכנים עם גרסת האפליקציה עצמה (Service Worker).
   ========================================================================== */
(function(){
"use strict";
const U = App.Updates = {};
const RES = 'd99b5fcb-b906-461e-a386-dcaffa13f9ac';           /* dataset opercraft_tq */
const API = 'https://data.gov.il/api/3/action/datastore_search';
const KEY = 'yamaut2.bank';

/* ---------- טעינת עדכון מקומי שמור (בעליית האפליקציה) ---------- */
U.hasOverride = ()=>{ try{ return !!localStorage.getItem(KEY); }catch(e){ return false; } };
U.loadOverride = ()=>{
  try{
    const raw=localStorage.getItem(KEY); if(!raw) return false;
    const b=JSON.parse(raw);
    if(b && b.questions && b.questions.length && b.tracks){
      // תיקון עדכונים שמורים: שאלות איור עם figure=-1 יורשות את מספר התמונה מהמאגר
      // המובנה (לפי id, עדיין טעון בשלב זה) כדי שלא יוסתרו — בלי צורך לעדכן מחדש.
      const cur=window.EXAM_BANK;
      if(cur && cur.questions){
        const fmap=new Map(cur.questions.map(q=>[q.id,q.figure]));
        b.questions.forEach(q=>{ if(!(q.figure>0)){ const bf=fmap.get(q.id); if(bf>0) q.figure=bf; } });
      }
      window.EXAM_BANK=b; App.BANK=b; return true;
    }
  }catch(e){}
  return false;
};
U.clearOverride = ()=>{ try{ localStorage.removeItem(KEY); }catch(e){} };

/* ---------- שליפת כל הרשומות (בדפים) ---------- */
async function fetchAll(onProgress){
  const out=[]; let offset=0, total=Infinity;
  while(offset<total){
    const r=await fetch(API+'?resource_id='+RES+'&limit=2000&offset='+offset, {mode:'cors'});
    if(!r.ok) throw new Error('HTTP '+r.status);
    const j=await r.json();
    if(!j.success || !j.result) throw new Error('תשובת API לא תקינה');
    total=j.result.total;
    const recs=j.result.records||[];
    if(!recs.length) break;
    out.push(...recs); offset+=recs.length;
    if(onProgress) onProgress(Math.min(1,offset/total));
  }
  out.sort((a,b)=>a._id-b._id);
  return out;
}

/* ---------- פענוח (אותה לוגיקה כמו מחולל exam-bank.js) ---------- */
function trackOf(t){
  const out=[];
  if(t.split(',').map(s=>s.trim()).includes('עיוני ימאות א')) out.push('m11');
  if(t.includes('עיוני ימאות ב')) out.push('m12');
  if(t.includes('עוצמה ב')) out.push('m13');
  if(t.includes('עיוני ימאות ג')||t.includes('בדיקת ידע משיט ספינה')) out.push('m30_yam');
  if(t.includes('עיוני ניווט ב')) out.push('m30_inst');
  if(t.includes('עיוני מכונאות')) out.push('m30_mech');
  if(t.includes('עיוני ספינה בשכר')) out.push('m40');
  if(t.includes('גוררת')) out.push('m50');
  return [...new Set(out)];
}
function topicOf(c){
  if(c==='חוקי דרך שאלות פוסלות') return 'rules_dq';
  if(c==='חוקי דרך לא פוסלות') return 'rules';
  if(c==='בטיחות בהפלגה'||c==='צוללים') return 'safety';
  if(c==='נוהלים') return 'procedures';
  if(c==='תחזית מזג אוויר'||c==='אסטרונומיה') return 'weather';
  if(c==='מצוקה'||c==='עזרה ראשונה'||c==='כיבוי אש'||c==='שטחים סגורים') return 'emergency';
  if(/מכונ|מנוע|משאב|חשמל|קרור|הגה|תקלות/.test(c)) return 'mech';
  if(/ניווט מכשירים|מיקום|מדידה|NAVTEX|מצפן|תדר|מפה|זמן|קווים/.test(c)) return 'inst';
  return 'general';
}
/* ניקוי עדין של טקסט מהמאגר: רווחים חסרים אחרי גרשיים/פיסוק (בלי לפגוע בצה"ל וכד') */
function tidy(s){
  return String(s).replace(/\s+/g,' ')
    .replace(/(\d")(?=[א-ת])/g,'$1 ')
    .replace(/([א-ת][,.])(?=[א-ת])/g,'$1 ')
    .replace(/\s+([,.?!:;])/g,'$1')
    .trim();
}
function parseRecords(records){
  const groups=[]; let cur=null;
  for(const r of records){
    const hasQ=r.Questions && String(r.Questions).trim()!=='';
    const blank=(!r.Description||!String(r.Description).trim()) && !hasQ;
    if(hasQ){ cur={head:r,opts:[r]}; groups.push(cur); }
    else if(blank){ cur=null; }
    else if(cur){ cur.opts.push(r); }
  }
  const out=[];
  for(const g of groups){
    const h=g.head;
    if(String(h.Status||'').trim()!=='פעיל') continue;
    const opts=g.opts
      .filter(o=>o.Description&&String(o.Description).trim())
      .map(o=>({pos:o.Answers_Num, text:tidy(o.Description),
        correct:String(o.Answer).trim()==='+', dq:String(o.Disqualification_Answer).trim()==='+'}));
    opts.sort((a,b)=>(a.pos||99)-(b.pos||99));
    if(opts.length<2 || opts.filter(o=>o.correct).length!==1) continue;
    const qt=tidy(h.Questions);
    const fig=qt.match(/תמונ(?:ה|ות)\s*(?:מס(?:פר|['׳.])?\s*)?["']?(\d+)/);
    const q={ id:'q'+h.Number, n:h.Number, q:qt,
      options:opts.map(o=>o.text), correct:opts.findIndex(o=>o.correct),
      topic:topicOf(String(h.Category||'').trim()), sub:String(h.Category||'').trim(),
      tracks:trackOf(String(h.Exam_Types||'').trim()) };
    if(opts.some(o=>o.dq)) q.dq=opts.map(o=>o.dq);
    if(fig) q.figure=+fig[1];
    else if(/(בתמונה|בשרטוט|בתרשים|באיור|מעגל המצבים|בציור)/.test(qt)) q.figure=-1;
    out.push(q);
  }
  return out;
}

/* ---------- השוואה מול המאגר הנוכחי ---------- */
function diffBanks(oldQs,newQs){
  const om=new Map(oldQs.map(q=>[q.id,q]));
  const nm=new Map(newQs.map(q=>[q.id,q]));
  let added=0,removed=0,changed=0;
  nm.forEach((q,id)=>{
    const o=om.get(id);
    if(!o){added++;return;}
    if(o.q!==q.q || o.correct!==q.correct || JSON.stringify(o.options)!==JSON.stringify(q.options)) changed++;
  });
  om.forEach((_,id)=>{ if(!nm.has(id)) removed++; });
  return {added,removed,changed};
}

/* ---------- עדכון מלא ---------- */
U.refreshBank = async onProgress=>{
  const records=await fetchAll(onProgress);
  const questions=parseRecords(records);
  if(questions.length<500) throw new Error('המקור החזיר '+questions.length+' שאלות בלבד — העדכון בוטל ליתר ביטחון');
  const base=window.EXAM_BANK||{};
  // שאלות איור שמספר התמונה שלהן לא נותח מטקסט השאלה (figure=-1) — יורשות את מספר
  // התמונה מהשאלה המקבילה במאגר הקיים (לפי id), שם המיפוי כבר מלא ומדויק. כך שאלות
  // איור קיימות אינן "נעלמות"/מוסתרות אחרי עדכון חי מהמקור הרשמי.
  const baseFig=new Map((base.questions||[]).map(q=>[q.id,q.figure]));
  questions.forEach(q=>{ if(!(q.figure>0)){ const bf=baseFig.get(q.id); if(bf>0) q.figure=bf; } });
  const diff=diffBanks((base.questions||[]),questions);
  const bank={
    meta:Object.assign({},base.meta,{ fetched:App.todayStr(), live:true,
      source:'רשות הספנות והנמלים — מאגר השאלות הרשמי (data.gov.il, עדכון חי)' }),
    tracks:base.tracks && base.tracks.length ? base.tracks : [
      { id:'m30_yam',  name:'משיט 30 — ימאות ג׳',         time:90, n:50, passPct:80 },
      { id:'m30_inst', name:'משיט 30 — נווט ב׳ (מכשירים)', time:90, n:50, passPct:86 },
      { id:'m30_mech', name:'משיט 30 — מכונאות וחשמל',     time:60, n:50, passPct:84 },
      { id:'m13', name:'משיט 13 (עוצמה ב׳)', time:90, n:40, passPct:80 },
      { id:'m12', name:'משיט 12 (עוצמה א׳)', time:60, n:40, passPct:80 },
      { id:'m11', name:'משיט 11 (אופנוע ים)', time:60, n:40, passPct:80 }
    ],
    topics:base.topics && base.topics.length ? base.topics : [],
    questions
  };
  try{ localStorage.setItem(KEY, JSON.stringify(bank)); }
  catch(e){ throw new Error('אין מספיק מקום לשמירת העדכון במכשיר'); }
  window.EXAM_BANK=bank; App.BANK=bank;
  return Object.assign({total:questions.length}, diff);
};

/* ---------- עדכון גרסת אפליקציה (Service Worker) ---------- */
U.checkAppUpdate = async ()=>{
  if('serviceWorker' in navigator && location.protocol==='https:'){
    const reg=await navigator.serviceWorker.getRegistration();
    if(reg) await reg.update();
  }
  location.reload();
};
})();
