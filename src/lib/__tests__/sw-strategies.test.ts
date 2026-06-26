import {
  cacheFirst,
  isValidHttpUrl,
  networkFirst,
  networkOnly
} from '@/lib/sw-strategies';
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

// ---------------------------------------------------------------------------
// isValidHttpUrl
// ---------------------------------------------------------------------------
describe('isValidHttpUrl', () => {
  it('returns true for https URL', () => {
    expect(isValidHttpUrl('https://konsulin.id/page')).toBe(true);
  });

  it('returns true for http URL', () => {
    expect(isValidHttpUrl('http://konsulin.id/page')).toBe(true); // eslint-disable-line unicorn/prefer-https
  });

  it('returns false for javascript: URL', () => {
    expect(isValidHttpUrl('javascript:void(0)')).toBe(false); // skipcq: JS-0087
  });

  it('returns false for data: URL', () => {
    expect(isValidHttpUrl('data:text/html,<script>alert(1)</script>')).toBe(
      false
    );
  });

  it('returns false for file: URL', () => {
    expect(isValidHttpUrl('file:///etc/passwd')).toBe(false);
  });

  it('returns false for empty string', () => {
    expect(isValidHttpUrl('')).toBe(false);
  });

  it('returns false for blob URL', () => {
    expect(isValidHttpUrl('blob:https://konsulin.id/uuid')).toBe(false);
  });

  it('returns false for about:blank', () => {
    expect(isValidHttpUrl('about:blank')).toBe(false);
  });
});

describe('cacheFirst', () => {
  it('throws on non-http URL', async () => {
    const cacheStorage = createMockCacheStorage({});
    const request = new Request('javascript:void(0)'); // skipcq: JS-0087
    await expect(cacheFirst(request, 'v1', cacheStorage)).rejects.toThrow(
      'Invalid URL'
    );
  });

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
    // skipcq: JS-W1042 - mockResolvedValue from vitest requires an argument
    cache.match.mockResolvedValue(undefined); // eslint-disable-line unicorn/no-useless-undefined
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
    // skipcq: JS-W1042 - mockResolvedValue from vitest requires an argument
    cache.match.mockResolvedValue(undefined); // eslint-disable-line unicorn/no-useless-undefined
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

  it('falls back to cached response when fetch fails', async () => {
    const cache = createMockCache();
    const cachedResponse = mockOkResponse('cached-fallback');
    // First call (initial lookup): miss → proceed to fetch
    // Second call (fallback in catch): hit → return cached
    cache.match
      .mockResolvedValueOnce(undefined) // eslint-disable-line unicorn/no-useless-undefined
      .mockResolvedValueOnce(cachedResponse);
    const cacheStorage = createMockCacheStorage({ v1: cache });

    const fetchSpy = vi
      .spyOn(globalThis, 'fetch')
      .mockRejectedValue(new Error('Network error'));

    const request = new Request('https://example.com/test.js');
    const response = await cacheFirst(request, 'v1', cacheStorage);

    expect(response).toBe(cachedResponse);
    const text = await response.text();
    expect(text).toBe('cached-fallback');
    expect(cache.put).not.toHaveBeenCalled();
    fetchSpy.mockRestore();
  });

  it('returns 503 when fetch fails and cache is empty', async () => {
    const cache = createMockCache();
    // Both calls to cache.match return undefined
    // skipcq: JS-W1042 - mockResolvedValue from vitest requires an argument
    cache.match.mockResolvedValue(undefined); // eslint-disable-line unicorn/no-useless-undefined
    const cacheStorage = createMockCacheStorage({ v1: cache });

    const fetchSpy = vi
      .spyOn(globalThis, 'fetch')
      .mockRejectedValue(new Error('Network error'));

    const request = new Request('https://example.com/test.js');
    const response = await cacheFirst(request, 'v1', cacheStorage);

    expect(response.status).toBe(503);
    const text = await response.text();
    expect(text).toBe('Service Unavailable');
    expect(cache.put).not.toHaveBeenCalled();
    fetchSpy.mockRestore();
  });
});

describe('networkFirst', () => {
  it('returns 503 on non-http URL', async () => {
    const cacheStorage = createMockCacheStorage({});
    const request = new Request('javascript:void(0)'); // skipcq: JS-0087
    const response = await networkFirst(request, 'v1', cacheStorage);
    expect(response.status).toBe(503);
    const text = await response.text();
    expect(text).toBe('Service Unavailable');
  });

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
    // skipcq: JS-W1042 - mockResolvedValue from vitest requires an argument
    navCache.match.mockResolvedValue(undefined); // eslint-disable-line unicorn/no-useless-undefined

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

  it('returns 503 on total failure with no cache and no fallback', async () => {
    const cache = createMockCache();
    // skipcq: JS-W1042 - mockResolvedValue from vitest requires an argument
    cache.match.mockResolvedValue(undefined); // eslint-disable-line unicorn/no-useless-undefined
    const cacheStorage = createMockCacheStorage({ 'nav-v1': cache });

    const fetchSpy = vi
      .spyOn(globalThis, 'fetch')
      .mockRejectedValue(new Error('Offline'));

    const request = new Request('https://example.com/page');
    const response = await networkFirst(request, 'nav-v1', cacheStorage);
    expect(response.status).toBe(503);
    const text = await response.text();
    expect(text).toBe('Service Unavailable');
    fetchSpy.mockRestore();
  });

  it('logs a warning when cache storage fails in the catch block', async () => {
    const cacheStorage = createMockCacheStorage({});
    cacheStorage.open = vi
      .fn()
      .mockRejectedValue(new Error('Storage corrupted'));

    const fetchSpy = vi
      .spyOn(globalThis, 'fetch')
      .mockRejectedValue(new Error('Offline'));

    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {
      /* noop */
    });
    const request = new Request('https://example.com/page');

    // Should throw the final fallback error, not the cache error
    const response = await networkFirst(request, 'nav-v1', cacheStorage);
    expect(response.status).toBe(503);

    expect(warnSpy).toHaveBeenCalledWith(
      '[SW] cache fallback failed for',
      expect.any(String)
    );
    warnSpy.mockRestore();
    fetchSpy.mockRestore();
  });

  it('handles cache storage failure inside catch block gracefully', async () => {
    const cacheStorage = createMockCacheStorage({});
    // Make cacheStorage.open reject to simulate storage corruption
    cacheStorage.open = vi
      .fn()
      .mockRejectedValue(new Error('Storage corrupted'));

    const fetchSpy = vi
      .spyOn(globalThis, 'fetch')
      .mockRejectedValue(new Error('Offline'));

    const request = new Request('https://example.com/page');
    // Should return 503 gracefully, not throw the cache error
    const response = await networkFirst(request, 'nav-v1', cacheStorage);
    expect(response.status).toBe(503);
    const text = await response.text();
    expect(text).toBe('Service Unavailable');
    fetchSpy.mockRestore();
  });
});

describe('networkOnly', () => {
  it('throws on non-http URL', () => {
    const request = new Request('javascript:void(0)'); // skipcq: JS-0087
    expect(() => networkOnly(request)).toThrow('Invalid URL');
  });

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
