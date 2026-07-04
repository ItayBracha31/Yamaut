/* ============================================================================
   ימאות — core.js
   הליבה: ניתוב, מצב מתמשך (XP, רצף, תגים, שליטה בנושאים, חפיסת חזרה),
   צלילים, רטט, טוסטים, קונפטי, גיליון תחתון, ערכות נושא.
   כל התצוגות נרשמות דרך App.registerView(id, {render}).
   ========================================================================== */
(function(){
"use strict";

const App = window.App = {};

/* ---------------- utils ---------------- */
const $  = App.$  = (s,el)=> (el||document).querySelector(s);
const $$ = App.$$ = (s,el)=> Array.from((el||document).querySelectorAll(s));
App.esc = s=>String(s==null?'':s).replace(/&/g,'&amp;').replace(/"/g,'&quot;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
App.ri  = n=>Math.floor(Math.random()*n);
App.pick= a=>a[App.ri(a.length)];
App.shuffle = a=>{a=a.slice();for(let i=a.length-1;i>0;i--){const j=App.ri(i+1);[a[i],a[j]]=[a[j],a[i]];}return a;};
App.sample = (a,n)=>App.shuffle(a).slice(0,n);
App.clamp = (v,lo,hi)=>Math.max(lo,Math.min(hi,v));
App.todayStr = ()=>{const d=new Date();return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0');};

App.R = window.SEA_RULES || null;
App.BANK = window.EXAM_BANK || null;

/* ---------------- מערכת אייקונים (SVG, קו אחיד — במקום אימוג׳י) ---------------- */
App.ICONS={
  anchor:'M12 6a2 2 0 1 1 .01 0M12 6v15M12 21c-4.5-.4-7.2-3.2-7.7-7.3M12 21c4.5-.4 7.2-3.2 7.7-7.3M3.5 13.7h2.8M17.7 13.7h2.8',
  cube:'M12 3l8 4.5v9L12 21l-8-4.5v-9L12 3zM12 12l8-4.5M12 12L4 7.5M12 12v9',
  buoy:'M12 3v4M10 7h4l2.2 10H7.8L10 7zM4 20c2.6-1.6 5.4-1.6 8 0 2.6-1.6 5.4-1.6 8 0',
  horn:'M4 10v4h4l5 5V5L8 10H4zM16 9.5a4 4 0 0 1 0 5M18.5 7a7.5 7.5 0 0 1 0 10',
  flag:'M6 21V4M6 5h11l-2.5 3.5L17 12H6',
  dice:'M5 5h14v14H5zM9 9h.01M15 9h.01M12 12h.01M9 15h.01M15 15h.01',
  ship:'M3 16l2 4h14l2-4-9-2.2L3 16zM12 13.5V4m0 0l5.5 4.2M12 4L9 6.2',
  broom:'M13.5 3l-3.2 7.4M6.5 10.5h9.5M8 10.5l-2.5 10h12l-2.5-10',
  map:'M9 4L3 6v14l6-2 6 2 6-2V4l-6 2-6-2zM9 4v14M15 6v14',
  calc:'M6 3h12v18H6zM9 7h6M9 12h.01M12 12h.01M15 12h.01M9 15.5h.01M12 15.5h.01M15 15.5h.01M9 19h.01M12 19h.01M15 19h.01',
  book:'M4 5.5A2.5 2.5 0 0 1 6.5 3H20v15H6.5A2.5 2.5 0 0 0 4 20.5V5.5zM20 18v3H6.5',
  flame:'M12 3c.8 3.2-3.4 5.2-3.4 9a4.9 4.9 0 0 0 9.8 0c0-2.1-1-3.7-2.2-5.3-.5 1.6-1.4 2.2-2.2 2.4.6-2 .3-4.2-2-6.1z',
  gear:'M12 9.2a2.8 2.8 0 1 0 0 5.6 2.8 2.8 0 0 0 0-5.6zM19.3 12c0-.4 0-.8-.1-1.2l2-1.5-1.9-3.3-2.3 1a7.3 7.3 0 0 0-2.1-1.2L14.5 3h-4l-.4 2.6a7.3 7.3 0 0 0-2.1 1.2l-2.3-1-2 3.4 2 1.5a7.3 7.3 0 0 0 0 2.4l-2 1.5 2 3.4 2.3-1c.6.5 1.4.9 2.1 1.2l.4 2.6h4l.4-2.6a7.3 7.3 0 0 0 2.1-1.2l2.3 1 1.9-3.3-2-1.5c.1-.4.1-.8.1-1.2z',
  grad:'M12 3L2 8l10 5 10-5-10-5zM6 10.5V15c0 1.7 2.7 3 6 3s6-1.3 6-3v-4.5',
  target:'M12 12m-9 0a9 9 0 1 0 18 0a9 9 0 1 0-18 0M12 12m-5 0a5 5 0 1 0 10 0a5 5 0 1 0-10 0M12 12m-1.2 0a1.2 1.2 0 1 0 2.4 0a1.2 1.2 0 1 0-2.4 0',
  bulb:'M9 18h6M10 21h4M12 3a6 6 0 0 0-3.9 10.6c.6.5.9 1.3.9 2.1v.3h6v-.3c0-.8.3-1.6.9-2.1A6 6 0 0 0 12 3z',
  shapes:'M12 3l7 9-7 9-7-9 7-9z',
  scale:'M12 4v17M8 21h8M12 4L5 6.5M12 4l7 2.5M5 6.5L2.8 12a3.2 3.2 0 0 0 4.4 0L5 6.5zM19 6.5L16.8 12a3.2 3.2 0 0 0 4.4 0L19 6.5z',
  sun:'M12 4V2M12 22v-2M4 12H2M22 12h-2M5.5 5.5L4 4M18.5 18.5L20 20M18.5 5.5L20 4M5.5 18.5L4 20M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8z',
  moon:'M20 14A8 8 0 1 1 10 4a6.5 6.5 0 0 0 10 10z'
};
App.icon=(n,size)=>`<svg class="ic" viewBox="0 0 24 24" width="${size||18}" height="${size||18}" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="${App.ICONS[n]||''}"/></svg>`;

/* ---------------- persistent store ---------------- */
const DEFAULTS = {
  v:2, xp:0,
  daily:{date:'',xp:0,goal:50},
  streak:{count:0,last:''},
  topics:{},                    // id -> {c,t,recent:[0/1...]}
  counters:{},                  // freeform numeric counters
  badges:[],
  review:[],                    // wrong-answer deck
  examHistory:[],
  navBest:{},                   // exercise id -> best score
  settings:{theme:'light',themeV:3,sound:true,haptics:true},
  seen:{}
};
function loadStore(){
  try{
    const raw=localStorage.getItem('yamaut2');
    if(raw){ const s=JSON.parse(raw); return Object.assign({},DEFAULTS,s,{
      daily:Object.assign({},DEFAULTS.daily,s.daily),
      streak:Object.assign({},DEFAULTS.streak,s.streak),
      settings:Object.assign({},DEFAULTS.settings,s.settings)
    }); }
  }catch(e){}
  return JSON.parse(JSON.stringify(DEFAULTS));
}
const store = App.store = loadStore();
let saveT=null;
App.save = ()=>{ clearTimeout(saveT); saveT=setTimeout(()=>{ try{localStorage.setItem('yamaut2',JSON.stringify(store));}catch(e){} },300); };

/* ---------------- ranks & badges ---------------- */
App.RANKS = [
  {xp:0,    name:'חניך סיפון', icon:'🪢'},
  {xp:120,  name:'מלח',        icon:'⚓'},
  {xp:300,  name:'מלח ראשון',  icon:'🌊'},
  {xp:600,  name:'רב־מלח',     icon:'🧭'},
  {xp:1000, name:'קצין שלישי', icon:'🎖️'},
  {xp:1600, name:'קצין שני',   icon:'✴️'},
  {xp:2400, name:'חובל ראשון', icon:'🥇'},
  {xp:3500, name:'רב־חובל',    icon:'👨‍✈️'},
  {xp:5000, name:'קברניט',     icon:'⛵'},
  {xp:7000, name:'זאב ים',     icon:'🐺'}
];
App.rankIdx = xp=>{ let i=0; App.RANKS.forEach((r,k)=>{ if(xp>=r.xp) i=k; }); return i; };
App.rankOf  = xp=>App.RANKS[App.rankIdx(xp)];

const cnt = k=>store.counters[k]||0;
App.BADGES = [
  {id:'first',    icon:'⚓', name:'עלייה לסיפון',   desc:'תשובה נכונה ראשונה',              check:()=>cnt('correct')>=1},
  {id:'q100',     icon:'💯', name:'100 נכונות',      desc:'100 תשובות נכונות',               check:()=>cnt('correct')>=100},
  {id:'q500',     icon:'🏛️', name:'500 נכונות',      desc:'500 תשובות נכונות',               check:()=>cnt('correct')>=500},
  {id:'combo10',  icon:'⚡', name:'רצף מושלם',       desc:'10 תשובות נכונות ברצף',           check:()=>cnt('comboBest')>=10},
  {id:'streak3',  icon:'🔥', name:'3 ימים',          desc:'רצף אימון של 3 ימים',             check:()=>store.streak.count>=3},
  {id:'streak7',  icon:'🌋', name:'שבוע שלם',        desc:'רצף אימון של 7 ימים',             check:()=>store.streak.count>=7},
  {id:'streak30', icon:'🌊', name:'חודש בים',        desc:'רצף אימון של 30 יום',             check:()=>store.streak.count>=30},
  {id:'scn20',    icon:'🚢', name:'רב־תמרן',         desc:'20 תמרונים נכונים בתרחישים',      check:()=>cnt('scenarioOk')>=20},
  {id:'owl',      icon:'🦉', name:'ינשוף לילה',      desc:'10 זיהויי לילה נכונים בתרחישים',  check:()=>cnt('nightOk')>=10},
  {id:'exampass', icon:'🎓', name:'עובר מבחן',       desc:'ציון עובר במבחן סימולציה',        check:()=>cnt('examPass')>=1},
  {id:'exam100',  icon:'🏆', name:'מבחן מושלם',      desc:'100% במבחן סימולציה',             check:()=>cnt('examPerfect')>=1},
  {id:'navfix',   icon:'🧭', name:'נווט',            desc:'10 קביעות מקום מוצלחות',          check:()=>cnt('fixOk')>=10},
  {id:'sniper',   icon:'🎯', name:'צלף',             desc:'קביעת מקום מדויקת במיוחד',        check:()=>cnt('fixPerfect')>=1},
  {id:'d3',       icon:'🛥️', name:'סובב הסירה',      desc:'צפייה בכל כלי השיט בתלת־ממד',     check:()=>Object.keys(store.seen.d3||{}).length>=(App.R?App.R.vessels.length:15)},
  {id:'review0',  icon:'🧹', name:'סיפון נקי',       desc:'רוקנת את חפיסת הטעויות',          check:()=>cnt('reviewCleared')>=1}
];
App.checkBadges = ()=>{
  App.BADGES.forEach(b=>{
    if(store.badges.includes(b.id)) return;
    let ok=false; try{ ok=b.check(); }catch(e){}
    if(ok){ store.badges.push(b.id); App.save();
      App.toast(b.icon+' תג חדש: '+b.name); App.confetti(80); App.sfx('level'); }
  });
};
App.bump = (k,n)=>{ store.counters[k]=(store.counters[k]||0)+(n==null?1:n); App.save(); };

/* ---------------- XP / streak / mastery ---------------- */
function markActivity(xp){
  const today=App.todayStr();
  if(store.daily.date!==today){ store.daily.date=today; store.daily.xp=0; }
  const before=store.daily.xp;
  store.daily.xp+=xp;
  if(before<store.daily.goal && store.daily.xp>=store.daily.goal){
    App.toast('יעד יומי הושלם!'); App.confetti(60);
  }
  if(store.streak.last!==today){
    const y=new Date(); y.setDate(y.getDate()-1);
    const yStr=y.getFullYear()+'-'+String(y.getMonth()+1).padStart(2,'0')+'-'+String(y.getDate()).padStart(2,'0');
    store.streak.count = (store.streak.last===yStr) ? store.streak.count+1 : 1;
    store.streak.last=today;
    if(store.streak.count>1) App.toast('רצף של '+store.streak.count+' ימים!');
  }
}
App.addXP = (n,quiet)=>{
  if(n<=0) return;
  const beforeRank=App.rankIdx(store.xp);
  store.xp+=n; markActivity(n);
  const afterRank=App.rankIdx(store.xp);
  if(afterRank>beforeRank){
    const r=App.RANKS[afterRank];
    App.toast('דרגה חדשה: '+r.name+'!'); App.confetti(160); App.sfx('level');
  } else if(!quiet){ /* subtle — HUD updates */ }
  App.save(); App.renderHUD(); App.checkBadges();
};

let combo=0;
App.combo = ()=>combo;
/* recordAnswer: מעדכן שליטה בנושא, קומבו, XP, חפיסת חזרה. מחזיר {xp,combo} */
App.recordAnswer = (topic, ok, reviewItem)=>{
  const t=store.topics[topic]||(store.topics[topic]={c:0,t:0,recent:[]});
  t.t++; if(ok)t.c++;
  t.recent.push(ok?1:0); if(t.recent.length>20)t.recent.shift();
  App.bump('answers');
  let xp=0;
  if(ok){
    combo++; App.bump('correct');
    if(combo>cnt('comboBest')) store.counters.comboBest=combo;
    xp=10+Math.min(combo-1,10);
    App.addXP(xp,true);
    App.haptic('good'); App.sfx('good');
  } else {
    combo=0;
    App.haptic('bad'); App.sfx('bad');
    if(reviewItem) App.reviewAdd(reviewItem);
  }
  App.save(); App.renderHUD(); App.checkBadges();
  return {xp,combo};
};
App.masteryOf = topic=>{
  const t=store.topics[topic];
  if(!t||!t.recent.length) return 0;
  return t.recent.reduce((a,b)=>a+b,0)/t.recent.length;
};

/* ---------------- review deck (חזרה על טעויות) ---------------- */
App.reviewAdd = item=>{
  if(!item||!item.sig) return;
  const ex=store.review.find(r=>r.sig===item.sig);
  if(ex){ ex.wrong=(ex.wrong||1)+1; ex.ok=0; }
  else {
    store.review.push(Object.assign({wrong:1,ok:0,added:App.todayStr()},item));
    if(store.review.length>120) store.review.shift();
  }
  App.save();
};
App.reviewResolve = (sig,ok)=>{
  const i=store.review.findIndex(r=>r.sig===sig); if(i<0)return;
  if(ok){ store.review[i].ok=(store.review[i].ok||0)+1;
    if(store.review[i].ok>=2){ store.review.splice(i,1);
      if(!store.review.length) App.bump('reviewCleared'); } }
  else store.review[i].ok=0;
  App.save();
};

/* ---------------- audio ---------------- */
let actx=null;
function audioCtx(){ if(!actx){try{actx=new (window.AudioContext||window.webkitAudioContext)();}catch(e){}} return actx; }
App.blast = (t,dur)=>{
  const c=audioCtx(); if(!c)return;
  const g=c.createGain(); const f=c.createBiquadFilter();
  f.type='lowpass'; f.frequency.value=900;
  const o1=c.createOscillator(),o2=c.createOscillator(),o3=c.createOscillator();
  o1.type='sawtooth';o1.frequency.value=120; o2.type='sawtooth';o2.frequency.value=180;
  o3.type='sine';o3.frequency.value=240;
  o1.connect(f);o2.connect(f);o3.connect(f);f.connect(g);g.connect(c.destination);
  const a=0.04,r=0.18;
  g.gain.setValueAtTime(0.0001,t);
  g.gain.exponentialRampToValueAtTime(0.5,t+a);
  g.gain.setValueAtTime(0.5,t+dur-r);
  g.gain.exponentialRampToValueAtTime(0.0001,t+dur);
  [o1,o2,o3].forEach(o=>{o.start(t);o.stop(t+dur+0.02);});
};
/* פעמון/גונג סינתטיים (לאותות עוגן/שרטון בערפל) */
function bellStroke(t,low){
  const c=audioCtx(); if(!c)return;
  const fs=low?[290,436,720]:[1250,1870,2900];
  fs.forEach((f,i)=>{
    const o=c.createOscillator(),g=c.createGain();
    o.type='sine'; o.frequency.value=f*(1+(Math.random()-.5)*0.01);
    g.gain.setValueAtTime(0.0001,t);
    g.gain.exponentialRampToValueAtTime((low?0.30:0.22)/(i+1),t+0.008);
    g.gain.exponentialRampToValueAtTime(0.0001,t+(low?1.1:0.55));
    o.connect(g);g.connect(c.destination);o.start(t);o.stop(t+1.2);
  });
}
/* קודים: S=צפירה קצרה, L=ממושכת, B=צלצול פעמון מהיר, K=נקישת פעמון בודדת, G=גונג */
App.playSeq = seq=>{
  if(!store.settings.sound) return;
  const c=audioCtx(); if(!c)return;
  if(c.state==='suspended') c.resume();
  let t=c.currentTime+0.05;
  seq.forEach(s=>{
    if(s==='B'){ for(let i=0;i<8;i++) bellStroke(t+i*0.22,false); t+=8*0.22+0.5; }
    else if(s==='K'){ bellStroke(t,false); t+=0.55; }
    else if(s==='G'){ bellStroke(t,true); t+=1.0; }
    else { const d=(s==='L')?1.9:0.7; App.blast(t,d); t+=d+0.32; }
  });
};
/* אפקטים קצרים */
App.sfx = kind=>{
  if(!store.settings.sound) return;
  const c=audioCtx(); if(!c)return;
  if(c.state==='suspended') c.resume();
  const t=c.currentTime+0.01;
  const tone=(f0,f1,dur,type,vol,at)=>{
    const o=c.createOscillator(),g=c.createGain();
    o.type=type||'sine'; o.frequency.setValueAtTime(f0,at);
    if(f1) o.frequency.exponentialRampToValueAtTime(f1,at+dur);
    g.gain.setValueAtTime(0.0001,at);
    g.gain.exponentialRampToValueAtTime(vol||.18,at+.015);
    g.gain.exponentialRampToValueAtTime(.0001,at+dur);
    o.connect(g);g.connect(c.destination);o.start(at);o.stop(at+dur+.02);
  };
  if(kind==='good'){ tone(660,880,.14,'sine',.15,t); tone(880,1320,.16,'sine',.12,t+.08); }
  else if(kind==='bad'){ tone(220,160,.22,'square',.08,t); }
  else if(kind==='click'){ tone(1200,0,.05,'sine',.06,t); }
  else if(kind==='level'){ [523,659,784,1047].forEach((f,i)=>tone(f,0,.18,'triangle',.14,t+i*.09)); }
};
App.haptic = kind=>{
  if(!store.settings.haptics || !navigator.vibrate) return;
  try{
    if(kind==='good') navigator.vibrate(12);
    else if(kind==='bad') navigator.vibrate([40,60,40]);
    else navigator.vibrate(8);
  }catch(e){}
};

/* ---------------- toasts & confetti ---------------- */
App.toast = (msg,ms)=>{
  const host=$('#toasts'); if(!host)return;
  const el=document.createElement('div'); el.className='toast'; el.textContent=msg;
  host.appendChild(el);
  setTimeout(()=>{ el.classList.add('out'); setTimeout(()=>el.remove(),320); }, ms||2400);
};
App.confetti = n=>{
  if(matchMedia('(prefers-reduced-motion:reduce)').matches) return;
  const cv=$('#confetti'); if(!cv)return;
  const ctx=cv.getContext('2d');
  cv.width=innerWidth; cv.height=innerHeight;
  const colors=['#d9a441','#ff3b30','#22d07a','#4aa3ff','#ffd23b','#ece3ce'];
  const P=[];
  for(let i=0;i<(n||100);i++){
    P.push({x:innerWidth/2+(Math.random()-.5)*140, y:innerHeight*0.35,
      vx:(Math.random()-.5)*9, vy:-4-Math.random()*7,
      s:4+Math.random()*5, c:colors[App.ri(colors.length)],
      r:Math.random()*Math.PI, vr:(Math.random()-.5)*.3, life:1});
  }
  let frames=0;
  (function step(){
    frames++;
    ctx.clearRect(0,0,cv.width,cv.height);
    let alive=false;
    P.forEach(p=>{
      p.vy+=0.22; p.x+=p.vx; p.y+=p.vy; p.r+=p.vr; p.life-=0.008;
      if(p.life>0 && p.y<cv.height+20){ alive=true;
        ctx.save(); ctx.translate(p.x,p.y); ctx.rotate(p.r);
        ctx.globalAlpha=Math.max(0,p.life);
        ctx.fillStyle=p.c; ctx.fillRect(-p.s/2,-p.s/2,p.s,p.s*0.6); ctx.restore(); }
    });
    if(alive && frames<400) requestAnimationFrame(step);
    else ctx.clearRect(0,0,cv.width,cv.height);
  })();
};

/* ---------------- bottom sheet ---------------- */
let sheetOpenedAt=0;
App.openSheet = (title,bodyHTML)=>{
  sheetOpenedAt=Date.now();
  $('#sheetTitle').textContent=title; $('#sheetBody').innerHTML=bodyHTML;
  $('#sheetBack').classList.add('show'); $('#sheet').classList.add('show');
  document.body.classList.add('sheet-open');   // נעילת גלילת הרקע כל עוד הגיליון פתוח
};
/* במגע: פתיחה בזמן pointerdown גורמת ל-click הסינתטי (בהרמת האצבע) לפגוע
   ברקע שזה עתה נפתח ולסגור את הגיליון מיד — לכן חלון חסד קצר */
App.closeSheet = ()=>{
  if(Date.now()-sheetOpenedAt<350) return;
  $('#sheetBack').classList.remove('show'); $('#sheet').classList.remove('show');
  document.body.classList.remove('sheet-open');
};

/* ---------------- settings ---------------- */
/* זהות עיצוב אחת ("רגטה") בשני מצבים: בהיר/כהה, או אוטומטי לפי המערכת */
const MODES=[{id:'light',name:'בהיר'},{id:'dark',name:'כהה'},{id:'auto',name:'אוטומטי'}];
const THEME_COLOR={ocean:'#071522',paper:'#f0efe4'};
const darkMQ = matchMedia('(prefers-color-scheme: dark)');
function resolveMode(pref){
  if(pref==='dark') return 'ocean';
  if(pref==='light') return 'paper';
  return darkMQ.matches ? 'ocean' : 'paper';
}
App.applyTheme = pref=>{
  pref=pref||'light';
  if(pref==='ocean'||pref==='night') pref='dark';
  if(pref==='paper') pref='light';
  const id=resolveMode(pref);
  document.documentElement.setAttribute('data-theme',id);
  const m=document.querySelector('meta[name="theme-color"]'); if(m)m.setAttribute('content',THEME_COLOR[id]||'#071522');
  store.settings.theme=pref; App.save();
};
if(darkMQ.addEventListener) darkMQ.addEventListener('change',()=>{ if(store.settings.theme==='auto') App.applyTheme('auto'); });
App.openSettings = ()=>{
  const s=store.settings;
  App.openSheet('הגדרות', `
    <div class="setrow"><div><div class="sl">מצב תצוגה</div>
      <div class="sd">בהיר, כהה, או אוטומטי לפי המכשיר</div></div>
      <div class="seg">${MODES.map(t=>`<button data-th="${t.id}" aria-pressed="${s.theme===t.id}">${t.name}</button>`).join('')}</div></div>
    <div class="setrow"><div><div class="sl">צלילים</div><div class="sd">אותות קול ואפקטים</div></div>
      <button class="btn mini" id="setSound">${s.sound?'פועל':'כבוי'}</button></div>
    <div class="setrow"><div><div class="sl">רטט</div><div class="sd">משוב מישושי בטלפון</div></div>
      <button class="btn mini" id="setHaptic">${s.haptics?'פועל':'כבוי'}</button></div>
    <div class="setrow"><div><div class="sl">יעד יומי</div><div class="sd">נקודות XP ליום</div></div>
      <div class="seg">${[30,50,100].map(g=>`<button data-goal="${g}" aria-pressed="${store.daily.goal===g}">${g}</button>`).join('')}</div></div>
    <div class="setrow"><div><div class="sl">מאגר השאלות הרשמי</div>
      <div class="sd" id="bankInfo">${window.EXAM_BANK&&window.EXAM_BANK.meta?('עודכן: '+App.esc(window.EXAM_BANK.meta.fetched||'—')+(App.Updates&&App.Updates.hasOverride()?' · עדכון חי':' · מובנה')):'לא נטען'}</div></div>
      <div class="row">
        ${App.Updates&&App.Updates.hasOverride()?'<button class="btn mini ghost" id="bankRevert">שחזר למובנה</button>':''}
        <button class="btn mini" id="bankRefresh">משוך עדכון</button>
      </div></div>
    <div class="setrow"><div><div class="sl">גרסת האפליקציה</div><div class="sd">תקנות ותכנים מתעדכנים עם הגרסה</div></div>
      <button class="btn mini" id="appUpdate">בדוק עדכון</button></div>
    <div class="setrow"><div><div class="sl">איפוס התקדמות</div><div class="sd">מוחק XP, תגים והיסטוריה</div></div>
      <button class="btn mini" id="setReset">איפוס</button></div>`);
  $$('[data-th]').forEach(b=>b.addEventListener('click',()=>{ App.applyTheme(b.dataset.th); App.openSettings(); }));
  $('#setSound').addEventListener('click',()=>{ s.sound=!s.sound; App.save(); App.openSettings(); });
  $('#setHaptic').addEventListener('click',()=>{ s.haptics=!s.haptics; App.save(); App.openSettings(); });
  $$('[data-goal]').forEach(b=>b.addEventListener('click',()=>{ store.daily.goal=+b.dataset.goal; App.save(); App.openSettings(); }));
  const br=$('#bankRefresh');
  if(br) br.addEventListener('click',async ()=>{
    if(!App.Updates){ App.toast('רכיב העדכון לא נטען'); return; }
    br.disabled=true; br.textContent='מושך… 0%';
    try{
      const res=await App.Updates.refreshBank(p=>{ br.textContent='מושך… '+Math.round(p*100)+'%'; });
      App.toast(`✓ המאגר עודכן מהמקור הרשמי: ${res.total} שאלות (${res.added} חדשות · ${res.changed} שונו · ${res.removed} הוסרו)`,4200);
      App.sfx('good'); App.openSettings(); App.render();
    }catch(e){
      App.toast('העדכון נכשל: '+(e&&e.message?e.message:'אין חיבור למקור'),4000);
      br.disabled=false; br.textContent='משוך עדכון';
    }
  });
  const bv=$('#bankRevert');
  if(bv) bv.addEventListener('click',()=>{ App.Updates.clearOverride(); App.toast('העדכון המקומי נמחק — נטען המאגר המובנה'); location.reload(); });
  const au=$('#appUpdate');
  if(au) au.addEventListener('click',()=>{ App.toast('בודק עדכון…'); App.Updates?App.Updates.checkAppUpdate():location.reload(); });
  $('#setReset').addEventListener('click',()=>{
    if(confirm('לאפס את כל ההתקדמות? פעולה זו אינה הפיכה.')){
      localStorage.removeItem('yamaut2'); location.reload();
    }
  });
};

/* ---------------- tabs / router ---------------- */
App.TABS=[
  {id:'home',  label:'בית',   icon:'M3 11l9-8 9 8M5 9.5V20h5v-6h4v6h5V9.5'},
  {id:'learn', label:'לימוד', icon:'M12 3L2 8l10 5 10-5-10-5zM6 10.5V15c0 1.7 2.7 3 6 3s6-1.3 6-3v-4.5',
    subs:[
      {id:'boat3d',label:'אורות וצורות',ic:'anchor',desc:'סובבו כלי שיט בתלת־ממד וראו את האורות מכל כיוון'},
      {id:'marks',label:'מצופים',ic:'buoy',desc:'מערכת IALA אזור A — עם מקצבי ההבהוב האמיתיים'},
      {id:'sounds',label:'אותות קול',ic:'horn',desc:'צפירות, פעמון וגונג — עם השמעה אמיתית'},
      {id:'flags',label:'דגלים',ic:'flag',desc:'דגלי הקוד הבינלאומי ומשמעותם'}]},
  {id:'practice', label:'תרגול', icon:'M12 12m-9 0a9 9 0 1 0 18 0a9 9 0 1 0-18 0M12 12m-5 0a5 5 0 1 0 10 0a5 5 0 1 0-10 0M12 12m-1.2 0a1.2 1.2 0 1 0 2.4 0a1.2 1.2 0 1 0-2.4 0',
    subs:[
      {id:'quiz',label:'חידון',ic:'dice',desc:'שאלות שנוצרות מהתקנות — אינסוף תרגול'},
      {id:'scenarios',label:'תרחישים',ic:'ship',desc:'שרטטו את התמרון והסימולציה תבדוק אתכם'},
      {id:'review',label:'חזרה על טעויות',ic:'broom',desc:'כל שאלה שטעיתם בה — עד שתשבו עליה'}]},
  {id:'exam',  label:'מבחן',  icon:'M9 3h6v3H9zM7 4H5v17h14V4h-2M9 13l2 2 4-4.5'},
  {id:'nav',   label:'ניווט', icon:'M12 12m-9 0a9 9 0 1 0 18 0a9 9 0 1 0-18 0M15.5 8.5l-2.2 5-5 2.2 2.2-5z',
    subs:[
      {id:'chart',label:'תרגול מפה',ic:'map',desc:'קביעת מקום, כיוונים ומרחקים על מפת אימונים'},
      {id:'navcalc',label:'מחשבונים',ic:'calc',desc:'מהירות·זמן·מרחק, המרת כיוונים ו-ETA'},
      {id:'navlearn',label:'מושגים',ic:'book',desc:'כל מושגי הניווט החופי — בקצרה'}]}
];
const VIEWS={};
App.registerView=(id,def)=>{ VIEWS[id]=def; };
App.current={tab:'home',sub:null};

function tabOf(id){ return App.TABS.find(t=>t.id===id); }
App.navigate=(tab,sub)=>{
  const t=tabOf(tab)||App.TABS[0];
  const hash='#/'+t.id+(sub?'/'+sub:'');
  if(location.hash!==hash){ location.hash=hash; return; } // hashchange יפעיל render
  App.current={tab:t.id,sub:sub||null}; App.render();
};
function parseHash(){
  const m=location.hash.match(/^#\/([\w-]+)(?:\/([\w-]+))?/);
  if(!m) return {tab:'home',sub:null};
  const t=tabOf(m[1])||App.TABS[0];
  let sub=m[2]||null;
  if(t.subs){ if(sub && !t.subs.some(s=>s.id===sub)) sub=null; }  // ללא sub → תפריט המדור
  else sub=null;
  return {tab:t.id,sub};
}
window.addEventListener('hashchange',()=>{ App.current=parseHash(); App.render(); window.scrollTo(0,0); });

function renderTabs(){
  $('#tabs').innerHTML=App.TABS.map(t=>`<button role="tab" data-t="${t.id}" aria-selected="${App.current.tab===t.id}">
    <svg viewBox="0 0 24 24"><path d="${t.icon}" stroke-linecap="round" stroke-linejoin="round"/></svg>
    <span>${t.label}</span></button>`).join('');
  $$('#tabs button').forEach(b=>b.addEventListener('click',()=>{ App.sfx('click'); App.navigate(b.dataset.t); }));
}
/* בתוך מדור: שורת "חזרה" עם שם המדור — במקום לשוניות קטנות */
function renderSubnav(){
  const t=tabOf(App.current.tab);
  const host=$('#subnav');
  if(!t.subs || !App.current.sub){ host.innerHTML=''; return; }
  const s=t.subs.find(x=>x.id===App.current.sub);
  host.innerHTML=`<div class="backrow">
    <button class="iconbtn" id="backHub" aria-label="חזרה ל${t.label}">→</button>
    <span class="bt">${s?App.icon(s.ic,17):''} ${s?s.label:''}</span>
    <span class="bh">${t.label}</span>
  </div>`;
  $('#backHub').addEventListener('click',()=>{ App.sfx('click'); App.navigate(t.id); });
}
/* תפריט מדור: כרטיסים גדולים לכל תת-מסך */
function renderHub(t,el){
  el.innerHTML=`
    <div class="section-title"><h2>${t.label}</h2></div>
    <div class="hubgrid">
      ${t.subs.map(s=>`<button class="hubcard" data-s="${s.id}">
        <span class="hi">${App.icon(s.ic,30)}</span>
        <span><span class="ht">${s.label}</span><span class="hd">${s.desc||''}</span></span>
        <span class="ha">‹</span>
      </button>`).join('')}
    </div>`;
  $$('.hubcard',el).forEach(b=>b.addEventListener('click',()=>{ App.sfx('click'); App.navigate(t.id,b.dataset.s); }));
}
App.renderHUD=()=>{
  const host=$('#hud'); if(!host)return;
  const r=App.rankOf(store.xp);
  host.innerHTML=`
    <span class="pill flame" title="רצף ימים">${App.icon('flame',15)}${store.streak.count||0}</span>
    <span class="pill" title="${r.name}">${App.icon('anchor',14)}<span dir="ltr">${store.xp} XP</span></span>
    <button class="iconbtn" id="gear" aria-label="הגדרות">${App.icon('gear',19)}</button>`;
  $('#gear').addEventListener('click',App.openSettings);
};
App.render=()=>{
  renderTabs(); renderSubnav(); App.renderHUD();
  const id=App.current.sub||App.current.tab;
  const v=VIEWS[id];
  const host=$('#view');
  host.innerHTML='';
  // מעבר עדין ואחיד בין מסכים — עלייה קלה ודהייה (בלי החלקה אופקית של כל הדף,
  // שהרגישה "מוזרה" בטלפון בעת מעבר בין לשוניות).
  const idx=App.TABS.findIndex(t=>t.id===App.current.tab);
  App._lastTabIdx=idx;
  const el=document.createElement('div'); el.className='view-enter'; host.appendChild(el);
  const t=tabOf(App.current.tab);
  if(t.subs && !App.current.sub) renderHub(t,el);
  else if(v) v.render(el);
  else el.innerHTML='<div class="card" style="padding:20px;text-align:center">בקרוב…</div>';
};

/* ---------------- המפרשית הנודדת על הגלים ---------------- */
function startSailDrift(){
  const el=document.getElementById('sailDrift'); if(!el || !el.animate) return;
  if(matchMedia('(prefers-reduced-motion:reduce)').matches) return;
  const fw=el.querySelector('.fw');
  let anim=null;
  function voyage(){
    const w=innerWidth, ltr=Math.random()<0.5;
    fw.style.transform = ltr ? 'scaleX(1)' : 'scaleX(-1)';   // החרטום לכיוון ההפלגה
    const from = ltr ? -70 : w+70, to = ltr ? w+70 : -70;
    if(anim) anim.cancel();
    el.style.opacity='1';
    anim=el.animate(
      [{transform:`translateX(${from}px)`},{transform:`translateX(${to}px)`}],
      {duration:17000+Math.random()*9000, easing:'linear', fill:'forwards'});
    anim.onfinish=()=>{ el.style.opacity='0'; schedule(false); };
  }
  function schedule(first){
    setTimeout(voyage, first ? 7000+Math.random()*8000 : 40000+Math.random()*80000);
  }
  schedule(true);
}

/* ---------------- boot ---------------- */
App.start=()=>{
  if(!App.R){
    document.getElementById('view').innerHTML='<p style="padding:20px">שגיאה: לא נמצא rules.js. ודאו שכל הקבצים הועתקו יחד.</p>';
    return;
  }
  if(App.Updates) App.Updates.loadOverride();   // מאגר שאלות מעודכן שנשמר מקומית
  if(!store.settings.themeV || store.settings.themeV<3){
    store.settings.themeV=3;
    store.settings.theme = (store.settings.theme==='ocean'||store.settings.theme==='night') ? 'dark' : 'light';
    App.save();
  }
  App.applyTheme(store.settings.theme||'light');
  const foot=document.getElementById('footer');
  if(foot) foot.innerHTML=App.esc(App.R.meta.source)+'<br>גרסה '+App.esc(App.R.meta.version)+' · עודכן '+App.esc(App.R.meta.updated)+
    '<br><span dir="ltr">© 2026 Itay Bracha</span> · כל הזכויות שמורות';
  $('#sheetBack').addEventListener('click',App.closeSheet);
  $('#sheetClose').addEventListener('click',App.closeSheet);
  document.addEventListener('keydown',e=>{ if(e.key==='Escape')App.closeSheet(); });
  // אות/צורה לחיצים — גיליון הסבר
  document.addEventListener('click',e=>{
    const h=e.target.closest('.nf-hot'); if(!h)return;
    App.openSheet(h.dataset.title||'','<p>'+App.esc(h.dataset.desc||'')+'</p>');
  });
  document.addEventListener('keydown',e=>{
    if((e.key==='Enter'||e.key===' ')&&document.activeElement&&document.activeElement.classList&&document.activeElement.classList.contains('nf-hot')){
      e.preventDefault(); const h=document.activeElement;
      App.openSheet(h.dataset.title||'','<p>'+App.esc(h.dataset.desc||'')+'</p>');
    }
  });
  // service worker — רק ב-https (GitHub Pages); ב-file:// מדלגים
  if('serviceWorker' in navigator && location.protocol==='https:'){
    navigator.serviceWorker.register('sw.js').catch(()=>{});
  }
  startSailDrift();
  App.current=parseHash();
  App.render();
};

})();
