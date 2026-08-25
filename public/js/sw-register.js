/**
 * Service Worker registration script.
 *
 * Loaded as a classic (non-module) script with strategy='beforeInteractive'
 * so it runs BEFORE any chunk JavaScript — critical for unregistering stale
 * SWs that may be intercepting chunk requests on localhost.
 *
 * NOTE: This file intentionally avoids ES module syntax so it can be
 * loaded via <Script strategy='beforeInteractive'>. Module scripts are
 * deferred by the HTML spec and would run AFTER chunk JS, defeating the
 * purpose of early SW cleanup.
 */

function isLocalHost() {
  const hostname = globalThis.location.hostname;
  return (
    hostname === 'localhost' ||
    hostname === '127.0.0.1' ||
    hostname.endsWith('.localhost')
  );
}

// Classic-script SW cleanup: intentionally avoids top-level await
// so the file remains loadable as a non-module <script> in <head>.
if ('serviceWorker' in navigator) {
  if (isLocalHost()) {
    navigator.serviceWorker.getRegistrations().then(function (registrations) {
      // NOSONAR — classic script; top-level await requires module
      for (const reg of registrations) {
        reg.unregister();
      }
    });
  } else {
    navigator.serviceWorker.register('/sw.js').catch(function () {
      // NOSONAR — classic script; top-level await requires module
      console.warn('[SW] registration failed');
    });
  }
}
