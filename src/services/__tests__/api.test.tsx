import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const { shouldRetry } = vi.hoisted(() => ({ shouldRetry: vi.fn() }));
const { acquireMock } = vi.hoisted(() => ({ acquireMock: vi.fn() }));

vi.mock('@/lib/request-limiter', () => ({
  requestLimiter: { acquire: acquireMock }
}));

vi.mock('@/lib/api-retry', () => ({
  getRetryDelayMs: vi.fn(() => 0),
  shouldRetryRequest: () => shouldRetry()
}));

vi.mock('@/lib/connectivity', () => ({
  reportRequestOutcome: vi.fn()
}));

vi.mock('@/lib/indexeddb', () => ({
  clearUserData: vi.fn().mockResolvedValue(undefined)
}));

vi.mock('react-toastify', () => ({
  toast: { error: vi.fn() }
}));

import { getAPI } from '../api';

/** Axios-ish rejection payload with the expired-token shape api.tsx reads. */
function expiredTokenError() {
  return {
    config: { url: '/api/v1/auth/me' },
    message: 'Request failed with status code 401',
    response: {
      status: 401,
      data: { dev_message: 'invalid or expired token: Token is expired' }
    }
  };
}

describe('api response interceptor — expired token redirect', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    shouldRetry.mockReturnValue(false);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('hard-navigates to / when an auth endpoint returns an expired token', async () => {
    vi.useFakeTimers();
    const replaceMock = vi.fn();
    Object.defineProperty(window, 'location', {
      value: { replace: replaceMock },
      writable: true,
      configurable: true
    });

    // GIVEN: an auth API request that fails with an expired-token 401
    const api = await getAPI({ proxy: true });
    const pending = api.request({
      url: '/api/v1/auth/me',
      adapter: async () => {
        throw expiredTokenError();
      }
    });
    await expect(pending).rejects.toBeInstanceOf(Error);

    // WHEN: the deferred redirect delay elapses
    vi.advanceTimersByTime(1000);

    // THEN: the page hard-navigates to the home route
    expect(replaceMock).toHaveBeenCalledWith('/');
  });
});

describe('api request interceptor — request limiter', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    shouldRetry.mockReturnValue(false);
  });

  it('waits for a limiter slot before dispatching', async () => {
    const release = vi.fn();
    let resolveAcquire: (fn: () => void) => void = () => undefined;
    acquireMock.mockReturnValue(
      new Promise<() => void>(resolve => {
        resolveAcquire = resolve;
      })
    );

    const api = await getAPI({ proxy: true });
    let dispatched = 0;
    const pending = api.request({
      url: '/fhir/Patient',
      adapter: async config => {
        dispatched += 1;
        return { data: {}, status: 200, statusText: 'OK', headers: {}, config };
      }
    });

    await Promise.resolve();
    expect(dispatched).toBe(0);

    resolveAcquire(release);
    await pending;

    expect(dispatched).toBe(1);
    expect(release).toHaveBeenCalledTimes(1);
  });

  it('releases the slot on failure, including a retried GET', async () => {
    const release = vi.fn();
    acquireMock.mockImplementation(() => Promise.resolve(release));
    shouldRetry.mockReturnValueOnce(true).mockReturnValue(false);

    const api = await getAPI({ proxy: true });
    let adapterCalls = 0;
    const pending = api.request({
      method: 'GET',
      url: '/fhir/Patient',
      adapter: async config => {
        adapterCalls += 1;
        // Custom adapters bypass validateStatus, so throw an axios-shaped error.
        throw Object.assign(new Error('server error'), {
          config,
          response: {
            status: 500,
            statusText: 'Server Error',
            headers: {},
            data: {}
          }
        });
      }
    });

    await expect(pending).rejects.toBeInstanceOf(Error);

    // One acquire/release pair for the original attempt, one for the retry.
    expect(adapterCalls).toBe(2);
    expect(acquireMock).toHaveBeenCalledTimes(2);
    expect(release).toHaveBeenCalledTimes(2);
  });
});
