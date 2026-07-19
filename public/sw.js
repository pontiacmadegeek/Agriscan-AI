// AgriScan AI - Service Worker v2.0
// Production-quality PWA service worker with offline support

const CACHE_VERSION = 'v2';
const STATIC_CACHE = `agriscan-static-${CACHE_VERSION}`;
const DYNAMIC_CACHE = `agriscan-dynamic-${CACHE_VERSION}`;
const OFFLINE_URL = '/offline.html';

// Core assets to pre-cache during install
const PRECACHE_ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/offline.html',
  '/icons/icon-192.svg',
  '/icons/icon-512.svg',
];

// Install: Pre-cache critical assets
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(STATIC_CACHE)
      .then((cache) => {
        console.log('[SW] Pre-caching critical assets');
        return cache.addAll(PRECACHE_ASSETS);
      })
      .then(() => self.skipWaiting())
  );
});

// Activate: Clean up old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => {
        return Promise.all(
          keys
            .filter((key) => key !== STATIC_CACHE && key !== DYNAMIC_CACHE)
            .map((key) => {
              console.log('[SW] Removing old cache:', key);
              return caches.delete(key);
            })
        );
      })
      .then(() => {
        console.log('[SW] Activated and claiming clients');
        return self.clients.claim();
      })
  );
});

// Helper: Is this an API request?
function isApiRequest(url) {
  const path = new URL(url).pathname;
  return path.startsWith('/api/');
}

// Helper: Is this a navigation request?
function isNavigationRequest(request) {
  return request.mode === 'navigate';
}

// Helper: Is this a static asset?
function isStaticAsset(url) {
  const path = new URL(url).pathname;
  return /\.(js|css|svg|png|jpg|jpeg|webp|woff2?|ttf|eot|ico|json)$/i.test(path);
}

// Fetch strategy
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = request.url;

  // Only handle http/https
  if (!url.startsWith('http')) return;

  // Skip cross-origin requests except for fonts and CDN assets
  const requestUrl = new URL(url);
  const isAllowedExternal = requestUrl.hostname.includes('fonts.googleapis.com') ||
    requestUrl.hostname.includes('fonts.gstatic.com');

  if (requestUrl.origin !== self.location.origin && !isAllowedExternal) {
    return;
  }

  // API requests: Network-only (don't cache API responses)
  if (isApiRequest(url)) {
    event.respondWith(
      fetch(request).catch(() => {
        return new Response(
          JSON.stringify({ error: 'You are offline. Please check your connection.' }),
          {
            status: 503,
            headers: { 'Content-Type': 'application/json' }
          }
        );
      })
    );
    return;
  }

  // Navigation requests: Network-first with offline fallback
  if (isNavigationRequest(request)) {
    event.respondWith(
      fetch(request)
        .then((response) => {
          // Cache the latest version of the page
          const responseClone = response.clone();
          caches.open(DYNAMIC_CACHE).then((cache) => {
            cache.put(request, responseClone);
          });
          return response;
        })
        .catch(() => {
          return caches.match(request)
            .then((cachedResponse) => {
              return cachedResponse || caches.match(OFFLINE_URL);
            });
        })
    );
    return;
  }

  // Static assets: Stale-while-revalidate
  if (isStaticAsset(url)) {
    event.respondWith(
      caches.match(request).then((cachedResponse) => {
        const fetchPromise = fetch(request)
          .then((networkResponse) => {
            if (networkResponse && networkResponse.status === 200) {
              const responseClone = networkResponse.clone();
              caches.open(STATIC_CACHE).then((cache) => {
                cache.put(request, responseClone);
              });
            }
            return networkResponse;
          })
          .catch(() => cachedResponse);

        return cachedResponse || fetchPromise;
      })
    );
    return;
  }

  // Everything else: Network-first with cache fallback
  event.respondWith(
    fetch(request)
      .then((response) => {
        if (response && response.status === 200 && request.method === 'GET') {
          const responseClone = response.clone();
          caches.open(DYNAMIC_CACHE).then((cache) => {
            cache.put(request, responseClone);
          });
        }
        return response;
      })
      .catch(() => caches.match(request))
  );
});

// Listen for messages from the app
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});
