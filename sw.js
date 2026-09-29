/* Versioned offline shell. Navigation falls back to the root-aware SPA. */
const CACHE = "mtm-v9";

const APP_SHELL = [
  "/",
  "/index.html",
  "/css/style.css",
  "/js/app.js",
  "/js/data/neck.js",
  "/js/data/shoulder.js",
  "/js/data/elbow-hand.js",
  "/js/data/back.js",
  "/js/data/hip.js",
  "/js/data/knee.js",
  "/js/data/foot.js",
  "/js/data/extra.js",
  "/js/data/en/neck.js",
  "/js/data/en/shoulder.js",
  "/js/data/en/elbow-hand.js",
  "/js/data/en/back.js",
  "/js/data/en/hip.js",
  "/js/data/en/knee.js",
  "/js/data/en/foot.js",
  "/js/data/en/extra.js",
  "/manifest.webmanifest",
  "/assets/icon-192.png",
  "/assets/icon-512.png",
  "/assets/maskable-512.png",
  "/assets/og-image.png",
  "/assets/illustrations/hero-pain-guide.webp",
  "/assets/illustrations/neck.webp",
  "/assets/illustrations/shoulder.webp",
  "/assets/illustrations/elbow-hand.webp",
  "/assets/illustrations/back.webp",
  "/assets/illustrations/hip.webp",
  "/assets/illustrations/knee.webp",
  "/assets/illustrations/foot.webp",
];

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(CACHE).then((cache) => cache.addAll(APP_SHELL)).then(() => self.skipWaiting()));
});
self.addEventListener("activate", (event) => {
  event.waitUntil(caches.keys().then((keys) => Promise.all(
    keys.filter((key) => key.startsWith("mtm-") && key !== CACHE).map((key) => caches.delete(key))
  )).then(() => self.clients.claim()));
});
self.addEventListener("fetch", (event) => {
  const request = event.request;
  if (request.method !== "GET") return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;
  // Keep all background writes alive, even when a cached response is returned.
  const fresh = fetch(request).then(async (response) => {
    if (response.status === 200) {
      const cache = await caches.open(CACHE);
      await cache.put(request, response.clone()).catch(() => {});
    }
    return response;
  });
  event.waitUntil(fresh.catch(() => {}));
  event.respondWith((async () => {
    const cache = await caches.open(CACHE);
    if (request.mode === "navigate") {
      try { return await fresh; }
      catch {
        return (await cache.match(request)) || (await cache.match("/index.html")) || Response.error();
      }
    }
    return (await cache.match(request)) || fresh;
  })());
});
