/* Koerwerking Planning PWA service worker.
   Cache uitsluitend de app-shell en statische bestanden.
   Firebase/API-verkeer en gebruikersgegevens worden nooit gecachet. */
const CACHE_VERSION = "koerwerking-pwa-v1";
const SHELL_CACHE = `${CACHE_VERSION}-shell`;
const ASSET_CACHE = `${CACHE_VERSION}-assets`;
const SHELL_URLS = ["/", "/index.html", "/manifest.webmanifest", "/icons/icon-192.png", "/icons/icon-512.png", "/icons/apple-touch-icon.png"];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(SHELL_CACHE)
      .then((cache) => cache.addAll(SHELL_URLS))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(
        keys.filter((key) => !key.startsWith(CACHE_VERSION)).map((key) => caches.delete(key))
      ))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("message", (event) => {
  if (event.data?.type === "SKIP_WAITING") self.skipWaiting();
});

self.addEventListener("fetch", (event) => {
  const request = event.request;
  const url = new URL(request.url);

  if (request.method !== "GET" || url.origin !== self.location.origin) return;

  // Never cache API endpoints, authentication, Firebase or dynamic data.
  if (
    url.pathname.startsWith("/api/") ||
    url.pathname.includes("/__/") ||
    url.hostname.includes("googleapis.com") ||
    url.hostname.includes("firebase")
  ) return;

  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request)
        .then((response) => {
          if (response.ok) {
            const copy = response.clone();
            caches.open(SHELL_CACHE).then((cache) => cache.put("/index.html", copy));
          }
          return response;
        })
        .catch(async () => {
          const cached = await caches.match("/index.html");
          return cached || new Response(
            "<!doctype html><html lang='nl'><meta charset='utf-8'><meta name='viewport' content='width=device-width,initial-scale=1'><meta name='theme-color' content='#17202b'><title>Koerwerking Planning</title><body style='margin:0;background:#17202b;color:#fff;font:16px system-ui;display:grid;min-height:100vh;place-items:center;text-align:center'><main style='padding:24px'><h1>Koerwerking Planning</h1><p>Je bent momenteel offline.</p><p>Maak opnieuw verbinding om je actuele planning te laden.</p></main></body></html>",
            { headers: { "Content-Type": "text/html; charset=utf-8" } }
          );
        })
    );
    return;
  }

  // Cache built Vite assets after a successful network response.
  if (url.pathname.includes("/assets/") || SHELL_URLS.includes(url.pathname)) {
    event.respondWith(
      caches.match(request).then((cached) => {
        const network = fetch(request).then((response) => {
          if (response.ok) {
            const copy = response.clone();
            caches.open(ASSET_CACHE).then((cache) => cache.put(request, copy));
          }
          return response;
        });
        return cached || network;
      })
    );
  }
});
