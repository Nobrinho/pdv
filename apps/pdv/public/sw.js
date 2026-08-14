// Service worker minimo: network-first para os arquivos do app (mesma origem),
// com fallback para cache offline. NAO intercepta a API (outra origem).
const CACHE = "pdv-shell-v1";

self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (event) => event.waitUntil(self.clients.claim()));

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return; // deixa a API passar direto

  event.respondWith(
    fetch(request)
      .then((response) => {
        const copy = response.clone();
        caches.open(CACHE).then((cache) => cache.put(request, copy));
        return response;
      })
      .catch(() =>
        caches.match(request).then((cached) => cached || caches.match("./index.html")),
      ),
  );
});
