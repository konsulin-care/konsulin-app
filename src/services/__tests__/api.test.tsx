import { AxiosError } from 'axios';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const { shouldRetry } = vi.hoisted(() => ({ shouldRetry: vi.fn() }));

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
  it('preserves Axios conflict errors so the editor can identify HTTP 412', async () => {
    const api = await getAPI({ proxy: true });
    const conflict = new AxiosError('Request failed with status code 412');
    const pending = api.request({
      url: '/fhir',
      adapter: config => {
        conflict.config = config;
        conflict.response = {
          data: { resourceType: 'OperationOutcome' },
          status: 412,
          statusText: 'Precondition Failed',
          headers: {},
          config
        };
        return Promise.reject(conflict);
      }
    });
    await expect(pending).rejects.toBe(conflict);
    expect(conflict.response?.status).toBe(412);
  });
});
