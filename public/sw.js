/**
 * Hand-rolled, dependency-free service worker. The venue is a tent with
 * patchy wifi, so the goal is narrow: never show the browser's own "no
 * internet" page, keep already-visited pages usable while offline, and
 * never cache anything that must stay fresh (API calls, the leaderboard).
 */
const CACHE_VERSION = 'mindswap-v1';
const SHELL_CACHE = `${CACHE_VERSION}-shell`;
const RUNTIME_CACHE = `${CACHE_VERSION}-runtime`;
const OFFLINE_URL = '/offline';

const SHELL_URLS = [OFFLINE_URL, '/icon-192.png', '/icon-512.png', '/mindswap-logo.png'];

self.addEventListener('install', event => {
  event.waitUntil(
    caches
      .open(SHELL_CACHE)
      .then(cache => cache.addAll(SHELL_URLS))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches
      .keys()
      .then(keys => Promise.all(keys.filter(key => !key.startsWith(CACHE_VERSION)).map(key => caches.delete(key))))
      .then(() => self.clients.claim())
  );
});

function isApiRequest(url) {
  return url.pathname.startsWith('/api/');
}

function isStaticAsset(url) {
  return url.pathname.startsWith('/_next/static/') || url.pathname.startsWith('/_next/image');
}

self.addEventListener('fetch', event => {
  const { request } = event;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;
  if (isApiRequest(url)) return; // always network — never serve stale event data

  // Page navigations: network first (so content is current while online),
  // fall back to a cached copy of that exact page, then the offline page.
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then(response => {
          const copy = response.clone();
          caches.open(RUNTIME_CACHE).then(cache => cache.put(request, copy));
          return response;
        })
        .catch(() => caches.match(request).then(cached => cached || caches.match(OFFLINE_URL)))
    );
    return;
  }

  // Hashed build assets and icons: cache-first, they never change under
  // the same filename.
  if (isStaticAsset(url) || SHELL_URLS.includes(url.pathname)) {
    event.respondWith(
      caches.match(request).then(
        cached =>
          cached ||
          fetch(request).then(response => {
            const copy = response.clone();
            caches.open(SHELL_CACHE).then(cache => cache.put(request, copy));
            return response;
          })
      )
    );
    return;
  }

  // Everything else (fonts, misc images): stale-while-revalidate.
  event.respondWith(
    caches.match(request).then(cached => {
      const fetchPromise = fetch(request)
        .then(response => {
          const copy = response.clone();
          caches.open(RUNTIME_CACHE).then(cache => cache.put(request, copy));
          return response;
        })
        .catch(() => cached);
      return cached || fetchPromise;
    })
  );
});

self.addEventListener('push', event => {
  if (!event.data) return;
  let payload;
  try {
    payload = event.data.json();
  } catch {
    payload = { title: 'MindSwap @ FESKUM 2026', body: event.data.text() };
  }
  const { title, body, url } = payload;
  event.waitUntil(
    self.registration.showNotification(title || 'MindSwap @ FESKUM 2026', {
      body: body || '',
      icon: '/icon-192.png',
      badge: '/icon-192.png',
      data: { url: url || '/' },
    })
  );
});

self.addEventListener('notificationclick', event => {
  event.notification.close();
  const target = event.notification.data?.url || '/';
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(clientList => {
      for (const client of clientList) {
        if (client.url.includes(target) && 'focus' in client) return client.focus();
      }
      if (self.clients.openWindow) return self.clients.openWindow(target);
    })
  );
});
