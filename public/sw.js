/*
 * Wonderverse service worker — offline play and instant repeat visits.
 * Same-origin GET requests only; nothing is ever sent anywhere.
 *  - pages: network-first (new releases arrive immediately), cached copy when offline
 *  - /assets/*: content-hashed files, cache-first
 */
const VERSION = 'wv-1';
const ASSETS = `${VERSION}-assets`;
const PAGES = `${VERSION}-pages`;
const MAX_ASSETS = 120;

self.addEventListener('install', () => self.skipWaiting());

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(keys.filter((k) => !k.startsWith(VERSION)).map((k) => caches.delete(k)));
      await self.clients.claim();
    })(),
  );
});

async function trim(cache) {
  const keys = await cache.keys();
  for (let i = 0; i < keys.length - MAX_ASSETS; i++) await cache.delete(keys[i]);
}

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;

  if (req.mode === 'navigate') {
    event.respondWith(
      (async () => {
        try {
          const res = await fetch(req);
          if (res.ok) (await caches.open(PAGES)).put(req, res.clone());
          return res;
        } catch {
          return (await caches.match(req)) || (await caches.match(new URL('./', self.registration.scope).href)) || Response.error();
        }
      })(),
    );
    return;
  }

  if (url.pathname.includes('/assets/')) {
    event.respondWith(
      (async () => {
        const hit = await caches.match(req);
        if (hit) return hit;
        const res = await fetch(req);
        if (res.ok && res.type === 'basic') {
          const cache = await caches.open(ASSETS);
          await cache.put(req, res.clone());
          trim(cache);
        }
        return res;
      })(),
    );
  }
});
