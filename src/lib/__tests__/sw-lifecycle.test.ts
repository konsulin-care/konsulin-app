/* eslint-disable unicorn/prefer-https */
/* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call, sonarjs/code-eval, @typescript-eslint/no-implied-eval, unicorn/text-encoding-identifier-case */
/* eslint-disable max-lines */
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
  fireSync,
  type MockCaches,
  type MockSelf
} from '@/__tests__/test-utils';

const __dirname = dirname(fileURLToPath(import.meta.url));
const SW_PATH = resolve(__dirname, '../../../public/sw.js');
const SW_REGISTER_PATH = resolve(
  __dirname,
  '../../../public/js/sw-register.js'
);
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

    expect(mockCaches.open).toHaveBeenCalledWith('konsulin-static-v2');
    expect(mockCaches.stores['konsulin-static-v2'].addAll).toHaveBeenCalledWith(
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
    mockCaches.stores['konsulin-static-v2'] = createMockCache();
    mockCaches.stores['konsulin-nav-v2'] = createMockCache();

    const event = fireActivate(mockSelf);
    await awaitEvent(event);

    expect(mockCaches.delete).not.toHaveBeenCalledWith('konsulin-static-v2');
    expect(mockCaches.delete).not.toHaveBeenCalledWith('konsulin-nav-v2');
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
// Sync event
// ---------------------------------------------------------------------------
describe('sync event', () => {
  it('broadcasts SYNC_REPLAY to all clients for the replay-pending tag', async () => {
    const clientA = { postMessage: vi.fn() };
    const clientB = { postMessage: vi.fn() };
    mockSelf.clients.matchAll.mockResolvedValue([clientA, clientB]);

    const event = fireSync(mockSelf, 'replay-pending');
    await awaitEvent(event);

    expect(mockSelf.clients.matchAll).toHaveBeenCalled();
    expect(clientA.postMessage).toHaveBeenCalledWith({ type: 'SYNC_REPLAY' });
    expect(clientB.postMessage).toHaveBeenCalledWith({ type: 'SYNC_REPLAY' });
  });

  it('ignores sync events for other tags', () => {
    const event = fireSync(mockSelf, 'other-tag');

    expect(event.waitUntil).not.toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// Message event
// ---------------------------------------------------------------------------
describe('message event', () => {
  const SAME_ORIGIN = 'http://konsulin.care';

  it('calls skipWaiting() on a same-origin SKIP_WAITING message', () => {
    const handler = mockSelf.handlers.message[0];
    expect(handler, 'message handler must be registered').toBeDefined();

    handler({ origin: SAME_ORIGIN, data: { type: 'SKIP_WAITING' } });

    expect(mockSelf.skipWaiting).toHaveBeenCalled();
  });

  it('ignores messages without the SKIP_WAITING type', () => {
    const handler = mockSelf.handlers.message[0];

    handler({ origin: SAME_ORIGIN, data: { type: 'SOMETHING_ELSE' } });

    expect(mockSelf.skipWaiting).not.toHaveBeenCalled();
  });

  it('rejects SKIP_WAITING messages from other origins', () => {
    const handler = mockSelf.handlers.message[0];

    handler({
      origin: 'https://evil.example',
      data: { type: 'SKIP_WAITING' }
    });

    expect(mockSelf.skipWaiting).not.toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// Fetch event - routing
// ---------------------------------------------------------------------------
describe('fetch event routing', () => {
  it('routes navigation requests through networkFirst (tries fetch)', () => {
    const event = fireFetch(mockSelf, {
      url: 'http://konsulin.care/page',
      mode: 'navigate'
    });

    expect(event.respondWith).toHaveBeenCalled();
    // networkFirst attempts fetch(request) first
    expect(mockFetch).toHaveBeenCalledWith(
      expect.objectContaining({ url: 'http://konsulin.care/page' })
    );
  });

  it.each([
    {
      url: 'http://konsulin.care/_next/static/foo.js',
      label: 'static assets'
    },
    { url: 'http://konsulin.care/favicon/icon.ico', label: 'favicon' },
    { url: 'http://konsulin.care/icons/192.png', label: 'icons' },
    { url: 'http://konsulin.care/images/logo.svg', label: 'images' }
  ])('routes $label through networkFirst', async ({ url }) => {
    const event = fireFetch(mockSelf, { url, method: 'GET' });
    await awaitEvent(event);

    expect(event.respondWith).toHaveBeenCalled();
    // networkFirst opens cache after network fetch succeeds
    expect(mockCaches.open).toHaveBeenCalledWith('konsulin-static-v2');
  });

  it('fetches static assets from network even when cached (networkFirst behavior)', () => {
    // Pre-populate cache so cacheFirst would return cached without fetching
    const cachedResponse = new Response('cached', { status: 200 });
    mockCaches.stores['konsulin-static-v2'] = createMockCache();
    mockCaches.stores['konsulin-static-v2'].match.mockResolvedValue(
      cachedResponse
    );

    fireFetch(mockSelf, {
      url: 'http://konsulin.care/_next/static/chunk.js',
      method: 'GET'
    });

    // networkFirst should fetch from network regardless of cache state
    expect(mockFetch).toHaveBeenCalledWith(
      expect.objectContaining({
        url: 'http://konsulin.care/_next/static/chunk.js'
      })
    );
  });

  it('routes proxy API directly to fetch (no cache)', () => {
    const event = fireFetch(mockSelf, {
      url: 'http://konsulin.care/proxy/fhir/Patient',
      method: 'GET'
    });

    expect(event.respondWith).toHaveBeenCalled();
    expect(mockFetch).toHaveBeenCalledWith(
      expect.objectContaining({
        url: 'http://konsulin.care/proxy/fhir/Patient'
      })
    );
    expect(mockCaches.open).not.toHaveBeenCalled();
  });

  it('routes /proxy/fhir/Questionnaire GETs through networkFirst (caches on success)', async () => {
    const event = fireFetch(mockSelf, {
      url: 'http://konsulin.care/proxy/fhir/Questionnaire?_id=abc',
      method: 'GET'
    });
    await awaitEvent(event);

    expect(event.respondWith).toHaveBeenCalled();
    expect(mockFetch).toHaveBeenCalledWith(
      expect.objectContaining({
        url: 'http://konsulin.care/proxy/fhir/Questionnaire?_id=abc'
      })
    );
    expect(mockCaches.open).toHaveBeenCalledWith('konsulin-nav-v2');
  });

  it('serves a cached Questionnaire when the network fails', async () => {
    mockFetch.mockRejectedValue(new Error('Offline'));
    const cachedResponse = new Response('cached questionnaire', {
      status: 200
    });
    mockCaches.stores['konsulin-nav-v2'] = createMockCache();
    mockCaches.stores['konsulin-nav-v2'].match.mockResolvedValue(
      cachedResponse
    );

    const event = fireFetch(mockSelf, {
      url: 'http://konsulin.care/proxy/fhir/Questionnaire/soap',
      method: 'GET'
    });

    const response = await awaitEvent(event);
    expect(response).toBe(cachedResponse);
  });

  it('routes /proxy/fhir/QuestionnaireResponse through raw fetch (no cache)', () => {
    const event = fireFetch(mockSelf, {
      url: 'http://konsulin.care/proxy/fhir/QuestionnaireResponse',
      method: 'GET'
    });

    expect(event.respondWith).toHaveBeenCalled();
    expect(mockFetch).toHaveBeenCalledWith(
      expect.objectContaining({
        url: 'http://konsulin.care/proxy/fhir/QuestionnaireResponse'
      })
    );
    expect(mockCaches.open).not.toHaveBeenCalled();
  });

  it.each([
    'http://konsulin.care/auth/cookie',
    'http://konsulin.care/auth/cookie/csrf-token',
    'http://konsulin.care/api/config'
  ])('routes %s through raw fetch (never cached)', url => {
    const event = fireFetch(mockSelf, { url, method: 'GET' });

    expect(event.respondWith).toHaveBeenCalled();
    expect(mockFetch).toHaveBeenCalledWith(expect.objectContaining({ url }));
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
      url: 'http://konsulin.care/api/data'
    });

    expect(event.respondWith).toHaveBeenCalled();
    expect(mockFetch).toHaveBeenCalledWith(
      expect.objectContaining({ url: 'http://konsulin.care/api/data' })
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
    mockCaches.stores['konsulin-static-v2'] = createMockCache();
    mockCaches.stores['konsulin-static-v2'].match.mockImplementation(
      (url: string) => {
        if (url === '/~offline') return Promise.resolve(offlineResponse);
        return Promise.resolve();
      }
    );

    const event = fireFetch(mockSelf, {
      url: 'http://konsulin.care/new-page',
      mode: 'navigate',
      method: 'GET'
    });

    const response = await awaitEvent(event);
    expect(response).toBe(offlineResponse);
    expect(mockCaches.open).toHaveBeenCalledWith('konsulin-nav-v2');
    expect(mockCaches.open).toHaveBeenCalledWith('konsulin-static-v2');
  });

  it('serves cached page when network fails on navigation', async () => {
    mockFetch.mockRejectedValue(new Error('Offline'));

    const cachedResponse = new Response('cached page', { status: 200 });
    mockCaches.stores['konsulin-nav-v2'] = createMockCache();
    mockCaches.stores['konsulin-nav-v2'].match.mockResolvedValue(
      cachedResponse
    );

    const event = fireFetch(mockSelf, {
      url: 'http://konsulin.care/cached-page',
      mode: 'navigate',
      method: 'GET'
    });

    const response = await awaitEvent(event);
    expect(response).toBe(cachedResponse);
    // Should NOT reach the static cache fallback
    expect(mockCaches.open).not.toHaveBeenCalledWith('konsulin-static-v2');
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
      url: 'http://konsulin.care/new-page',
      mode: 'navigate',
      method: 'GET'
    });

    // The promise passed to respondWith should resolve with a 503 Service Unavailable,
    // not reject or throw the raw 'Cache corrupted' error from caches.open
    const capturedPromise = event.respondWith.mock.calls[0][0];
    const response = await capturedPromise;
    expect(response.status).toBe(503);
    const text = await response.text();
    expect(text).toBe('Service Unavailable');
  });
});

// ---------------------------------------------------------------------------
// Fetch event — top-level error recovery
// ---------------------------------------------------------------------------
describe('fetch error recovery', () => {
  it('ignores unparseable URLs without calling respondWith', () => {
    // URL parsing failure: new URL('') throws
    const event = fireFetch(mockSelf, { url: '' });

    // Invalid URLs are silently ignored — no respondWith, no fetch
    expect(event.respondWith).not.toHaveBeenCalled();
    expect(mockFetch).toHaveBeenCalledTimes(0);
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

  it('handles registration errors gracefully', () => {
    const content = readFileSync(FILE_PATH, 'utf-8');
    const hasCatch = content.includes('catch');
    expect(hasCatch).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Defense-in-depth: cacheFirst / networkFirst URL validation
// ---------------------------------------------------------------------------
describe('defense-in-depth URL validation', () => {
  it('networkFirst returns 503 for non-http URLs', async () => {
    // Append a test hook: networkFirst is a top-level function declaration,
    // so it is hoisted and in scope at the end of the evaluated body.
    // Format-agnostic — unlike the previous literal string replace() which
    // silently no-oped after the formatter added a space (see #8086b202).
    const patchedCode = `${SW_CODE}\n;self.__testNetworkFirst = networkFirst;`;

    const captureSelf = createMockSelf() as MockSelf & {
      __testNetworkFirst?: (
        request: Request,
        cacheName: string,
        fallbackUrl?: string
      ) => Promise<Response>;
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

    const request = new Request('javascript:void(0)'); // skipcq: JS-0087
    expect(captureSelf.__testNetworkFirst).toBeDefined();
    const response = await captureSelf.__testNetworkFirst(
      request,
      'test-cache'
    );
    expect(response.status).toBe(503);
    const text = await response.text();
    expect(text).toBe('Service Unavailable');
  });
});
