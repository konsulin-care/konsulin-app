import { existsSync, readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  afterEach,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  vi
} from 'vitest';

import {
  awaitEvent,
  createMockCache,
  createMockCaches,
  createMockFetch,
  createMockSelf,
  fireActivate,
  fireFetch,
  fireInstall,
  type MockCaches,
  type MockSelf
} from '@/__tests__/test-utils';

const __dirname = dirname(fileURLToPath(import.meta.url));
const SW_PATH = resolve(__dirname, '../../../public/sw.js');
const SW_REGISTER_PATH = resolve(__dirname, '../../../public/js/sw-register.js');
let SW_CODE: string;

// ---------------------------------------------------------------------------
// SW evaluation
// ---------------------------------------------------------------------------

let mockSelf: MockSelf;
let mockCaches: MockCaches;
let mockFetch: ReturnType<typeof vi.fn>;

function evaluateSW() {
  const fn = new Function(
    'self',
    'caches',
    'fetch',
    'Request',
    'Response',
    SW_CODE
  );
  fn(mockSelf, mockCaches, mockFetch, Request, Response);
}

beforeAll(() => {
  SW_CODE = readFileSync(SW_PATH, 'utf-8');
});

beforeEach(() => {
  mockSelf = createMockSelf();
  mockCaches = createMockCaches();
  mockFetch = createMockFetch();
  evaluateSW();
});

afterEach(() => {
  vi.restoreAllMocks();
});

// ---------------------------------------------------------------------------
// Install event
// ---------------------------------------------------------------------------
describe('install event', () => {
  it('pre-caches PRECACHE_URLS into STATIC_CACHE', async () => {
    const event = fireInstall(mockSelf);
    await awaitEvent(event);

    expect(mockCaches.open).toHaveBeenCalledWith('konsulin-static-v1');
    expect(mockCaches.stores['konsulin-static-v1'].addAll).toHaveBeenCalledWith(
      ['/~offline', '/manifest.json', '/images/Loading-Time.svg']
    );
  });

  it('calls self.skipWaiting()', () => {
    fireInstall(mockSelf);
    expect(mockSelf.skipWaiting).toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// Activate event
// ---------------------------------------------------------------------------
describe('activate event', () => {
  it('deletes old konsulin caches', async () => {
    mockCaches.stores['konsulin-old-v1'] = createMockCache();
    mockCaches.stores['konsulin-v0'] = createMockCache();

    const event = fireActivate(mockSelf);
    await awaitEvent(event);

    expect(mockCaches.delete).toHaveBeenCalledWith('konsulin-old-v1');
    expect(mockCaches.delete).toHaveBeenCalledWith('konsulin-v0');
  });

  it('preserves current version caches', async () => {
    mockCaches.stores['konsulin-old-v1'] = createMockCache();
    mockCaches.stores['konsulin-static-v1'] = createMockCache();
    mockCaches.stores['konsulin-nav-v1'] = createMockCache();

    const event = fireActivate(mockSelf);
    await awaitEvent(event);

    expect(mockCaches.delete).not.toHaveBeenCalledWith('konsulin-static-v1');
    expect(mockCaches.delete).not.toHaveBeenCalledWith('konsulin-nav-v1');
    expect(mockCaches.delete).toHaveBeenCalledTimes(1); // only old cache
  });

  it('leaves non-konsulin caches untouched', async () => {
    mockCaches.stores['other-cache'] = createMockCache();
    mockCaches.stores['workbox-precache'] = createMockCache();

    const event = fireActivate(mockSelf);
    await awaitEvent(event);

    expect(mockCaches.delete).not.toHaveBeenCalledWith('other-cache');
    expect(mockCaches.delete).not.toHaveBeenCalledWith('workbox-precache');
  });

  it('calls clients.claim()', async () => {
    const event = fireActivate(mockSelf);
    await awaitEvent(event);

    expect(mockSelf.clients.claim).toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// Fetch event - routing
// ---------------------------------------------------------------------------
describe('fetch event routing', () => {
  it('routes navigation requests through networkFirst (tries fetch)', () => {
    const event = fireFetch(mockSelf, {
      url: 'https://konsulin.id/page',
      mode: 'navigate'
    });

    expect(event.respondWith).toHaveBeenCalled();
    // networkFirst attempts fetch(request) first
    expect(mockFetch).toHaveBeenCalledWith(
      expect.objectContaining({ url: 'https://konsulin.id/page' })
    );
  });

  it.each([
    { url: 'https://konsulin.id/_next/static/foo.js', label: 'static assets' },
    { url: 'https://konsulin.id/favicon/icon.ico', label: 'favicon' },
    { url: 'https://konsulin.id/icons/192.png', label: 'icons' },
    { url: 'https://konsulin.id/images/logo.svg', label: 'images' }
  ])('routes $label through cacheFirst', ({ url }) => {
    const event = fireFetch(mockSelf, { url, method: 'GET' });

    expect(event.respondWith).toHaveBeenCalled();
    expect(mockCaches.open).toHaveBeenCalledWith('konsulin-static-v1');
  });

  it('routes proxy API directly to fetch (no cache)', () => {
    const event = fireFetch(mockSelf, {
      url: 'https://konsulin.id/proxy/fhir/Patient'
    });

    expect(event.respondWith).toHaveBeenCalled();
    expect(mockFetch).toHaveBeenCalledWith(
      expect.objectContaining({ url: 'https://konsulin.id/proxy/fhir/Patient' })
    );
    expect(mockCaches.open).not.toHaveBeenCalled();
  });

  it('ignores cross-origin requests', () => {
    const event = fireFetch(mockSelf, {
      url: 'https://other.com/page'
    });

    expect(event.respondWith).not.toHaveBeenCalled();
    expect(mockCaches.open).not.toHaveBeenCalled();
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it('routes other same-origin requests through networkFirst', () => {
    const event = fireFetch(mockSelf, {
      url: 'https://konsulin.id/api/data'
    });

    expect(event.respondWith).toHaveBeenCalled();
    expect(mockFetch).toHaveBeenCalledWith(
      expect.objectContaining({ url: 'https://konsulin.id/api/data' })
    );
  });

  it('does not fetch non-http URLs (security guard)', () => {
    const event = fireFetch(mockSelf, {
      url: 'javascript:void(0)', // skipcq: JS-0087
      mode: 'navigate'
    });

    // The handler should call respondWith but the fetch should not happen
    // because the URL scheme is not http/https
    expect(event.respondWith).not.toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// Fetch event - offline fallback behaviour
// ---------------------------------------------------------------------------
describe('fetch offline fallback', () => {
  it('serves offline page when network fails and no nav cache', async () => {
    mockFetch.mockRejectedValue(new Error('Offline'));

    // Pre-populate static cache with the offline fallback page
    const offlineResponse = new Response('offline page', { status: 200 });
    mockCaches.stores['konsulin-static-v1'] = createMockCache();
    mockCaches.stores['konsulin-static-v1'].match.mockImplementation(
      (url: string) => {
        if (url === '/~offline') return Promise.resolve(offlineResponse);
        return Promise.resolve();
      }
    );

    const event = fireFetch(mockSelf, {
      url: 'https://konsulin.id/new-page',
      mode: 'navigate',
      method: 'GET'
    });

    const response = await awaitEvent(event);
    expect(response).toBe(offlineResponse);
    expect(mockCaches.open).toHaveBeenCalledWith('konsulin-nav-v1');
    expect(mockCaches.open).toHaveBeenCalledWith('konsulin-static-v1');
  });

  it('serves cached page when network fails on navigation', async () => {
    mockFetch.mockRejectedValue(new Error('Offline'));

    const cachedResponse = new Response('cached page', { status: 200 });
    mockCaches.stores['konsulin-nav-v1'] = createMockCache();
    mockCaches.stores['konsulin-nav-v1'].match.mockResolvedValue(
      cachedResponse
    );

    const event = fireFetch(mockSelf, {
      url: 'https://konsulin.id/cached-page',
      mode: 'navigate',
      method: 'GET'
    });

    const response = await awaitEvent(event);
    expect(response).toBe(cachedResponse);
    // Should NOT reach the static cache fallback
    expect(mockCaches.open).not.toHaveBeenCalledWith('konsulin-static-v1');
  });
});

// ---------------------------------------------------------------------------
// Fetch event - cache failure resilience
// ---------------------------------------------------------------------------
describe('fetch cache failure resilience', () => {
  it('throws graceful error when cache fails during offline fallback', async () => {
    // Override mockCaches.open to reject, simulating storage corruption
    mockCaches.open = vi.fn().mockRejectedValue(new Error('Cache corrupted'));
    mockFetch.mockRejectedValue(new Error('Offline'));

    const event = fireFetch(mockSelf, {
      url: 'https://konsulin.id/new-page',
      mode: 'navigate',
      method: 'GET'
    });

    // The promise passed to respondWith should reject with the graceful error,
    // not the raw 'Cache corrupted' error from caches.open
    const capturedPromise = event.respondWith.mock.calls[0][0];
    await expect(capturedPromise).rejects.toThrow(
      'Network request failed and no cache/fallback available'
    );
  });
});

// ---------------------------------------------------------------------------
// sw-register.js — extracted from dangerouslySetInnerHTML
// ---------------------------------------------------------------------------
describe('sw-register.js', () => {
  const FILE_PATH = SW_REGISTER_PATH;

  it('exists in public/js/', () => {
    expect(existsSync(FILE_PATH)).toBe(true);
  });

  it('contains service worker registration code', () => {
    const content = readFileSync(FILE_PATH, 'utf-8');
    expect(content).toContain('serviceWorker');
    expect(content).toContain('/sw.js');
    expect(content).toContain('register');
  });

  it('does not use dangerouslySetInnerHTML (no XSS risk)', () => {
    const content = readFileSync(FILE_PATH, 'utf-8');
    expect(content).not.toContain('dangerouslySetInnerHTML');
  });
});

// ---------------------------------------------------------------------------
// Defense-in-depth: cacheFirst / networkFirst URL validation
// ---------------------------------------------------------------------------
describe('defense-in-depth URL validation', () => {
  it('cacheFirst throws for non-http URLs', async () => {
    const patchedCode = SW_CODE.replace(
      'async function cacheFirst (request, cacheName) {',
      'self.__testCacheFirst = async function cacheFirst (request, cacheName) {'
    );

    const captureSelf = createMockSelf() as MockSelf & {
      __testCacheFirst?: Function;
    };
    const fn = new Function(
      'self',
      'caches',
      'fetch',
      'Request',
      'Response',
      patchedCode
    );
    fn(captureSelf, mockCaches, mockFetch, Request, Response);

    const cacheFirst = captureSelf.__testCacheFirst;
    if (typeof cacheFirst !== 'function') {
      throw new Error('__testCacheFirst was not injected');
    }

    const request = new Request('javascript:void(0)'); // skipcq: JS-0087
    await expect(
      cacheFirst(request, 'test-cache')
    ).rejects.toThrow('Invalid URL: only http/https URLs are allowed');
  });

  it('networkFirst throws for non-http URLs', async () => {
    const patchedCode = SW_CODE.replace(
      'async function networkFirst (request, cacheName, fallbackUrl) {',
      'self.__testNetworkFirst = async function networkFirst (request, cacheName, fallbackUrl) {'
    );

    const captureSelf = createMockSelf() as MockSelf & {
      __testNetworkFirst?: Function;
    };
    const fn = new Function(
      'self',
      'caches',
      'fetch',
      'Request',
      'Response',
      patchedCode
    );
    fn(captureSelf, mockCaches, mockFetch, Request, Response);

    const networkFirst = captureSelf.__testNetworkFirst;
    if (typeof networkFirst !== 'function') {
      throw new Error('__testNetworkFirst was not injected');
    }

    const request = new Request('javascript:void(0)'); // skipcq: JS-0087
    await expect(
      networkFirst(request, 'test-cache')
    ).rejects.toThrow('Invalid URL: only http/https URLs are allowed');
  });
});
