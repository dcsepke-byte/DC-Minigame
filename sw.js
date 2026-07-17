const CACHE_VERSION = 'party-arena-v1';
const RUNTIME_CACHE = 'party-arena-runtime-v1';

const APP_SHELL = [
  '/',
  '/host',
  '/index.html',
  '/host.html',
  '/player.html',
  '/css/styles.css',
  '/js/pwa.js',
  '/js/effects.js',
  '/js/games.js',
  '/js/net.js',
  '/js/main.js',
  '/js/host.js',
  '/js/player.js',
  '/js/quiz-duel-questions.js',
  '/manifest.webmanifest',
  '/assets/icon.svg',
  '/assets/icon-maskable.svg'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_VERSION).then((cache) => cache.addAll(APP_SHELL)).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((key) => key !== CACHE_VERSION && key !== RUNTIME_CACHE)
          .map((key) => caches.delete(key))
      )
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;

  const isDocument = req.mode === 'navigate' || (req.headers.get('accept') || '').includes('text/html');
  if (isDocument) {
    event.respondWith(networkFirst(req));
    return;
  }

  event.respondWith(cacheFirst(req));
});

async function networkFirst(request) {
  const runtime = await caches.open(RUNTIME_CACHE);
  try {
    const fresh = await fetch(request);
    runtime.put(request, fresh.clone());
    return fresh;
  } catch (_) {
    const cached = await runtime.match(request);
    if (cached) return cached;
    const fallbackRoot = await caches.match('/');
    if (fallbackRoot) return fallbackRoot;
    return caches.match('/index.html');
  }
}

async function cacheFirst(request) {
  const cached = await caches.match(request);
  if (cached) return cached;

  const runtime = await caches.open(RUNTIME_CACHE);
  try {
    const fresh = await fetch(request);
    runtime.put(request, fresh.clone());
    return fresh;
  } catch (_) {
    return cached || new Response('', { status: 503, statusText: 'Offline' });
  }
}
