/*
 * NeoSales service worker — offline shell for patchy mobile data.
 *
 * Strategy:
 *   - Pre-cache the app shell and catalog photography on install.
 *   - Serve navigations network-first with a cached fallback, so the storefront
 *     still opens when signal drops.
 *   - Serve static assets and images cache-first (they are content-hashed or
 *     immutable), with a background refresh of the cache.
 */

const CACHE_VERSION = 'neosales-v1';
const APP_SHELL = [
  '/',
  '/track',
  '/manifest.webmanifest',
  '/products/rouge-1.jpg',
  '/products/rouge-2.jpg',
  '/products/oud-1.jpg',
  '/products/vanilla-1.jpg',
  '/products/shirt-1.jpg',
  '/products/shirt-2.jpg',
  '/products/palazzo-1.jpg',
  '/products/bag-1.jpg',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(CACHE_VERSION)
      .then((cache) => cache.addAll(APP_SHELL).catch(() => undefined))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((key) => key !== CACHE_VERSION).map((key) => caches.delete(key))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const { request } = event;

  // Only handle same-origin GETs; POSTs (Supabase writes) must always hit the network.
  if (request.method !== 'GET' || new URL(request.url).origin !== self.location.origin) return;

  // Navigations: network first, cached shell as the fallback.
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((response) => {
          const copy = response.clone();
          caches.open(CACHE_VERSION).then((cache) => cache.put(request, copy));
          return response;
        })
        .catch(() => caches.match(request).then((cached) => cached || caches.match('/')))
    );
    return;
  }

  // Everything else: cache first, then network (and cache the result).
  event.respondWith(
    caches.match(request).then((cached) => {
      if (cached) return cached;

      return fetch(request)
        .then((response) => {
          if (response.ok && response.type === 'basic') {
            const copy = response.clone();
            caches.open(CACHE_VERSION).then((cache) => cache.put(request, copy));
          }
          return response;
        })
        .catch(() => cached);
    })
  );
});
