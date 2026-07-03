/* Service Worker — עבודה לא מקוונת מלאה (נרשם רק ב-https, לא ב-file://) */
const CACHE = 'yamaut-v2.1.0';
const ASSETS = [
  './',
  'index.html',
  'css/app.css',
  'rules.js',
  'js/core.js',
  'js/update.js',
  'js/draw.js',
  'js/data/exam-bank.js',
  'js/data/figures.js',
  'js/data/navdata.js',
  'js/views/home.js',
  'js/views/study.js',
  'js/views/boat3d.js',
  'js/views/marks.js',
  'js/views/sounds.js',
  'js/views/flags.js',
  'js/views/quiz.js',
  'js/views/scenarios.js',
  'js/views/review.js',
  'js/views/exam.js',
  'js/views/nav.js',
  'manifest.webmanifest',
  'icon.svg',
  'apple-touch-icon.png',
  'fonts/rubik-hebrew.woff2',
  'fonts/rubik-latin.woff2',
  'fonts/frl-hebrew.woff2',
  'fonts/frl-latin.woff2'
];
self.addEventListener('install', e=>{
  e.waitUntil(caches.open(CACHE).then(c=>c.addAll(ASSETS)).then(()=>self.skipWaiting()));
});
self.addEventListener('activate', e=>{
  e.waitUntil(caches.keys().then(keys=>Promise.all(
    keys.filter(k=>k!==CACHE).map(k=>caches.delete(k))
  )).then(()=>self.clients.claim()));
});
/* stale-while-revalidate: עונים מהמטמון מיד ומרעננים ברקע */
self.addEventListener('fetch', e=>{
  if(e.request.method!=='GET') return;
  e.respondWith(
    caches.match(e.request).then(cached=>{
      const fetched=fetch(e.request).then(res=>{
        if(res && res.ok && new URL(e.request.url).origin===location.origin){
          const clone=res.clone();
          caches.open(CACHE).then(c=>c.put(e.request,clone));
        }
        return res;
      }).catch(()=>cached);
      return cached||fetched;
    })
  );
});
