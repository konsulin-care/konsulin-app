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

const __dirname = dirname(fileURLToPath(import.meta.url));
const SW_PATH = resolve(__dirname, '../../../public/sw.js');
const SW_REGISTER_PATH = resolve(__dirname, '../../../public/js/sw-register.js');
let SW_CODE: string;

// ---------------------------------------------------------------------------
// Mock factories
// ---------------------------------------------------------------------------

function createMockCache() {
  return {
    addAll: vi.fn(),
    match: vi.fn(),
    put: vi.fn(),
    keys: vi.fn(),
    delete: vi.fn()
  };
}

type MockSelf = ReturnType<typeof createMockSelf>;
type MockCaches = ReturnType<typeof createMockCaches>;

function createMockSelf() {
  type EventCallback = (event: Record<string, unknown>) => void;
  const handlers: Record<string, EventCallback[]> = {};
  const listeners: Record<string, EventCallback[]> = {};
  return {
    handlers,
    listeners,
    addEventListener: vi.fn((type: string, handler: EventCallback) => {
      if (!handlers[type]) handlers[type] = [];
      handlers[type].push(handler);
      // Also mirror onto listeners (for tests that check both)
      if (!listeners[type]) listeners[type] = [];
      listeners[type].push(handler);
    }),
    skipWaiting: vi.fn(),
    clients: { claim: vi.fn() },
    location: { origin: 'https://konsulin.id' }
  };
}

function createMockCaches() {
  const stores: Record<string, ReturnType<typeof createMockCache>> = {};
  return {
    stores,
    open: vi.fn((name: string) => {
      if (!stores[name]) stores[name] = createMockCache();
      return Promise.resolve(stores[name]);
    }),
    keys: vi.fn(() => Promise.resolve(Object.keys(stores))),
    delete: vi.fn((key: string) => {
      // skipcq: JS-0320 - dynamic property deletion in test mock infrastructure
      delete stores[key];
      return Promise.resolve(true);
    }),
    has: vi.fn(),
    match: vi.fn()
  };
}

function createMockFetch() {
  return vi.fn().mockResolvedValue(new Response('ok', { status: 200 }));
}

function createMockEvent(overrides: Record<string, unknown> = {}) {
  return {
    waitUntil: vi.fn(),
    respondWith: vi.fn(),
    request: null,
    ...overrides
  };
}

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
// ---------------------------------------------------------------------------
// Helper: fire SW events
// ---------------------------------------------------------------------------

function fireInstall() {
  const event = createMockEvent();
  // skipcq: JS-0321 - safe: expect guard fails before optional call
  const handler = mockSelf.handlers['install']?.[0];
  expect(handler, 'install handler must be registered').toBeDefined();
  handler?.(event);
  return event;
}

function fireActivate() {
  const event = createMockEvent();
  // skipcq: JS-0321 - safe: expect guard fails before optional call
  const handler = mockSelf.handlers['activate']?.[0];
  expect(handler, 'activate handler must be registered').toBeDefined();
  handler?.(event);
  return event;
}

function fireFetch(request: unknown) {
  const event = createMockEvent({ request });
  // skipcq: JS-0321 - safe: expect guard fails before optional call
  const handler = mockSelf.handlers['fetch']?.[0];
  expect(handler, 'fetch handler must be registered').toBeDefined();
  handler?.(event);
  return event;
}

describe('install event', () => {
  it('pre-caches PRECACHE_URLS into STATIC_CACHE', async () => {
    const event = fireInstall();

    expect(event.waitUntil).toHaveBeenCalled();
    const promise = event.waitUntil.mock.calls[0][0];
    await promise;

    expect(mockCaches.open).toHaveBeenCalledWith('konsulin-static-v1');
    expect(mockCaches.stores['konsulin-static-v1'].addAll).toHaveBeenCalledWith(
      ['/~offline', '/manifest.json', '/images/Loading-Time.svg']
    );
  });

  it('calls self.skipWaiting()', () => {
    fireInstall();
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

    const event = fireActivate();

    expect(event.waitUntil).toHaveBeenCalled();
    const promise = event.waitUntil.mock.calls[0][0];
    await promise;

    expect(mockCaches.delete).toHaveBeenCalledWith('konsulin-old-v1');
    expect(mockCaches.delete).toHaveBeenCalledWith('konsulin-v0');
  });

  it('preserves current version caches', async () => {
    mockCaches.stores['konsulin-old-v1'] = createMockCache();
    mockCaches.stores['konsulin-static-v1'] = createMockCache();
    mockCaches.stores['konsulin-nav-v1'] = createMockCache();

    const event = fireActivate();
    await event.waitUntil.mock.calls[0][0];

    expect(mockCaches.delete).not.toHaveBeenCalledWith('konsulin-static-v1');
    expect(mockCaches.delete).not.toHaveBeenCalledWith('konsulin-nav-v1');
    expect(mockCaches.delete).toHaveBeenCalledTimes(1); // only old cache
  });

  it('leaves non-konsulin caches untouched', async () => {
    mockCaches.stores['other-cache'] = createMockCache();
    mockCaches.stores['workbox-precache'] = createMockCache();

    const event = fireActivate();
    await event.waitUntil.mock.calls[0][0];

    expect(mockCaches.delete).not.toHaveBeenCalledWith('other-cache');
    expect(mockCaches.delete).not.toHaveBeenCalledWith('workbox-precache');
  });

  it('calls clients.claim()', async () => {
    const event = fireActivate();
    await event.waitUntil.mock.calls[0][0];

    expect(mockSelf.clients.claim).toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// Fetch event - routing
// ---------------------------------------------------------------------------
describe('fetch event routing', () => {
  it('routes navigation requests through networkFirst (tries fetch)', () => {
    const event = fireFetch({
      url: 'https://konsulin.id/page',
      mode: 'navigate'
    });

    expect(event.respondWith).toHaveBeenCalled();
    // networkFirst attempts fetch(request) first
    expect(mockFetch).toHaveBeenCalledWith(
      expect.objectContaining({ url: 'https://konsulin.id/page' })
    );
  });

  it('routes static asset requests through cacheFirst', () => {
    const event = fireFetch({
      url: 'https://konsulin.id/_next/static/foo.js',
      method: 'GET'
    });

    expect(event.respondWith).toHaveBeenCalled();
    expect(mockCaches.open).toHaveBeenCalledWith('konsulin-static-v1');
  });

  it('routes favicon through cacheFirst', () => {
    const event = fireFetch({
      url: 'https://konsulin.id/favicon/icon.ico',
      method: 'GET'
    });

    expect(event.respondWith).toHaveBeenCalled();
    expect(mockCaches.open).toHaveBeenCalledWith('konsulin-static-v1');
  });

  it('routes icons through cacheFirst', () => {
    const event = fireFetch({
      url: 'https://konsulin.id/icons/192.png',
      method: 'GET'
    });

    expect(event.respondWith).toHaveBeenCalled();
    expect(mockCaches.open).toHaveBeenCalledWith('konsulin-static-v1');
  });

  it('routes images through cacheFirst', () => {
    const event = fireFetch({
      url: 'https://konsulin.id/images/logo.svg',
      method: 'GET'
    });

    expect(event.respondWith).toHaveBeenCalled();
    expect(mockCaches.open).toHaveBeenCalledWith('konsulin-static-v1');
  });

  it('routes proxy API directly to fetch (no cache)', () => {
    const event = fireFetch({
      url: 'https://konsulin.id/proxy/fhir/Patient'
    });

    expect(event.respondWith).toHaveBeenCalled();
    expect(mockFetch).toHaveBeenCalledWith(
      expect.objectContaining({ url: 'https://konsulin.id/proxy/fhir/Patient' })
    );
    expect(mockCaches.open).not.toHaveBeenCalled();
  });

  it('ignores cross-origin requests', () => {
    const event = fireFetch({
      url: 'https://other.com/page'
    });

    expect(event.respondWith).not.toHaveBeenCalled();
    expect(mockCaches.open).not.toHaveBeenCalled();
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it('routes other same-origin requests through networkFirst', () => {
    const event = fireFetch({
      url: 'https://konsulin.id/api/data'
    });

    expect(event.respondWith).toHaveBeenCalled();
    expect(mockFetch).toHaveBeenCalledWith(
      expect.objectContaining({ url: 'https://konsulin.id/api/data' })
    );
  });

  it('does not fetch non-http URLs (security guard)', () => {
    const event = fireFetch({
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

    const event = {
      waitUntil: vi.fn(),
      respondWith: vi.fn(),
      request: { url: 'https://konsulin.id/new-page', mode: 'navigate', method: 'GET' }
    };

    // skipcq: JS-0321 - safe: expect guard fails before optional call
    const handler = mockSelf.handlers['fetch']?.[0];
    expect(handler).toBeDefined();
    handler?.(event);

    const response = await event.respondWith.mock.calls[0][0];
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

    const event = {
      waitUntil: vi.fn(),
      respondWith: vi.fn(),
      request: { url: 'https://konsulin.id/cached-page', mode: 'navigate', method: 'GET' }
    };

    // skipcq: JS-0321 - safe: expect guard fails before optional call
    const handler = mockSelf.handlers['fetch']?.[0];
    expect(handler).toBeDefined();
    handler?.(event);

    const response = await event.respondWith.mock.calls[0][0];
    expect(response).toBe(cachedResponse);
    // Should NOT reach the static cache fallback
    expect(mockCaches.open).not.toHaveBeenCalledWith('konsulin-static-v1');
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
