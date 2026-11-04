/* ==========================================
   GAAWOW EMS PWA V2
   Safe Offline Navigation
   ========================================== */

const CACHE_NAME = "gaawow-ems-pwa-v2";

const APP_PREFIX = "/GAAWOW-EMS/";

const OFFLINE_PAGE = APP_PREFIX + "offline.html";

/* INSTALL */
self.addEventListener("install", event => {

  event.waitUntil(
    caches.open(CACHE_NAME).then(async cache => {

      try {
        await cache.add(OFFLINE_PAGE);
      } catch (error) {
        console.warn("Offline page cache failed:", error);
      }

    })
  );

  self.skipWaiting();

});

/* ACTIVATE */
self.addEventListener("activate", event => {

  event.waitUntil(

    caches.keys().then(async keys => {

      await Promise.all(
        keys
          .filter(key =>
            key.startsWith("gaawow-ems-pwa-") &&
            key !== CACHE_NAME
          )
          .map(key => caches.delete(key))
      );

      await self.clients.claim();

    })

  );

});

/* FETCH */
self.addEventListener("fetch", event => {

  const request = event.request;

  const url = new URL(request.url);

  if (
    request.method !== "GET" ||
    request.mode !== "navigate" ||
    url.origin !== self.location.origin ||
    !url.pathname.startsWith(APP_PREFIX)
  ) {
    return;
  }

  event.respondWith(

    fetch(request).catch(async () => {

      const cache = await caches.open(CACHE_NAME);

      const offline = await cache.match(OFFLINE_PAGE);

      if (offline) {
        return offline;
      }

      return new Response(
        "GAAWOW EMS is offline. Please check your internet connection.",
        {
          status: 503,
          headers: {
            "Content-Type": "text/plain; charset=utf-8"
          }
        }
      );

    })

  );

});
