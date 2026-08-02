const CACHE_VERSION = 'ruralcare-v2';
const STATIC_CACHE = `${CACHE_VERSION}-static`;
const RUNTIME_CACHE = `${CACHE_VERSION}-runtime`;

const APP_SHELL = [
  './',
  './index.html',
  './auth.html',
  './dashboard.html',
  './intake.html',
  './patient-detail.html',
  './settings.html',
  './profile.html',
  './css/index.css',
  './js/index.js',
  './manifest.json',
  './img/logo-full-color.png',
  './img/logo-icon-color.png',
  './img/icon-192.png',
  './img/icon-512.png',
  './img/icon-512-maskable.png'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(STATIC_CACHE).then((cache) => {
      return Promise.all(
        APP_SHELL.map((url) =>
          cache.add(url).catch((err) => {
            console.warn('[SW] Skipped precaching (not found):', url);
          })
        )
      );
    }).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((key) => key.startsWith('ruralcare-') && key !== STATIC_CACHE && key !== RUNTIME_CACHE)
          .map((key) => caches.delete(key))
      )
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const req = event.request;

  if (req.method !== 'GET') return;

  const url = new URL(req.url);
  const isSameOrigin = url.origin === self.location.origin;

  // Navigation requests (loading a page): network-first, so anyone
  // with a connection always gets the latest version. Falls back to
  // the cached copy only when the network genuinely fails (offline).
  if (req.mode === 'navigate') {
    event.respondWith(
      fetch(req)
        .then((res) => {
          if (res && res.ok) {
            caches.open(STATIC_CACHE).then((cache) => cache.put(req, res.clone()));
          }
          return res;
        })
        .catch(() => caches.match(req).then((cached) => cached || caches.match('./index.html')))
    );
    return;
  }

  // Same-origin static assets: network-first, cache as offline fallback.
  if (isSameOrigin) {
    event.respondWith(
      fetch(req)
        .then((res) => {
          if (res && res.ok) {
            caches.open(STATIC_CACHE).then((cache) => cache.put(req, res.clone()));
          }
          return res;
        })
        .catch(() => caches.match(req))
    );
    return;
  }

  // Cross-origin assets (Tailwind CDN, Google Fonts, Lucide, Chart.js):
  // cache-first with a runtime cache, best-effort for offline reuse.
  event.respondWith(
    caches.match(req).then((cached) => {
      if (cached) return cached;
      return fetch(req)
        .then((res) => {
          if (res && (res.ok || res.type === 'opaque')) {
            caches.open(RUNTIME_CACHE).then((cache) => cache.put(req, res.clone()));
          }
          return res;
        })
        .catch(() => cached);
    })
  );
});