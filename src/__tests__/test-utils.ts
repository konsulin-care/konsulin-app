import { QueryClient } from '@tanstack/react-query';
import { expect, type Mock, vi } from 'vitest';

// ---------------------------------------------------------------------------
// SW Testing — mock factories
// ---------------------------------------------------------------------------

export function createMockCache() {
  return {
    addAll: vi.fn(),
    match: vi.fn(),
    put: vi.fn(),
    keys: vi.fn(),
    delete: vi.fn()
  };
}

export type MockCache = ReturnType<typeof createMockCache>;

export function createMockSelf() {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  type EventCallback = (event: Record<string, any>) => void;
  const handlers: Record<string, EventCallback[]> = {};
  const listeners: Record<string, EventCallback[]> = {};
  return {
    handlers,
    listeners,
    addEventListener: vi.fn((type: string, handler: EventCallback) => {
      if (!handlers[type]) handlers[type] = [];
      handlers[type].push(handler);
      if (!listeners[type]) listeners[type] = [];
      listeners[type].push(handler);
    }),
    skipWaiting: vi.fn(),
    clients: { claim: vi.fn() },
    location: { origin: 'https://konsulin.id' }
  };
}

export type MockSelf = ReturnType<typeof createMockSelf>;

export function createMockCaches() {
  const stores: Record<string, MockCache> = {};
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

export type MockCaches = ReturnType<typeof createMockCaches>;

export function createMockFetch() {
  return vi.fn().mockResolvedValue(new Response('ok', { status: 200 }));
}

export function createMockEvent(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  overrides: Record<string, any> = {}
) {
  return {
    waitUntil: vi.fn(),
    respondWith: vi.fn(),
    request: null,
    ...overrides
  };
}

// ---------------------------------------------------------------------------
// SW Testing — event helpers
// ---------------------------------------------------------------------------

export function fireInstall(mockSelf: MockSelf) {
  const event = createMockEvent();
  const handler = mockSelf.handlers['install']?.[0];
  expect(handler, 'install handler must be registered').toBeDefined();
  handler?.(event);
  return event;
}

export function fireActivate(mockSelf: MockSelf) {
  const event = createMockEvent();
  const handler = mockSelf.handlers['activate']?.[0];
  expect(handler, 'activate handler must be registered').toBeDefined();
  handler?.(event);
  return event;
}

export function fireFetch(
  mockSelf: MockSelf,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  request: Record<string, any> = {}
) {
  const event = createMockEvent({ request });
  const handler = mockSelf.handlers['fetch']?.[0];
  expect(handler, 'fetch handler must be registered').toBeDefined();
  handler?.(event);
  return event;
}

export async function awaitEvent(
  event: { waitUntil?: Mock; respondWith?: Mock }
) {
  if (event.waitUntil && event.waitUntil.mock.calls.length > 0) {
    const promise = event.waitUntil.mock.calls[0][0];
    if (promise instanceof Promise) await promise;
  }
  if (event.respondWith && event.respondWith.mock.calls.length > 0) {
    const result = event.respondWith.mock.calls[0][0];
    if (result instanceof Promise) return await result;
    return result;
  }
}

// ---------------------------------------------------------------------------
// React Testing — helpers
// ---------------------------------------------------------------------------

export function createQueryClient() {
  return new QueryClient({
    defaultOptions: { queries: { retry: false } }
  });
}

export function mockAuth(
  useAuthMock: Mock,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  overrides?: Record<string, any>
): void {
  useAuthMock.mockReturnValue({
    isLoading: false,
    dispatch: vi.fn(),
    state: {
      isAuthenticated: true,
      userInfo: overrides ?? {}
    }
  } as any);
}
