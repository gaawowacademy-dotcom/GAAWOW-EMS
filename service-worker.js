
/* ==========================================
   GAAWOW EMS PWA V3
   ONLINE-ONLY MODE
   ========================================== */

const CACHE_PREFIX = "gaawow-ems-pwa-";

/* INSTALL */
self.addEventListener("install", event => {
  self.skipWaiting();
});

/* ACTIVATE */
self.addEventListener("activate", event => {

  event.waitUntil(
    (async () => {

      // Remove old GAAWOW EMS PWA caches
      const cacheNames = await caches.keys();

      await Promise.all(
        cacheNames
          .filter(name => name.startsWith(CACHE_PREFIX))
          .map(name => caches.delete(name))
      );

      // Activate the new service worker
      await self.clients.claim();

    })()
  );

});

/*
  ONLINE-ONLY:
  No offline page cache.
  No offline navigation fallback.
  No cached API or Supabase responses.

  Browser uses normal network requests.
*/
