/* Maaş Takip: çevrimdışı açılış için uygulama dosyalarını önbelleğe alır.
   Kullanıcı verilerine dokunmaz (veriler tarayıcının localStorage'ında durur). */
const CACHE = 'maas-takip-v1-2026-11-15n';
const FILES = ['./', './index.html', './manifest.webmanifest', './icon-192.png', './icon-512.png', './apple-touch-icon.png', './lib/pdf.min.js', './lib/pdf.worker.min.js', './fonts/bricolage-grotesque-latin-standard-normal.woff2', './fonts/bricolage-grotesque-latin-ext-standard-normal.woff2', './fonts/hanken-grotesk-latin-wght-normal.woff2', './fonts/hanken-grotesk-latin-ext-wght-normal.woff2'];
self.addEventListener('install', e => { e.waitUntil(caches.open(CACHE).then(c => c.addAll(FILES.map(u => new Request(u, { cache: 'reload' })))).then(() => self.skipWaiting())); });
self.addEventListener('activate', e => { e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim())); });
/* Önce ağdan dene (güncellemeler hemen gelsin), ağ yoksa önbellekten aç */
self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET' || new URL(e.request.url).origin !== location.origin) return;
  if (new URL(e.request.url).pathname.endsWith('version.json')) return;
  e.respondWith(fetch(e.request, { cache: 'no-cache' }).then(r => { if (r && r.ok) { const cp = r.clone(); caches.open(CACHE).then(c => c.put(e.request, cp)); } return r; }).catch(() => caches.match(e.request, { ignoreSearch: true }).then(m => m || caches.match('./index.html'))));
});
