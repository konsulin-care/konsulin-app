import { cacheFirst, isValidHttpUrl, networkFirst } from '@/lib/sw-strategies';
import { afterEach, describe, expect, it, vi } from 'vitest';

function createMockCache(matchVal?: Response): {
  match: ReturnType<typeof vi.fn>;
  put: ReturnType<typeof vi.fn>;
} {
  return {
    match: vi.fn().mockResolvedValue(matchVal ?? undefined),
    put: vi.fn().mockResolvedValue(undefined)
  };
}

function createMockCacheStorage(
  cachesMap: Record<
    string,
    { match: ReturnType<typeof vi.fn>; put: ReturnType<typeof vi.fn> }
  >
): CacheStorage {
  return {
    open: vi
      .fn()
      .mockImplementation((name: string) =>
        Promise.resolve(
          (cachesMap[name] ??
            cachesMap[Object.keys(cachesMap)[0]]) as unknown as Cache
        )
      ),
    match: vi.fn(),
    has: vi.fn(),
    delete: vi.fn(),
    keys: vi.fn()
  };
}

afterEach(() => {
  vi.restoreAllMocks();
});

// ---------------------------------------------------------------------------
// Non-GET request handling
// ---------------------------------------------------------------------------
describe('non-GET request handling', () => {
  it('networkFirst does not cache POST request responses', async () => {
    const cache = createMockCache();
    const cacheStorage = createMockCacheStorage({ nav: cache });
    const fetchSpy = vi
      .spyOn(globalThis, 'fetch')
      .mockResolvedValue(new Response('ok', { status: 200 }));

    const request = new Request('https://example.com/auth/cookie', {
      method: 'POST',
      body: JSON.stringify({})
    });
    const response = await networkFirst(request, 'nav', cacheStorage);

    expect(response.ok).toBe(true);
    expect(cache.put).not.toHaveBeenCalled();
    fetchSpy.mockRestore();
  });

  it('networkFirst still caches GET request responses', async () => {
    const cache = createMockCache();
    const cacheStorage = createMockCacheStorage({ nav: cache });
    const fetchSpy = vi
      .spyOn(globalThis, 'fetch')
      .mockResolvedValue(new Response('ok', { status: 200 }));

    const request = new Request('https://example.com/page');
    const response = await networkFirst(request, 'nav', cacheStorage);

    expect(response.ok).toBe(true);
    expect(cache.put).toHaveBeenCalledWith(request, expect.any(Response));
    fetchSpy.mockRestore();
  });

  it('networkFirst does not cache DELETE requests', async () => {
    const cache = createMockCache();
    const cacheStorage = createMockCacheStorage({ nav: cache });
    const fetchSpy = vi
      .spyOn(globalThis, 'fetch')
      .mockResolvedValue(new Response('ok', { status: 200 }));

    const request = new Request('https://example.com/auth/cookie', {
      method: 'DELETE'
    });
    const response = await networkFirst(request, 'nav', cacheStorage);

    expect(response.ok).toBe(true);
    expect(cache.put).not.toHaveBeenCalled();
    fetchSpy.mockRestore();
  });

  it('networkFirst still falls back to cache on network failure for POST', async () => {
    const cachedResponse = new Response('cached', { status: 200 });
    const cache = createMockCache(cachedResponse);
    const cacheStorage = createMockCacheStorage({ nav: cache });

    const fetchSpy = vi
      .spyOn(globalThis, 'fetch')
      .mockRejectedValue(new Error('Offline'));

    const request = new Request('https://example.com/auth/cookie', {
      method: 'POST'
    });
    const response = await networkFirst(request, 'nav', cacheStorage);

    // Should fall back to cached response (GET-cached version) on network failure
    expect(response).toBe(cachedResponse);
    fetchSpy.mockRestore();
  });

  it('cacheFirst does not cache non-GET responses', async () => {
    const cache = createMockCache();
    const cacheStorage = createMockCacheStorage({ static: cache });
    const fetchSpy = vi
      .spyOn(globalThis, 'fetch')
      .mockResolvedValue(new Response('ok', { status: 200 }));

    const request = new Request('https://example.com/api/data', {
      method: 'PUT'
    });
    const response = await cacheFirst(request, 'static', cacheStorage);

    expect(response.ok).toBe(true);
    expect(cache.put).not.toHaveBeenCalled();
    fetchSpy.mockRestore();
  });

  it('networkFirst returns the network response even when cache.put would fail', async () => {
    const cache = createMockCache();
    // Simulate Cache API throwing for non-GET requests
    cache.put.mockRejectedValue(new Error('Cache API only supports GET'));
    const cacheStorage = createMockCacheStorage({ nav: cache });

    const fetchSpy = vi
      .spyOn(globalThis, 'fetch')
      .mockResolvedValue(new Response('auth ok', { status: 200 }));

    const request = new Request('https://example.com/auth/cookie', {
      method: 'POST',
      body: '{}'
    });
    const response = await networkFirst(request, 'nav', cacheStorage);

    expect(response.ok).toBe(true);
    const text = await response.text();
    expect(text).toBe('auth ok');
    fetchSpy.mockRestore();
  });
});
