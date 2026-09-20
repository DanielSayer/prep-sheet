import type { Plugin } from "vite";

// An older project can own this origin even before our HTML reaches the browser.
// Serve a retiring worker at its original URL when Chrome checks for updates.
export const retiringWorker = `
self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (event) => {
  event.waitUntil((async () => {
    const windows = await self.clients.matchAll({ type: "window" });
    await self.registration.unregister();
    await Promise.all((await caches.keys())
      .filter((key) => key.startsWith("workbox-"))
      .map((key) => caches.delete(key)));
    await Promise.all(windows.map((client) => client.navigate(client.url)));
  })());
});
`;

export const recoverLocalCache = `
(async () => {
  if (!("serviceWorker" in navigator)) return;
  const controlled = Boolean(navigator.serviceWorker.controller);
  const registrations = await navigator.serviceWorker.getRegistrations();
  if (!registrations.length) return;
  await Promise.all(registrations.map((registration) => registration.unregister()));
  await Promise.all((await caches.keys())
    .filter((key) => key.startsWith("workbox-"))
    .map((key) => caches.delete(key)));
  if (controlled) location.reload();
})().catch((error) => console.warn("Local cache recovery failed", error));
`;

export function localCacheRecovery(): Plugin {
  return {
    name: "prep-sheet-local-cache-recovery",
    apply: "serve",
    configureServer(server) {
      server.middlewares.use((request, response, next) => {
        if (request.headers["service-worker"] === "script") {
          response.setHeader("Content-Type", "text/javascript");
          response.setHeader("Cache-Control", "no-store");
          response.end(retiringWorker);
          return;
        }
        if (request.url === "/@prep-sheet/local-cache-recovery.js") {
          response.setHeader("Content-Type", "text/javascript");
          response.setHeader("Cache-Control", "no-store");
          response.end(recoverLocalCache);
          return;
        }
        if (request.headers.accept?.includes("text/html")) {
          response.setHeader("Cache-Control", "no-store");
        }
        next();
      });
    },
  };
}
