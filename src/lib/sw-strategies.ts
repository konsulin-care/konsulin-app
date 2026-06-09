/**
 * Cache-first strategy: returns cached response if available,
 * otherwise fetches from network, caches on success.
 */
export async function cacheFirst(
  request: Request,
  cacheName: string,
  cacheStorage: CacheStorage
): Promise<Response> {
  const cache = await cacheStorage.open(cacheName);
  const cached = await cache.match(request);
  if (cached) return cached;

  const response = await fetch(request.clone());
  if (response.ok) {
    cache.put(request, response.clone());
  }
  return response;
}

/**
 * Network-first strategy: tries network first.
 * On failure, falls back to cached response if available,
 * then to optional fallbackUrl from the static cache.
 */
export async function networkFirst(
  request: Request,
  cacheName: string,
  cacheStorage: CacheStorage,
  staticCacheName?: string,
  fallbackUrl?: string
): Promise<Response> {
  try {
    const response = await fetch(request.clone());
    if (response.ok) {
      const cache = await cacheStorage.open(cacheName);
      cache.put(request, response.clone());
    }
    return response;
  } catch {
    const cache = await cacheStorage.open(cacheName);
    const cached = await cache.match(request);
    if (cached) return cached;

    if (fallbackUrl && staticCacheName) {
      const staticCache = await cacheStorage.open(staticCacheName);
      const fallback = await staticCache.match(fallbackUrl);
      if (fallback) return fallback;
    }

    throw new Error(
      'Network request failed and no cache or fallback available'
    );
  }
}

/**
 * Network-only strategy: always fetches from network, never caches.
 */
export async function networkOnly(request: Request): Promise<Response> {
  return fetch(request.clone());
}
