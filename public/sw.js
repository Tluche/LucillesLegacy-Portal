const CACHE_NAME = "lucilles-legacy-v1";
const OFFLINE_URLS = ["/portal", "/lucilles-legacy-logo.png"];

self.addEventListener("install", (event) => {
  self.skipWaiting();
    event.waitUntil(
        caches.open(CACHE_NAME).then((cache) => cache.addAll(OFFLINE_URLS).catch(() => {}))
          );
          });

          self.addEventListener("activate", (event) => {
            event.waitUntil(
                caches.keys().then((keys) =>
                      Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key)))
                          )
                            );
                              self.clients.claim();
                              });

                              self.addEventListener("fetch", (event) => {
                                if (event.request.method !== "GET") return;
                                  event.respondWith(
                                      fetch(event.request)
                                            .then((response) => {
                                                    const copy = response.clone();
                                                            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, copy)).catch(() => {});
                                                                    return response;
                                                                          })
                                                                                .catch(() => caches.match(event.request))
                                                                                  );
                                                                                  });
                                                                                  
