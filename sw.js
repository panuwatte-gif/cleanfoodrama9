const CACHE_VERSION = 'rama9-pwa-v12';
const APP_SHELL = [
  './',
  './index.html',
  './manifest.webmanifest',
  './css/app.css?v=17',
  './css/tokens.css',
  './js/app.js?v=17',
  './js/api.js',
  './js/auth.js',
  './js/components.js',
  './js/icons.js',
  './js/menu.js',
  './js/foodgrid.js',
  './js/crud.js',
  './js/state.js',
  './image-slot.js',
  './js/storage.js',
  './js/pages/attendance.js',
  './js/pages/capture.js',
  './js/pages/control.js',
  './js/pages/dashboard.js',
  './js/pages/expenses.js',
  './js/pages/reports.js',
  './js/pages/handbook.js',
  './js/pages/music.js',
  './js/pages/mytasks.js',
  './js/pages/receiving.js',
  './js/pages/recipe.js',
  './js/pages/revenue.js',
  './js/pages/simulator.js',
  './js/pages/stock.js',
  './js/pages/users.js',
  './assets/logo-kaphrao-clean.png',
  './assets/icon-192.png',
  './assets/icon-512.png',
  './assets/icon-maskable-192.png',
  './assets/icon-maskable-512.png'
];

self.addEventListener('install', event => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_VERSION).then(cache => cache.addAll(APP_SHELL)).catch(() => undefined)
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(key => key !== CACHE_VERSION).map(key => caches.delete(key))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', event => {
  const request = event.request;
  const url = new URL(request.url);

  if (request.method !== 'GET') return;
  if (url.origin !== self.location.origin) return;

  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then(response => {
          const copy = response.clone();
          caches.open(CACHE_VERSION).then(cache => cache.put('./index.html', copy));
          return response;
        })
        .catch(() => caches.match('./index.html'))
    );
    return;
  }

  event.respondWith(
    caches.match(request).then(cached => cached || fetch(request).then(response => {
      const copy = response.clone();
      caches.open(CACHE_VERSION).then(cache => cache.put(request, copy));
      return response;
    }))
  );
});
