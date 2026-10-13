const CACHE_NAME = "nyc-outreach-v2";
const APP_SHELL = ["./", "./index.html", "./styles.css", "./app.js", "./manifest.webmanifest", "./data/companies.json", "./assets/favicon.svg", "./assets/apple-touch-icon.png", "./assets/icon-192.png", "./assets/icon-512.png"];

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.addAll(APP_SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener("activate", (event) => {
  event.waitUntil(caches.keys().then((keys) => Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key)))).then(() => self.clients.claim()));
});

self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET" || new URL(event.request.url).origin !== self.location.origin) return;
  const update = fetch(event.request).then((response) => {
    if (response.ok) caches.open(CACHE_NAME).then((cache) => cache.put(event.request, response.clone()));
    return response;
  });
  event.waitUntil(update.then(() => undefined).catch(() => undefined));
  event.respondWith(caches.match(event.request).then((cached) => cached || update.catch(() => {
    if (event.request.mode === "navigate") return caches.match("./index.html");
    return Response.error();
  })));
});

