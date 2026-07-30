const CACHE = "lazarito-2026-v2";
const ASSETS = ["./", "./index.html", "./styles.css", "./adjustments.css", "./app.js", "./manifest.webmanifest", "./imagen-principal-lazarito.png", "./lazarito-principal.jpeg"];
self.addEventListener("install", event => event.waitUntil(caches.open(CACHE).then(cache => cache.addAll(ASSETS))));
self.addEventListener("activate", event => event.waitUntil(self.clients.claim()));
self.addEventListener("fetch", event => {
  if (event.request.method !== "GET") return;
  event.respondWith(caches.match(event.request).then(saved => saved || fetch(event.request)));
});
