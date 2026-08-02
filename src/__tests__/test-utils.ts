/* eslint-disable unicorn/prefer-https */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import { QueryClient } from '@tanstack/react-query';
import { expect, type Mock, vi } from 'vitest';

// ---------------------------------------------------------------------------
// SW Testing — mock factories
// ---------------------------------------------------------------------------

/**
 *
 */
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

/**
 *
 */
export function createMockSelf() {
  type EventCallback = (event: Record<string, unknown>) => void;
  const handlers: Record<string, EventCallback[] | undefined> = {};
  const listeners: Record<string, EventCallback[] | undefined> = {};
  return {
    handlers,
    listeners,
    addEventListener: vi.fn((type: string, handler: EventCallback) => {
      // skipcq: JS-0376 - dynamic property access in test mock infrastructure
      const handlerArr = (handlers[type] ??= []);
      handlerArr.push(handler);
      // skipcq: JS-0376 - dynamic property access in test mock infrastructure
      const listenerArr = (listeners[type] ??= []);
      listenerArr.push(handler);
    }),
    skipWaiting: vi.fn(),
    clients: { claim: vi.fn() },
    location: { origin: 'http://konsulin.care' }
  };
}

export type MockSelf = ReturnType<typeof createMockSelf>;

/**
 *
 */
export function createMockCaches() {
  const stores: Record<string, MockCache> = {};
  return {
    stores,
    open: vi.fn((name: string) => {
      // skipcq: JS-0376 - dynamic property access in test mock infrastructure
      stores[name] ??= createMockCache();
      // skipcq: JS-0376 - dynamic property access in test mock infrastructure
      return Promise.resolve(stores[name]);
    }),
    keys: vi.fn(() => Promise.resolve(Object.keys(stores))),
    delete: vi.fn((key: string) => {
      Reflect.deleteProperty(stores, key);
      return Promise.resolve(true);
    }),
    has: vi.fn(),
    match: vi.fn()
  };
}

export type MockCaches = ReturnType<typeof createMockCaches>;

/**
 *
 */
export function createMockFetch() {
  return vi.fn().mockResolvedValue(new Response('ok', { status: 200 }));
}

/**
 *
 */
export function createMockEvent(overrides: Record<string, unknown> = {}) {
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

/**
 *
 */
export function fireInstall(mockSelf: MockSelf) {
  const event = createMockEvent();
  const handler = mockSelf.handlers.install[0];
  expect(handler, 'install handler must be registered').toBeDefined();
  handler(event);
  return event;
}

/**
 *
 */
export function fireActivate(mockSelf: MockSelf) {
  const event = createMockEvent();
  const handler = mockSelf.handlers.activate[0];
  expect(handler, 'activate handler must be registered').toBeDefined();
  handler(event);
  return event;
}

/**
 *
 */
export function fireFetch(
  mockSelf: MockSelf,
  request: Record<string, unknown> = {}
) {
  const event = createMockEvent({ request });
  const handler = mockSelf.handlers.fetch[0];
  expect(handler, 'fetch handler must be registered').toBeDefined();
  handler(event);
  return event;
}

/**
 *
 */
export async function awaitEvent(event: {
  waitUntil?: Mock;
  respondWith?: Mock;
}): Promise<unknown> {
  if (event.waitUntil && event.waitUntil.mock.calls.length > 0) {
    const promise = event.waitUntil.mock.calls[0][0];
    if (promise instanceof Promise) await promise;
  }
  if (event.respondWith && event.respondWith.mock.calls.length > 0) {
    const result = event.respondWith.mock.calls[0][0];
    if (result instanceof Promise) return await result;
    return result;
  }
  return undefined;
}

// ---------------------------------------------------------------------------
// React Testing — helpers
// ---------------------------------------------------------------------------

/**
 *
 */
export function createQueryClient() {
  return new QueryClient({
    defaultOptions: { queries: { retry: false } }
  });
}

/**
 *
 */
export function mockAuth(
  useAuthMock: Mock,
  overrides?: Record<string, unknown>
): void {
  useAuthMock.mockReturnValue({
    isLoading: false,
    dispatch: vi.fn(),
    state: {
      isAuthenticated: true,
      userInfo: overrides ?? {}
    }
  });
}
