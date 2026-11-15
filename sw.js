/* LecSync Web · service worker: app shell + offline */
const V = 'lcs-v1.2.0';
const SHELL = [
  './', './index.html', './manifest.webmanifest',
  './assets/css/app.css',
  './assets/js/app.js', './assets/js/core.js', './assets/js/ui.js',
  './assets/js/speech.js', './assets/js/ai.js',
  './assets/js/screen-record.js', './assets/js/screen-session.js',
  './assets/js/screen-library.js', './assets/js/screen-me.js',
  './assets/js/screen-tools.js', './assets/js/screen-onboard.js',
  './icon-180.png', './icon-192.png', './icon-512.png', './ios.html',
];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(V).then(c => c.addAll(SHELL)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', e => {
  e.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter(k => k !== V).map(k => caches.delete(k)));
    await self.clients.claim();
  })());
});
self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== location.origin) return; // never cache third-party (translate APIs)
  if (req.mode === 'navigate') {
    e.respondWith((async () => {
      try {
        const fresh = await fetch(req);
        const c = await caches.open(V); c.put('./index.html', fresh.clone());
        return fresh;
      } catch {
        return (await caches.match('./index.html')) || Response.error();
      }
    })());
    return;
  }
  e.respondWith((async () => {
    const hit = await caches.match(req);
    if (hit) return hit;
    try {
      const res = await fetch(req);
      if (res.ok && res.type === 'basic') { const c = await caches.open(V); c.put(req, res.clone()); }
      return res;
    } catch { return Response.error(); }
  })());
});
