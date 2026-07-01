/**
 * Custom Service Worker for Pictelio.
 *
 * - Does NOT precache any static assets (no globPatterns in build config).
 * - Only handles runtime caching of pixiv images via workbox strategies.
 * - On activation, clears any stale precache data left by older versions.
 * - Immediately claims all clients to avoid having to wait for navigation.
 *
 * This file is bundled by vite-plugin-pwa as the service worker entry.
 */

/// <reference lib="webworker" />

declare const self: ServiceWorkerGlobalScope;

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((cacheNames) => {
        // Remove all workbox-precache caches that may have been created
        // by older builds. We no longer use precaching, so any leftover
        // precache data is wasted space and can cause chunk-load errors
        // when the app version changes.
        const staleCaches = cacheNames.filter(
          (name) => name.startsWith("workbox-precache") || name.startsWith("workbox-precache-v2"),
        );
        return Promise.all(staleCaches.map((name) => caches.delete(name)));
      })
      .then(() => {
        // Take control of all open clients immediately so the new SW
        // handles all subsequent requests without a page reload.
        return self.clients.claim();
      }),
  );
});
