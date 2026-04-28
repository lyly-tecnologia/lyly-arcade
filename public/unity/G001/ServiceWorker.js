const cacheName = "Lyly Interactive SAC-lyly-games-3.7.4-v2";
const contentToCache = [
    "Build/G001.loader.js",
    "Build/G001.framework.js.br",
    "Build/G001.data.br",
    "Build/G001.wasm.br",
    "TemplateData/style.css"
];

self.addEventListener("install", event => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(cacheName).then(cache => cache.addAll(contentToCache))
  );
});

self.addEventListener("activate", event => {
  event.waitUntil(
    Promise.all([
      caches.keys().then(keys =>
        Promise.all(
          keys.filter(k => k !== cacheName).map(k => caches.delete(k))
        )
      ),
      self.clients.claim()
    ])
  );
});

self.addEventListener("fetch", event => {
  const req = event.request;

  if (req.destination === "document") return;

  event.respondWith(
    fetch(req)
      .then(resp => {
        return caches.open(cacheName).then(cache => {
          if (req.url.startsWith('http')) cache.put(req, resp.clone());
          return resp;
        });
      })
      .catch(() => caches.match(req))
  );
});