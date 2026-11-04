const CACHE_NAME = "gaawow-ems-pwa-v1";

const APP_PREFIX = "/GAAWOW-EMS/";

const OFFLINE_PAGE =
  APP_PREFIX + "offline.html";

self.addEventListener("install", event => {

  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      return cache.add(OFFLINE_PAGE);
    })
  );

  self.skipWaiting();

});

self.addEventListener("activate", event => {

  event.waitUntil(
    caches.keys().then(keys => {

      return Promise.all(
        keys
          .filter(key =>
            key.startsWith("gaawow-ems-pwa-") &&
            key !== CACHE_NAME
          )
          .map(key => caches.delete(key))
      );

    })
  );

  self.clients.claim();

});

self.addEventListener("fetch", event => {

  const request = event.request;
  const url = new URL(request.url);

  // Only handle page navigation inside GAAWOW EMS.
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

      return await cache.match(OFFLINE_PAGE);

    })

  );

});
