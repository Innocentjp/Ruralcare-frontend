'use strict';

const VERSION = 'ruralcare-v4';
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
const BYPASS_HOSTS = ['supabase.co', 'supabase.in', 'huggingface.co', 'hf.co'];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(VERSION)
      .then(cache => Promise.all(SHELL.map(url => cache.add(url).catch(() => null))))
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

async function networkFirst(request) {
  const cache = await caches.open(VERSION);
  try {
    const response = await fetch(request);
    if (response && response.ok) cache.put(request, response.clone());
    return response;
  } catch (error) {
    const cached = await cache.match(request, { ignoreSearch: true });
    if (cached) return cached;
    const fallback = await cache.match('index.html');
    if (fallback) return fallback;
    throw error;
  }
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
  if (request.mode === 'navigate') {
    event.respondWith(networkFirst(request));
    return;
  }
  event.respondWith(staleWhileRevalidate(request));
});