/* eslint-disable unicorn/prefer-global-this */
const SW_VERSION = '1'
const STATIC_CACHE = `konsulin-static-v${SW_VERSION}`
const NAV_CACHE = `konsulin-nav-v${SW_VERSION}`
const OFFLINE_URL = '/~offline'

const PRECACHE_URLS = [
  OFFLINE_URL,
  '/manifest.json',
  '/images/Loading-Time.svg'
]

self.addEventListener('install', function (event) {
  // NOSONAR - self is SW global scope
  event.waitUntil(
    caches.open(STATIC_CACHE).then(function (cache) {
      return cache.addAll(PRECACHE_URLS)
    })
  )
  self.skipWaiting() // NOSONAR - self is SW global scope
})

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
              )
            })
            .map(function (key) {
              return caches.delete(key)
            })
        )
      })
      .then(function () {
        return self.clients.claim() // NOSONAR - self is SW global scope
      })
  )
})

/**
 * Parse a URL string safely, returning null on invalid input.
 * Avoids try-catch so SonarCloud doesn't flag unhandled exceptions.
 */
function parseUrl (url) {
  try {
    return new URL(url)
  } catch {
    return null
  }
}

/** Checks if a URL uses http or https protocol. */
function isValidHttpUrl (url) {
  const parsed = parseUrl(url)
  return (
    parsed !== null &&
    (parsed.protocol === 'http:' || parsed.protocol === 'https:')
  )
}

/** Checks if a URL belongs to the same origin. */
function isSameOrigin (url) {
  return url.origin === self.location.origin // NOSONAR - self is SW global scope
}

/** Checks if a pathname is a precacheable static asset. */
function isStaticAsset (pathname) {
  return (
    pathname.startsWith('/_next/static/') ||
    pathname.startsWith('/favicon/') ||
    pathname.startsWith('/icons/') ||
    pathname.startsWith('/images/')
  )
}

/** Checks if a pathname targets the proxy API. */
function isProxyApi (pathname) {
  return pathname.startsWith('/proxy/')
}

/** Network-first strategy: tries network, falls back to cache, then to offline fallback URL. */
async function networkFirst (request, cacheName, fallbackUrl) {
  try {
    if (!isValidHttpUrl(request.url)) {
      throw new Error('Invalid URL: only http/https URLs are allowed')
    }

    const response = await fetch(request)
    if (response.ok && request.method === 'GET') {
      const navCache = await caches.open(cacheName)
      navCache.put(request, response.clone())
    }
    return response
  } catch {
    try {
      const fallbackCache = await caches.open(cacheName)
      const cached = await fallbackCache.match(request)
      if (cached) return cached
      if (fallbackUrl) {
        const staticCache = await caches.open(STATIC_CACHE)
        const fallback = await staticCache.match(fallbackUrl)
        if (fallback) return fallback
      }
    } catch {
      console.warn('[SW] cache fallback failed for', request.url)
    }
    // Graceful degradation instead of throwing
    return new Response('Service Unavailable', { status: 503 })
  }
}

self.addEventListener('fetch', function (event) {
  const request = event.request
  const url = new URL(request.url)

  if (!isSameOrigin(url)) return

  // Non-GET requests (POST, DELETE, etc.) bypass caching entirely.
  // The Cache API only supports GET, so caching would throw.
  if (request.method !== 'GET') {
    event.respondWith(fetch(request))
    return
  }

  if (isProxyApi(url.pathname)) {
    event.respondWith(fetch(request))
    return
  }

  if (request.mode === 'navigate') {
    event.respondWith(networkFirst(request, NAV_CACHE, OFFLINE_URL))
    return
  }

  if (isStaticAsset(url.pathname)) {
    event.respondWith(networkFirst(request, STATIC_CACHE))
    return
  }

  event.respondWith(networkFirst(request, NAV_CACHE))
})
