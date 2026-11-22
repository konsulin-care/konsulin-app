import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

/**
 * Notes: These tests mock the global `indexedDB` object. Vitest jsdom
 * provides a minimal IndexedDB implementation that we intercept.
 */

// We must mock before importing because openDB references global indexedDB
const mockIndexedDB = {
  open: vi.fn(),
  deleteDatabase: vi.fn()
};

vi.stubGlobal('indexedDB', mockIndexedDB);

// We need to import after stubbing since the module uses globalThis.indexedDB
let openDB: () => Promise<IDBDatabase>;

/** Invoke an IndexedDB event handler mock safely. */
function triggerEvent(handler: unknown, detail: Record<string, unknown>) {
  if (handler) (handler as (...args: unknown[]) => void)(detail);
}

/**
 * Creates a mock IDBRequest object for use in IndexedDB test mocks.
 * @param result - Optional result to set on the request
 * @param error - Optional error to set on the request
 */
function createMockRequest(result?: IDBDatabase, error?: DOMException) {
  const request: Record<string, unknown> = {
    result: result ?? null,
    error: error ?? null,
    onsuccess: null,
    onerror: null,
    onupgradeneeded: null
  };
  return request;
}

describe('schema v4', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
  });

  it('exports DB_VERSION 4', async () => {
    const mod = await import('@/lib/indexeddb');
    expect(mod.DB_VERSION).toBe(4);
  });

  it('declares the query_cache store with key keyPath', async () => {
    const mod = await import('@/lib/indexeddb');
    expect(mod.STORES.queryCache).toBe('query_cache');
    const schema = mod.STORE_SCHEMAS.find(
      (s: { name: string }) => s.name === 'query_cache'
    );
    expect(schema).toBeDefined();
    expect(schema.keyPath).toBe('key');
  });

  it('declares the pending_submissions store with id keyPath', async () => {
    const mod = await import('@/lib/indexeddb');
    expect(mod.STORES.pendingSubmissions).toBe('pending_submissions');
    const schema = mod.STORE_SCHEMAS.find(
      (s: { name: string }) => s.name === 'pending_submissions'
    );
    expect(schema).toBeDefined();
    expect(schema.keyPath).toBe('id');
  });

  it('adds only query_cache during v3 -> v4 upgrade', async () => {
    const mod = await import('@/lib/indexeddb');
    const v3Stores = new Set([
      'guest_sessions',
      'assessment_drafts',
      'soap_drafts',
      'service_requests',
      'temp_booking',
      'ui_preferences',
      'navigation_state',
      'user_profile',
      'pending_submissions'
    ]);
    const createObjectStore = vi.fn();
    const mockDb = {
      name: 'konsulin',
      version: 4,
      objectStoreNames: {
        contains: vi.fn((name: string) => v3Stores.has(name))
      },
      createObjectStore,
      addEventListener: vi.fn(),
      close: vi.fn(),
      onclose: null,
      onversionchange: null
    };

    const request = createMockRequest(mockDb as unknown as IDBDatabase);
    mockIndexedDB.open.mockImplementation(() => {
      setTimeout(() => {
        if (request.onupgradeneeded) {
          triggerEvent(request.onupgradeneeded, { target: request });
        }
        if (request.onsuccess) {
          triggerEvent(request.onsuccess, { target: request });
        }
      }, 0);
      return request;
    });

    await mod.openDB();

    // Existing v3 stores are left untouched; only the new store is created.
    expect(createObjectStore).toHaveBeenCalledTimes(1);
    expect(createObjectStore).toHaveBeenCalledWith('query_cache', {
      keyPath: 'key'
    });
  });
});

describe('openDB', () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    vi.resetModules();
    const mod = await import('@/lib/indexeddb');
    openDB = mod.openDB;
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('opens DB with a single indexedDB.open call in normal case', async () => {
    const mockDb = {
      name: 'konsulin',
      version: 4,
      objectStoreNames: { contains: vi.fn().mockReturnValue(true) },
      addEventListener: vi.fn(),
      close: vi.fn(),
      onclose: null,
      onversionchange: null
    };

    const request = createMockRequest(mockDb as unknown as IDBDatabase);

    mockIndexedDB.open.mockImplementation(() => {
      // Simulate async success
      setTimeout(() => {
        if (request.onsuccess) {
          triggerEvent(request.onsuccess, { target: request });
        }
      }, 0);
      return request;
    });

    const db = await openDB();

    expect(db).toBe(mockDb);
    // Normal path: directly opens with DB_VERSION, no discovery
    expect(mockIndexedDB.open).toHaveBeenCalledTimes(1);
    expect(mockIndexedDB.open).toHaveBeenCalledWith('konsulin', 4);
  });

  it('reuses the same DB promise on subsequent calls', async () => {
    const mockDb = {
      name: 'konsulin',
      version: 2,
      objectStoreNames: { contains: vi.fn().mockReturnValue(true) },
      addEventListener: vi.fn(),
      close: vi.fn(),
      onclose: null,
      onversionchange: null
    };

    let callCount = 0;
    const request = createMockRequest(mockDb as unknown as IDBDatabase);

    mockIndexedDB.open.mockImplementation(() => {
      callCount++;
      setTimeout(() => {
        if (request.onsuccess) {
          triggerEvent(request.onsuccess, { target: request });
        }
      }, 0);
      return request;
    });

    const db1 = await openDB();
    const db2 = await openDB();

    expect(db1).toBe(db2);
    // Only one actual open since the promise is cached
    expect(callCount).toBe(1);
  });

  it('retries openDB after a non-VersionError failure', async () => {
    const mockDb = {
      name: 'konsulin',
      version: 2,
      objectStoreNames: { contains: vi.fn().mockReturnValue(true) },
      addEventListener: vi.fn(),
      close: vi.fn(),
      onclose: null,
      onversionchange: null
    };

    let openCount = 0;
    mockIndexedDB.open.mockImplementation(() => {
      openCount++;
      const req = createMockRequest();

      if (openCount === 1) {
        req.error = new Error('Internal error opening database');
        setTimeout(() => {
          if (req.onerror) {
            triggerEvent(req.onerror, { target: req });
          }
        }, 0);
      } else {
        req.result = mockDb;
        setTimeout(() => {
          if (req.onsuccess) {
            triggerEvent(req.onsuccess, { target: req });
          }
        }, 0);
      }
      return req;
    });

    // First call should reject
    let caught = false;
    try {
      await openDB();
    } catch (e) {
      caught = true;
      expect((e as Error).message).toBe('Internal error opening database');
    }
    expect(caught).toBe(true);

    // Second call should succeed (dbPromise reset)
    const db = await openDB();
    expect(db).toBe(mockDb);
    expect(openCount).toBe(2);
  });

  it('handles VersionError by falling back to existing version', async () => {
    const mockDb = {
      name: 'konsulin',
      version: 5,
      objectStoreNames: { contains: vi.fn().mockReturnValue(true) },
      addEventListener: vi.fn(),
      close: vi.fn(),
      onclose: null,
      onversionchange: null
    };

    const versionError = new DOMException(
      'The requested version (4) is less than the existing version (5).',
      'VersionError'
    );

    let openCount = 0;
    mockIndexedDB.open.mockImplementation((_name: string, version?: number) => {
      openCount++;
      const req = createMockRequest();

      if (openCount === 1 && version === 4) {
        // First attempt: VersionError
        req.error = versionError;
        setTimeout(() => {
          if (req.onerror) {
            triggerEvent(req.onerror, { target: req });
          }
        }, 0);
      } else if (openCount === 2 || openCount === 3) {
        // Discovery open (openCount === 2) or re-open at existing version (openCount === 3)
        req.result = mockDb;
        setTimeout(() => {
          if (req.onsuccess) {
            triggerEvent(req.onsuccess, { target: req });
          }
        }, 0);
      }
      return req;
    });

    const db = await openDB();
    expect(db).toBe(mockDb);
    // Three opens: attempt, discovery, re-open
    expect(openCount).toBe(3);
  });
});
