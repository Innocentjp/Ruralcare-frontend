'use strict';

const VERSION = 'ruralcare-v9';
const NAV_TIMEOUT_MS = 2500;
const SHELL = [
  './',
  'index.html',
  'auth.html',
  'dashboard.html',
  'intake.html',
  'patient-detail.html',
  'referrals.html',
  'visits.html',
  'profile.html',
  'settings.html',
  'manifest.json',
  'css/index.css',
  'css/landing.css',
  'js/index.js',
  'js/landing.js',
  'js/referrals.js',
  'js/visits.js'
];
const CDN = [
  'https://cdn.tailwindcss.com',
  'https://cdn.tailwindcss.com/3.4.17',
  'https://unpkg.com/lucide@0.294.0',
  'https://unpkg.com/lucide@0.294.0/dist/umd/lucide.min.js',
  'https://unpkg.com/lucide@latest',
  'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.110.9/dist/umd/supabase.js'
];
const BYPASS_HOSTS = ['supabase.co', 'supabase.in', 'huggingface.co', 'hf.co'];

function precacheCdn(cache) {
  return Promise.all(CDN.map(url =>
    fetch(new Request(url, { mode: 'no-cors' }))
      .then(response => cache.put(url, response))
      .catch(() => null)
  ));
}

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(VERSION)
      .then(cache => Promise.all(SHELL.map(url => cache.add(url).catch(() => null)).concat([precacheCdn(cache)])))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(key => key !== VERSION).map(key => caches.delete(key))))
      .then(() => self.clients.claim())
  );
});

function shouldBypass(url) {
  if (url.protocol !== 'http:' && url.protocol !== 'https:') return true;
  if (url.pathname.startsWith('/api/')) return true;
  return BYPASS_HOSTS.some(host => url.hostname === host || url.hostname.endsWith('.' + host));
}

async function networkFirst(request, event) {
  const cache = await caches.open(VERSION);
  const cached = await cache.match(request, { ignoreSearch: true });
  const network = fetch(request)
    .then(response => {
      if (response && response.ok) cache.put(request, response.clone());
      return response;
    })
    .catch(() => null);
  event.waitUntil(network);
  if (!cached) {
    return (await network) || (request.mode === 'navigate' ? await cache.match('index.html') : null) || Response.error();
  }
  const timer = new Promise(resolve => setTimeout(() => resolve(null), NAV_TIMEOUT_MS));
  return (await Promise.race([network, timer])) || cached;
}

async function staleWhileRevalidate(request) {
  const cache = await caches.open(VERSION);
  const cached = await cache.match(request);
  const network = fetch(request)
    .then(response => {
      if (response && (response.ok || response.type === 'opaque')) cache.put(request, response.clone());
      return response;
    })
    .catch(() => null);
  return cached || (await network) || Response.error();
}

self.addEventListener('fetch', event => {
  const request = event.request;
  if (request.method !== 'GET') return;
  const url = new URL(request.url);
  if (shouldBypass(url)) return;
  const asset = url.origin === self.location.origin && /\.(js|css|html|json)$/.test(url.pathname);
  if (request.mode === 'navigate' || asset) {
    event.respondWith(networkFirst(request, event));
    return;
  }
  event.respondWith(staleWhileRevalidate(request));
});