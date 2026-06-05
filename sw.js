const CACHE = "neofind-v10";
const ASSETS = [
  "/NeoFind/",
  "/NeoFind/index.html",
  "/NeoFind/favicon.jpeg",
  "/NeoFind/icon.png",
  "/NeoFind/manifest.json"
];

self.addEventListener("install", e => {
  e.waitUntil(
    caches.open(CACHE).then(cache => cache.addAll(ASSETS)).then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", e => {
  if (e.request.method !== "GET") return;
  const url = new URL(e.request.url);
  if (url.origin !== location.origin) return;

  // index.html zawsze z sieci żeby zmiany były widoczne od razu
  if (url.pathname === "/NeoFind/" || url.pathname === "/NeoFind/index.html") {
    e.respondWith(fetch(e.request).catch(() => caches.match(e.request)));
    return;
  }

  e.respondWith(
    caches.match(e.request).then(cached => cached || fetch(e.request))
  );
});
