const CACHE_VERSION = 'ruralcare-v7';
const STATIC_CACHE = `${CACHE_VERSION}-static`;
const RUNTIME_CACHE = `${CACHE_VERSION}-runtime`;
const NETWORK_TIMEOUT = 4000;

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
  './js/sttWorker.js',
  './manifest.json',
  './img/logo-full-color.png',
  './img/logo-icon-color.png',
  './img/rc-assistant-logo.png',
  './img/apple-touch-icon.png',
  './favicon.ico',
  './img/icon-192.png',
  './img/icon-512.png',
  './img/icon-512-maskable.png'
];

const CDN_ASSETS = [
  'https://cdn.tailwindcss.com',
  'https://unpkg.com/lucide@latest',
  'https://cdn.jsdelivr.net/npm/chart.js',
  'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap',
  'https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@12..96,600;12..96,700;12..96,800&family=Public+Sans:wght@400;500;600&display=swap'
];

function fetchWithTimeout(req, ms) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('timeout')), ms);
    fetch(req).then(
      res => {
        clearTimeout(timer);
        resolve(res);
      },
      err => {
        clearTimeout(timer);
        reject(err);
      }
    );
  });
}

function pathKey(url) {
  return new Request(url.origin + url.pathname);
}

self.addEventListener('install', event => {
  event.waitUntil(
    (async () => {
      const shell = await caches.open(STATIC_CACHE);
      await Promise.all(APP_SHELL.map(url => shell.add(url).catch(() => {})));
      const runtime = await caches.open(RUNTIME_CACHE);
      await Promise.all(
        CDN_ASSETS.map(url =>
          fetch(new Request(url, { mode: 'no-cors' }))
            .then(res => runtime.put(url, res))
            .catch(() => {})
        )
      );
      await self.skipWaiting();
    })()
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches
      .keys()
      .then(keys =>
        Promise.all(
          keys
            .filter(key => key.startsWith('ruralcare-') && key !== STATIC_CACHE && key !== RUNTIME_CACHE)
            .map(key => caches.delete(key))
        )
      )
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', event => {
  const req = event.request;
  if (req.method !== 'GET') return;

  const url = new URL(req.url);
  if (url.hostname.endsWith('huggingface.co') || url.hostname.endsWith('hf.co')) return;

  const sameOrigin = url.origin === self.location.origin;

  if (req.mode === 'navigate') {
    event.respondWith(
      fetchWithTimeout(req, NETWORK_TIMEOUT)
        .then(res => {
          if (res && res.ok) {
            const copy = res.clone();
            caches.open(STATIC_CACHE).then(cache => cache.put(pathKey(url), copy));
          }
          return res;
        })
        .catch(async () => {
          const cached =
            (await caches.match(pathKey(url))) ||
            (await caches.match(req, { ignoreSearch: true })) ||
            (await caches.match('./dashboard.html')) ||
            (await caches.match('./index.html'));
          return cached || new Response('You are offline and this page has not been saved yet.', { status: 503, headers: { 'Content-Type': 'text/plain' } });
        })
    );
    return;
  }

  if (sameOrigin) {
    event.respondWith(
      fetchWithTimeout(req, NETWORK_TIMEOUT)
        .then(res => {
          if (res && res.ok) {
            const copy = res.clone();
            caches.open(STATIC_CACHE).then(cache => cache.put(req, copy));
          }
          return res;
        })
        .catch(() => caches.match(req, { ignoreSearch: true }))
    );
    return;
  }

  event.respondWith(
    caches.match(req).then(cached => {
      const refresh = fetch(req)
        .then(res => {
          if (res && (res.ok || res.type === 'opaque')) {
            const copy = res.clone();
            caches.open(RUNTIME_CACHE).then(cache => cache.put(req, copy));
          }
          return res;
        })
        .catch(() => cached);
      return cached || refresh;
    })
  );
});