const CACHE_VERSION = 'swacherp-v5';
const API_CACHE_NAME = 'swacherp-api-v5';

const STATIC_PRECACHE = ['/'];

const API_CACHE_ROUTES = [
  '/api/restaurant/menu-items',
  '/api/restaurant/menu-categories',
  '/api/restaurant/tables',
  '/api/restaurant/outlets',
];

// Assets that must NEVER be served from cache with wrong MIME type
function isAsset(pathname) {
  return /\.(js|css|woff2?|png|jpg|svg|ico|webmanifest)$/.test(pathname);
}

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_VERSION)
      .then(cache => cache.addAll(STATIC_PRECACHE))
      .catch(() => {})
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys
          .filter(k => k !== CACHE_VERSION && k !== API_CACHE_NAME)
          .map(k => caches.delete(k))
      )
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  if (request.method !== 'GET') return;
  if (url.origin !== self.location.origin) return;

  // Versioned JS/CSS assets — network first, never serve stale
  if (isAsset(url.pathname)) {
    event.respondWith(
      fetch(request).then(response => {
        if (response.ok && response.status === 200) {
          const clone = response.clone();
          caches.open(CACHE_VERSION).then(cache => cache.put(request, clone));
        }
        return response;
      }).catch(() => caches.match(request))
    );
    return;
  }

  // API routes — network first, cache selected menu routes for offline
  if (url.pathname.startsWith('/api/')) {
    const shouldCache = API_CACHE_ROUTES.some(r => url.pathname.startsWith(r));
    if (shouldCache) {
      event.respondWith(
        fetch(request).then(response => {
          if (response.ok) {
            const clone = response.clone();
            caches.open(API_CACHE_NAME).then(cache => cache.put(request, clone));
          }
          return response;
        }).catch(() => caches.match(request, { cacheName: API_CACHE_NAME }))
      );
    }
    return;
  }

  // HTML navigation — network first, fall back to cached index.html for SPA routing
  event.respondWith(
    fetch(request).then(response => {
      if (response.ok) {
        const clone = response.clone();
        caches.open(CACHE_VERSION).then(cache => cache.put(request, clone));
      }
      return response;
    }).catch(() =>
      caches.match(request).then(cached => cached || caches.match('/'))
    )
  );
});

self.addEventListener('sync', (event) => {
  if (event.tag === 'sync-kot-queue') {
    event.waitUntil(
      self.clients.matchAll().then(clients =>
        clients.forEach(c => c.postMessage({ type: 'SYNC_REQUESTED' }))
      )
    );
  }
});

self.addEventListener('message', (event) => {
  if (event.data?.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
  if (event.data?.type === 'CACHE_MENU') {
    const blob = new Blob([JSON.stringify(event.data.payload)], { type: 'application/json' });
    caches.open(API_CACHE_NAME).then(cache =>
      cache.put(new Request(event.data.url), new Response(blob))
    );
  }
  if (event.data?.type === 'CLEAR_CACHE') {
    caches.keys().then(keys => Promise.all(keys.map(k => caches.delete(k))));
  }
});
