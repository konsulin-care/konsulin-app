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
  var h = globalThis.location.hostname;
  return h === 'localhost' || h === '127.0.0.1' || h.endsWith('.localhost');
}

// Classic-script SW cleanup: intentionally avoids top-level await and for-of
// so the file remains loadable as a non-module <script> in <head>.
/* eslint-disable promise/catch-or-return, promise/always-return,
   unicorn/prefer-top-level-await, unicorn/no-for-loop,
   security/detect-object-injection */
if ('serviceWorker' in navigator) {
  if (isLocalHost()) {
    navigator.serviceWorker.getRegistrations().then(function (registrations) {
      for (var i = 0; i < registrations.length; i++) {
        registrations[i].unregister();
      }
    });
  } else {
    navigator.serviceWorker.register('/sw.js').catch(function () {
      console.warn('[SW] registration failed');
    });
  }
}
/* eslint-enable promise/catch-or-return, promise/always-return,
   unicorn/prefer-top-level-await, unicorn/no-for-loop,
   security/detect-object-injection */
