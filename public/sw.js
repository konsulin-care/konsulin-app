/* eslint-disable unicorn/prefer-global-this */
const SW_VERSION = '1';
const STATIC_CACHE = `konsulin-static-v${SW_VERSION}`;
const NAV_CACHE = `konsulin-nav-v${SW_VERSION}`;
const OFFLINE_URL = '/~offline';

const PRECACHE_URLS = [
  OFFLINE_URL,
  '/manifest.json',
  '/images/Loading-Time.svg'
];

self.addEventListener('install', function (event) {
  // NOSONAR - self is SW global scope
  event.waitUntil(
    caches.open(STATIC_CACHE).then(function (cache) {
      return cache.addAll(PRECACHE_URLS);
    })
  );
  self.skipWaiting(); // NOSONAR - self is SW global scope
});

self.addEventListener('activate', function (event) {
  event.waitUntil(
    caches
      .keys()
      .then(function (keys) {
        return Promise.all(
          keys
            .filter(function (key) {
              return (
                key.startsWith('konsulin-') &&
                key !== STATIC_CACHE &&
                key !== NAV_CACHE
              );
            })
            .map(function (key) {
              return caches.delete(key);
            })
        );
      })
      .then(function () {
        return self.clients.claim(); // NOSONAR - self is SW global scope
      })
  );
});

/**
 * Parse a URL string safely, returning null on invalid input.
 * Avoids try-catch so SonarCloud doesn't flag unhandled exceptions.
 */
function parseUrl(url) {
  try {
    return new URL(url);
  } catch {
    return null;
  }
}

/** Checks if a URL uses http or https protocol. */
function isValidHttpUrl(url) {
  const parsed = parseUrl(url);
  return (
    parsed !== null &&
    (parsed.protocol === 'http:' || parsed.protocol === 'https:')
  );
}

/** Checks if a URL belongs to the same origin. */
function isSameOrigin(url) {
  return url.origin === self.location.origin; // NOSONAR - self is SW global scope
}

/** Checks if a pathname is a precacheable static asset. */
function isStaticAsset(pathname) {
  return (
    pathname.startsWith('/_next/static/') ||
    pathname.startsWith('/favicon/') ||
    pathname.startsWith('/icons/') ||
    pathname.startsWith('/images/')
  );
}

/** Checks if a pathname targets the proxy API. */
function isProxyApi(pathname) {
  return pathname.startsWith('/proxy/');
}

/** Network-first strategy: tries network, falls back to cache, then to offline fallback URL. */
async function networkFirst(request, cacheName, fallbackUrl) {
  try {
    if (!isValidHttpUrl(request.url)) {
      throw new Error('Invalid URL: only http/https URLs are allowed');
    }

    // skipcq: JS-0376 - NOSONAR - URL validated by isValidHttpUrl() guard above
    const response = await fetch(request);
    if (response.ok && request.method === 'GET') {
      const navCache = await caches.open(cacheName);
      await navCache.put(request, response.clone());
    }
    return response;
  } catch {
    try {
      const fallbackCache = await caches.open(cacheName);
      const cached = await fallbackCache.match(request);
      if (cached) return cached;
      if (fallbackUrl) {
        const staticCache = await caches.open(STATIC_CACHE);
        const fallback = await staticCache.match(fallbackUrl);
        if (fallback) return fallback;
      }
    } catch {
      console.warn('[SW] cache fallback failed for', request.url);
    }
    // Graceful degradation instead of throwing
    return new Response('Service Unavailable', { status: 503 });
  }
}

self.addEventListener('fetch', function (event) {
  const url = parseUrl(event.request.url);
  if (!url) {
    return;
  }

  // Skip cross-origin requests — let the browser handle them directly.
  if (!isSameOrigin(url)) return;

  event.respondWith(
    (async function () {
      try {
        const request = event.request;

        // Non-GET requests bypass caching entirely.
        if (request.method !== 'GET') return fetch(request);

        if (isProxyApi(url.pathname)) return fetch(request);

        if (request.mode === 'navigate') {
          return await networkFirst(request, NAV_CACHE, OFFLINE_URL);
        }

        if (isStaticAsset(url.pathname)) {
          return await networkFirst(request, STATIC_CACHE);
        }

        return await networkFirst(request, NAV_CACHE);
      } catch (error) {
        console.warn('[SW] fetch handler error:', error);
        return new Response('Service Unavailable', { status: 503 });
      }
    })()
  );
});
