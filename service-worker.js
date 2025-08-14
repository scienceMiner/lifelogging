const CACHE_NAME = "diary-cache-v4";
const ASSETS = [
  "./",
  "./index.html",
  "./styles.css",
  "./script.js",
  "./manifest.json"
];

self.addEventListener("install", event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(ASSETS))
  );
  self.skipWaiting();
});

self.addEventListener("activate", event => {
  event.waitUntil(
    caches.keys().then(keys => Promise.all(keys.map(k => k !== CACHE_NAME ? caches.delete(k) : Promise.resolve())))
  );
  self.clients.claim();
});

self.addEventListener("fetch", event => {
  const url = new URL(event.request.url);
  if (url.origin === location.origin) {
    event.respondWith(
      caches.match(event.request).then(resp => resp || fetch(event.request).then(networkResp => {
        if (event.request.method === "GET") {
          const copy = networkResp.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(event.request, copy)).catch(()=>{});
        }
        return networkResp;
      }).catch(() => caches.match("./index.html")))
    );
  }
});
