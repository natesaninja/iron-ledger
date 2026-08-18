/* Iron Ledger service worker — network-first shell updates (MacroLedger model) */
const CACHE = "ironledger-v24.1";
const ASSETS = [
  "./",
  "./index.html",
  "./manifest.webmanifest",
  "./css/app.css",
  "./js/app.js",
  "./js/data.js",
  "./js/planner.js",
  "./js/store.js",
  "./js/coach.js",
  "./js/logging.js",
  "./js/equipment.js",
  "./js/programs.js",
  "./js/adapt.js",
  "./js/week.js",
  "./js/journal.js",
  "./js/invite.js",
  "./js/invite-config.js",
  "./icons/icon-192.png",
  "./icons/icon-512.png",
  "./icons/logo-mark.png",
  "./icons/logo-full.jpg",
];

self.addEventListener("install", (event) => {
  self.skipWaiting();
  event.waitUntil(caches.open(CACHE).then((cache) => cache.addAll(ASSETS)).catch(() => {}));
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("message", (event) => {
  if (event.data === "SKIP_WAITING") self.skipWaiting();
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;

  const isShell =
    req.mode === "navigate" ||
    url.pathname.endsWith(".html") ||
    url.pathname.endsWith(".js") ||
    url.pathname.endsWith(".css") ||
    url.pathname.endsWith("manifest.webmanifest") ||
    url.pathname.endsWith("/") ||
    url.pathname.includes("/iron-ledger") ||
    url.pathname.includes("/strengthledger");

  if (isShell) {
    // Network-first so version bumps aren't stuck on GitHub Pages CDN cache
    event.respondWith(
      fetch(req, { cache: "no-store" })
        .then((res) => {
          if (res && res.ok) {
            const clone = res.clone();
            caches.open(CACHE).then((c) => c.put(req, clone));
          }
          return res;
        })
        .catch(() => caches.match(req).then((c) => c || caches.match("./index.html")))
    );
    return;
  }

  event.respondWith(
    caches.match(req).then((cached) => {
      const fetched = fetch(req, { cache: "no-store" })
        .then((res) => {
          if (res && res.ok) {
            const clone = res.clone();
            caches.open(CACHE).then((c) => c.put(req, clone));
          }
          return res;
        })
        .catch(() => cached);
      return cached || fetched;
    })
  );
});
