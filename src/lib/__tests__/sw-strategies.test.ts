import { cacheFirst, networkFirst, networkOnly } from '@/lib/sw-strategies';
import { afterEach, describe, expect, it, vi } from 'vitest';

function createMockCache(): {
  match: ReturnType<typeof vi.fn>;
  put: ReturnType<typeof vi.fn>;
} {
  return {
    match: vi.fn(),
    put: vi.fn()
  };
}

function createMockCacheStorage(
  caches: Record<
    string,
    {
      match: ReturnType<typeof vi.fn>;
      put: ReturnType<typeof vi.fn>;
    }
  >
): CacheStorage {
  return {
    open: vi
      .fn()
      .mockImplementation((name: string) =>
        Promise.resolve(
          (caches[name] ?? caches[Object.keys(caches)[0]]) as unknown as Cache
        )
      ),
    match: vi.fn(),
    has: vi.fn(),
    delete: vi.fn(),
    keys: vi.fn()
  };
}

function mockOkResponse(body = 'ok'): Response {
  return new Response(body, { status: 200, statusText: 'OK' });
}

function mockFailResponse(): Response {
  return new Response('fail', {
    status: 500,
    statusText: 'Internal Server Error'
  });
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe('cacheFirst', () => {
  it('returns cached response when cache has match', async () => {
    const cache = createMockCache();
    const cachedResponse = mockOkResponse('cached');
    cache.match.mockResolvedValue(cachedResponse);
    const cacheStorage = createMockCacheStorage({ v1: cache });

    const request = new Request('https://example.com/test.js');
    const response = await cacheFirst(request, 'v1', cacheStorage);

    expect(response).toBe(cachedResponse);
    expect(cache.put).not.toHaveBeenCalled();
  });

  it('fetches and caches on cache miss', async () => {
    const cache = createMockCache();
    cache.match.mockResolvedValue(undefined);
    const cacheStorage = createMockCacheStorage({ v1: cache });

    const fetchSpy = vi
      .spyOn(globalThis, 'fetch')
      .mockResolvedValue(mockOkResponse('network'));

    const request = new Request('https://example.com/test.js');
    const response = await cacheFirst(request, 'v1', cacheStorage);

    expect(response.ok).toBe(true);
    const text = await response.text();
    expect(text).toBe('network');
    expect(cache.put).toHaveBeenCalledWith(request, expect.any(Response));
    fetchSpy.mockRestore();
  });

  it('does not cache response when fetch fails (non-ok)', async () => {
    const cache = createMockCache();
    cache.match.mockResolvedValue(undefined);
    const cacheStorage = createMockCacheStorage({ v1: cache });

    const fetchSpy = vi
      .spyOn(globalThis, 'fetch')
      .mockResolvedValue(mockFailResponse());

    const request = new Request('https://example.com/test.js');
    const response = await cacheFirst(request, 'v1', cacheStorage);

    expect(response.ok).toBe(false);
    expect(cache.put).not.toHaveBeenCalled();
    fetchSpy.mockRestore();
  });

  it('throws when fetch fails', async () => {
    const cache = createMockCache();
    cache.match.mockResolvedValue(undefined);
    const cacheStorage = createMockCacheStorage({ v1: cache });

    const fetchSpy = vi
      .spyOn(globalThis, 'fetch')
      .mockRejectedValue(new Error('Network error'));

    const request = new Request('https://example.com/test.js');
    await expect(cacheFirst(request, 'v1', cacheStorage)).rejects.toThrow(
      'Network error'
    );
    expect(cache.put).not.toHaveBeenCalled();
    fetchSpy.mockRestore();
  });
});

describe('networkFirst', () => {
  it('returns network response and caches it on success', async () => {
    const cache = createMockCache();
    const cacheStorage = createMockCacheStorage({ 'nav-v1': cache });
    const fetchSpy = vi
      .spyOn(globalThis, 'fetch')
      .mockResolvedValue(mockOkResponse('from network'));

    const request = new Request('https://example.com/page');
    const response = await networkFirst(request, 'nav-v1', cacheStorage);

    expect(response.ok).toBe(true);
    const text = await response.text();
    expect(text).toBe('from network');
    expect(cache.put).toHaveBeenCalledWith(request, expect.any(Response));
    fetchSpy.mockRestore();
  });

  it('falls back to cached response on network failure', async () => {
    const cache = createMockCache();
    const cachedResponse = mockOkResponse('cached page');
    cache.match.mockResolvedValue(cachedResponse);
    const cacheStorage = createMockCacheStorage({ 'nav-v1': cache });

    const fetchSpy = vi
      .spyOn(globalThis, 'fetch')
      .mockRejectedValue(new Error('Offline'));

    const request = new Request('https://example.com/page');
    const response = await networkFirst(request, 'nav-v1', cacheStorage);

    expect(response).toBe(cachedResponse);
    fetchSpy.mockRestore();
  });

  it('falls back to offline page when no cache and fallbackUrl provided', async () => {
    const navCache = createMockCache();
    navCache.match.mockResolvedValue(undefined);

    const staticCache = createMockCache();
    const fallbackResponse = mockOkResponse('offline page');
    staticCache.match.mockResolvedValue(fallbackResponse);

    const cacheStorage = createMockCacheStorage({
      'nav-v1': navCache,
      'static-v1': staticCache
    });

    const fetchSpy = vi
      .spyOn(globalThis, 'fetch')
      .mockRejectedValue(new Error('Offline'));

    const request = new Request('https://example.com/new-page');
    const response = await networkFirst(
      request,
      'nav-v1',
      cacheStorage,
      'static-v1',
      '/~offline'
    );

    expect(response).toBe(fallbackResponse);
    fetchSpy.mockRestore();
  });

  it('throws on total failure with no cache and no fallback', async () => {
    const cache = createMockCache();
    cache.match.mockResolvedValue(undefined);
    const cacheStorage = createMockCacheStorage({ 'nav-v1': cache });

    const fetchSpy = vi
      .spyOn(globalThis, 'fetch')
      .mockRejectedValue(new Error('Offline'));

    const request = new Request('https://example.com/page');
    await expect(networkFirst(request, 'nav-v1', cacheStorage)).rejects.toThrow(
      'Network request failed'
    );
    fetchSpy.mockRestore();
  });
});

describe('networkOnly', () => {
  it('returns network response', async () => {
    const fetchSpy = vi
      .spyOn(globalThis, 'fetch')
      .mockResolvedValue(mockOkResponse('live data'));

    const request = new Request('https://example.com/api/data');
    const response = await networkOnly(request);

    expect(response.ok).toBe(true);
    const text = await response.text();
    expect(text).toBe('live data');
    fetchSpy.mockRestore();
  });

  it('throws on network failure', async () => {
    const fetchSpy = vi
      .spyOn(globalThis, 'fetch')
      .mockRejectedValue(new Error('Offline'));

    const request = new Request('https://example.com/api/data');
    await expect(networkOnly(request)).rejects.toThrow('Offline');
    fetchSpy.mockRestore();
  });
});
