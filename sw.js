/* PTIS · Service Worker
   Cache shell aplikasi supaya boleh dibuka luar talian.
   Data Google Sheets sentiasa diambil dari rangkaian (dengan cache sandaran di localStorage). */

const VERSION = 'ptis-v1.9.36';
const CACHE = VERSION;
const ASSET_VERSION = VERSION.replace('ptis-v', '');

const CORE = [
  './',
  './index.html',
  './manifest.webmanifest',
  './assets/css/app.css?v=' + ASSET_VERSION,
  './assets/js/config.js?v=' + ASSET_VERSION,
  './assets/js/auth.js?v=' + ASSET_VERSION,
  './assets/js/schema.js?v=' + ASSET_VERSION,
  './assets/js/store.js?v=' + ASSET_VERSION,
  './assets/js/ui.js?v=' + ASSET_VERSION,
  './assets/js/app.js?v=' + ASSET_VERSION,
  './assets/img/logo.png',
  './assets/img/favicon-64.png',
  './assets/img/icon-192.png',
  './assets/img/icon-512.png'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE).then((cache) =>
      Promise.allSettled(CORE.map((url) => cache.add(url)))
    ).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((key) => key !== CACHE).map((key) => caches.delete(key)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const request = event.request;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return; // Apps Script / CDN: biarkan rangkaian

  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((response) => {
          const copy = response.clone();
          caches.open(CACHE).then((cache) => cache.put(request, copy)).catch(() => {});
          return response;
        })
        .catch(() => caches.match(request).then((cached) =>
          cached || caches.match('./index.html')
        ))
    );
    return;
  }

  event.respondWith(
    caches.match(request).then((cached) => {
      if (cached) {
        // Stale-while-revalidate untuk aset statik.
        fetch(request).then((response) => {
          if (response && response.ok) {
            caches.open(CACHE).then((cache) => cache.put(request, response)).catch(() => {});
          }
        }).catch(() => {});
        return cached;
      }
      return fetch(request).then((response) => {
        if (response && response.ok) {
          const copy = response.clone();
          caches.open(CACHE).then((cache) => cache.put(request, copy)).catch(() => {});
        }
        return response;
      });
    })
  );
});
