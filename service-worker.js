// service-worker.js
// Minimal offline cache so the app opens and works with no connection — which
// matters, because hard moments don't wait for good signal. Cache-first for
// the app shell; the app itself stores all user data locally (no network).

const CACHE = 'calmmedown-v1';
const ASSETS = [
  './',
  './index.html',
  './manifest.webmanifest',
  './src/css/styles.css',
  './src/js/app.js',
  './src/js/store.js',
  './src/js/content.js',
  './src/js/adapt.js',
  './src/js/session.js',
  './src/js/games.js',
  './icons/icon.svg',
];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(ASSETS)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (e) => {
  const { request } = e;
  if (request.method !== 'GET') return;
  e.respondWith(
    caches.match(request).then((cached) => {
      if (cached) return cached;
      return fetch(request)
        .then((res) => {
          // Runtime-cache same-origin GETs so subsequent visits work offline.
          if (res.ok && new URL(request.url).origin === location.origin) {
            const copy = res.clone();
            caches.open(CACHE).then((c) => c.put(request, copy));
          }
          return res;
        })
        .catch(() => caches.match('./index.html'));
    })
  );
});
