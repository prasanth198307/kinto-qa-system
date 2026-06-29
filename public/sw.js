const CACHE_NAME = 'swacherp-restaurant-v1';
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/restaurant-steward',
];

const API_CACHE_ROUTES = [
  '/api/restaurant/menu-items',
  '/api/restaurant/menu-categories',
  '/api/restaurant/tables',
  '/api/restaurant/outlets',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(STATIC_ASSETS)).catch(() => {})
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  if (request.method !== 'GET' || url.origin !== self.location.origin) return;

  if (url.pathname.startsWith('/api/')) {
    const isMenuRoute = API_CACHE_ROUTES.some(r => url.pathname.startsWith(r));
    if (isMenuRoute) {
      event.respondWith(
        fetch(request)
          .then(response => {
            const clone = response.clone();
            caches.open(CACHE_NAME).then(cache => cache.put(request, clone));
            return response;
          })
          .catch(() => caches.match(request))
      );
    }
    return;
  }

  event.respondWith(
    caches.match(request).then(cached => {
      if (cached) return cached;
      return fetch(request).then(response => {
        if (response.ok) {
          caches.open(CACHE_NAME).then(cache => cache.put(request, response.clone()));
        }
        return response;
      }).catch(() => caches.match('/index.html'));
    })
  );
});

self.addEventListener('sync', (event) => {
  if (event.tag === 'sync-kot-queue') {
    event.waitUntil(syncKotQueue());
  }
});

async function syncKotQueue() {
  const clients = await self.clients.matchAll();
  clients.forEach(client => client.postMessage({ type: 'SYNC_REQUESTED' }));
}

self.addEventListener('message', (event) => {
  if (event.data?.type === 'SKIP_WAITING') self.skipWaiting();
  if (event.data?.type === 'CACHE_MENU') {
    caches.open(CACHE_NAME).then(cache => {
      const blob = new Blob([JSON.stringify(event.data.payload)], { type: 'application/json' });
      cache.put(new Request(event.data.url), new Response(blob));
    });
  }
});
