const SHELL_VERSION = "__ASSET_VERSION__";
const SHELL_CACHE = `tkb-shell-${SHELL_VERSION}`;

const SHELL_URLS = [
  "/",
  "/manifest.webmanifest",
  `/styles/main.css?v=${SHELL_VERSION}`,
  `/js/app.js?v=${SHELL_VERSION}`,
  `/js/utils.js?v=${SHELL_VERSION}`,
  "/icons/icon.svg",
  "/icons/icon-192.svg",
  "/icons/icon-512.svg",
];

self.addEventListener("install", (event) => {
  event.waitUntil((async () => {
    const cache = await caches.open(SHELL_CACHE);
    await Promise.all(SHELL_URLS.map((url) => cache.add(url).catch(() => {})));
    await self.skipWaiting();
  })());
});

self.addEventListener("activate", (event) => {
  event.waitUntil((async () => {
    const names = await caches.keys();
    await Promise.all(
      names
        .filter((name) => name.startsWith("tkb-") && name !== SHELL_CACHE)
        .map((name) => caches.delete(name))
    );
    if (self.registration.navigationPreload) {
      await self.registration.navigationPreload.enable();
    }
    await self.clients.claim();
  })());
});

function sameOrigin(url) {
  return url.origin === self.location.origin;
}

function isShellAsset(url) {
  return sameOrigin(url) && (
    url.pathname.startsWith("/styles/")
    || url.pathname.startsWith("/js/")
    || url.pathname.startsWith("/icons/")
    || url.pathname === "/manifest.webmanifest"
  );
}

function isFontRequest(url) {
  return url.hostname === "fonts.googleapis.com" || url.hostname === "fonts.gstatic.com";
}

async function staleWhileRevalidate(request, cacheName, preload) {
  const cache = await caches.open(cacheName);
  const cached = await cache.match(request);
  const networkPromise = Promise.resolve(preload || fetch(request))
    .then((response) => {
      if (response && response.ok) cache.put(request, response.clone());
      return response;
    })
    .catch(() => cached);

  return cached || networkPromise;
}

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;

  const url = new URL(request.url);
  if (sameOrigin(url) && (
    url.pathname === "/sw.js"
    || url.pathname === "/import"
    || url.pathname.startsWith("/api/")
  )) {
    return;
  }

  if (request.mode === "navigate" && sameOrigin(url)) {
    event.respondWith((async () => {
      const cache = await caches.open(SHELL_CACHE);
      const cached = await cache.match("/") || await cache.match(request);
      const preload = await event.preloadResponse;
      if (cached) {
        event.waitUntil((async () => {
          try {
            const response = preload || await fetch(request);
            if (response && response.ok) await cache.put("/", response.clone());
          } catch (_err) {}
        })());
        return cached;
      }
      return staleWhileRevalidate(request, SHELL_CACHE, preload);
    })());
    return;
  }

  if (isShellAsset(url) || isFontRequest(url)) {
    event.respondWith(staleWhileRevalidate(request, SHELL_CACHE));
  }
});
