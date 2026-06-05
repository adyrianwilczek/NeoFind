self.addEventListener("install", e => {
  e.waitUntil(
    caches.open("neofind-cache").then(cache => {
      return cache.addAll([
        "/",
        "/index.html"
      ]).catch(err => {
        console.log("Cache error:", err);
      });
    })
  );
});
