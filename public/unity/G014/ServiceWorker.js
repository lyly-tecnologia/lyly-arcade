const cacheName = "Lyly Interactive SAC-lyly-games-3.7.4";
const contentToCache = [
    "Build/G014.loader.js",
    "Build/G014.framework.js.br",
    "Build/G014.data.br",
    "Build/G014.wasm.br",
    "TemplateData/style.css"

];

self.addEventListener('install', function (e) {
    console.log('[Service Worker] Install');
    
    e.waitUntil((async function () {
      const cache = await caches.open(cacheName);
      console.log('[Service Worker] Caching all: app shell and content');
      await cache.addAll(contentToCache);
    })());
});

self.addEventListener('fetch', function (e) {
    e.respondWith((async function () {
      let response = await caches.match(e.request);
      console.log(`[Service Worker] Fetching resource: ${e.request.url}`);
      if (response) { return response; }

      response = await fetch(e.request);
      const cache = await caches.open(cacheName);
      console.log(`[Service Worker] Caching new resource: ${e.request.url}`);
      if (e.request.url.startsWith('http')) cache.put(e.request, response.clone());
      return response;
    })());
});
