const SW_VERSION = '1'
const STATIC_CACHE = `konsulin-static-v${SW_VERSION}`
const NAV_CACHE = `konsulin-nav-v${SW_VERSION}`
const OFFLINE_URL = '/~offline'

const PRECACHE_URLS = [OFFLINE_URL, '/manifest.json', '/images/Loading-Time.svg']

self.addEventListener('install', function (event) { // NOSONAR - self is SW global scope
  event.waitUntil(
    caches.open(STATIC_CACHE).then(function (cache) {
      return cache.addAll(PRECACHE_URLS)
    })
  )
  self.skipWaiting()
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
        return self.clients.claim()
      })
  )
})

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

/** Cache-first strategy: serves from cache when available, otherwise fetches and caches. */
async function cacheFirst (request, cacheName) {
  if (!request.url.startsWith('http')) {
    return fetch(request)
  }

  const cache = await caches.open(cacheName)
  const cached = await cache.match(request)
  if (cached) return cached

  const response = await fetch(request)
  if (response.ok) {
    cache.put(request, response.clone())
  }
  return response
}

/** Network-first strategy: tries network, falls back to cache, then to offline fallback URL. */
async function networkFirst (request, cacheName, fallbackUrl) {
  if (!request.url.startsWith('http')) {
    return fetch(request)
  }

  try {
    const response = await fetch(request)
    if (response.ok) {
      const navCache = await caches.open(cacheName)
      navCache.put(request, response.clone())
    }
    return response
  } catch {
    const fallbackCache = await caches.open(cacheName)
    const cached = await fallbackCache.match(request)
    if (cached) return cached
    if (fallbackUrl) {
      const staticCache = await caches.open(STATIC_CACHE)
      return staticCache.match(fallbackUrl)
    }
    throw new Error('Network request failed and no cache/fallback available')
  }
}

self.addEventListener('fetch', function (event) {
  const request = event.request
  const url = new URL(request.url)

  if (!isSameOrigin(url)) return

  if (isProxyApi(url.pathname)) {
    event.respondWith(fetch(request))
    return
  }

  if (request.mode === 'navigate') {
    event.respondWith(networkFirst(request, NAV_CACHE, OFFLINE_URL))
    return
  }

  if (isStaticAsset(url.pathname)) {
    event.respondWith(cacheFirst(request, STATIC_CACHE))
    return
  }

  event.respondWith(networkFirst(request, NAV_CACHE))
})
