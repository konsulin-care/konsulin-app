/**
 * Checks that a URL string uses an http or https protocol.
 * This prevents user-controlled URLs (javascript:, data:, etc.)
 * from being passed to fetch().
 */
export function isValidHttpUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    return parsed.protocol === 'http:' || parsed.protocol === 'https:';
  } catch {
    return false;
  }
}

/**
 * Cache-first strategy: returns cached response if available,
 * otherwise fetches from network, caches on success.
 */
export async function cacheFirst(
  request: Request,
  cacheName: string,
  cacheStorage: CacheStorage
): Promise<Response> {
  if (!isValidHttpUrl(request.url)) {
    throw new Error('Invalid URL: only http/https URLs are allowed');
  }

  const cache = await cacheStorage.open(cacheName);
  const cached = await cache.match(request);
  if (cached) return cached;

  // skipcq: JS-0376 - NOSONAR - URL validated by isValidHttpUrl() guard above
  const response = await fetch(request.clone());
  if (response.ok && request.method === 'GET') {
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
    if (!isValidHttpUrl(request.url)) {
      throw new Error('Invalid URL: only http/https URLs are allowed');
    }

    // skipcq: JS-0376 - NOSONAR - URL validated by isValidHttpUrl() guard above
    const response = await fetch(request.clone());
    if (response.ok && request.method === 'GET') {
      const cache = await cacheStorage.open(cacheName);
      cache.put(request, response.clone());
    }
    return response;
  } catch {
    try {
      const cache = await cacheStorage.open(cacheName);
      const cached = await cache.match(request);
      if (cached) return cached;

      if (fallbackUrl && staticCacheName) {
        const staticCache = await cacheStorage.open(staticCacheName);
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

/**
 * Network-only strategy: always fetches from network, never caches.
 */
export function networkOnly(request: Request): Promise<Response> {
  if (!isValidHttpUrl(request.url)) {
    throw new Error('Invalid URL: only http/https URLs are allowed');
  }

  // skipcq: JS-0376 - NOSONAR - URL validated by isValidHttpUrl() guard above
  return fetch(request.clone());
}
