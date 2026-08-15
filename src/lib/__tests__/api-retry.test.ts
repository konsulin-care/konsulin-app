import {
  BASE_RETRY_DELAY_MS,
  MAX_JITTER_MS,
  MAX_RETRY_COUNT,
  getRetryDelayMs,
  isRateLimited,
  shouldRetryRequest
} from '@/lib/api-retry';
import { afterEach, describe, expect, it, vi } from 'vitest';

/** Build an axios-style error with the given shape. */
function makeError(overrides: Record<string, unknown> = {}): unknown {
  return {
    code: undefined,
    response: undefined,
    ...overrides
  };
}

const GET_CONFIG = { method: 'GET' };
const POST_CONFIG = { method: 'POST' };

/** Mocks crypto.getRandomValues to return a fixed 32-bit fraction. */
function mockRandomValue(fraction: number): void {
  const value = Math.floor(fraction * 2 ** 32);
  vi.spyOn(crypto, 'getRandomValues').mockReturnValue(new Uint32Array([value]));
}

describe('shouldRetryRequest', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('retries GET requests that fail with a network error (no response)', () => {
    expect(shouldRetryRequest(makeError(), GET_CONFIG, 0)).toBe(true);
  });

  it('retries GET requests that fail with ERR_NETWORK', () => {
    const error = makeError({ code: 'ERR_NETWORK' });
    expect(shouldRetryRequest(error, GET_CONFIG, 0)).toBe(true);
  });

  it('retries GET requests that fail with a 5xx status', () => {
    const error = makeError({ response: { status: 503 } });
    expect(shouldRetryRequest(error, GET_CONFIG, 0)).toBe(true);
    expect(
      shouldRetryRequest(
        makeError({ response: { status: 500 } }),
        GET_CONFIG,
        1
      )
    ).toBe(true);
  });

  it('never retries non-GET requests, even on network errors', () => {
    expect(shouldRetryRequest(makeError(), POST_CONFIG, 0)).toBe(false);
    expect(
      shouldRetryRequest(makeError({ code: 'ERR_NETWORK' }), POST_CONFIG, 0)
    ).toBe(false);
  });

  it('never retries 4xx statuses', () => {
    for (const status of [400, 401, 403, 404, 409, 422]) {
      const error = makeError({ response: { status } });
      expect(shouldRetryRequest(error, GET_CONFIG, 0)).toBe(false);
    }
  });

  it('never retries once the retry budget is exhausted', () => {
    expect(shouldRetryRequest(makeError(), GET_CONFIG, MAX_RETRY_COUNT)).toBe(
      false
    );
    expect(
      shouldRetryRequest(makeError(), GET_CONFIG, MAX_RETRY_COUNT + 1)
    ).toBe(false);
  });

  it('retries up to MAX_RETRY_COUNT times', () => {
    expect(
      shouldRetryRequest(makeError(), GET_CONFIG, MAX_RETRY_COUNT - 1)
    ).toBe(true);
  });

  it('retries GET requests that fail with 429 (rate limited)', () => {
    const error = makeError({ response: { status: 429 } });
    expect(shouldRetryRequest(error, GET_CONFIG, 0)).toBe(true);
  });

  it('never retries 429 on non-GET requests', () => {
    const error = makeError({ response: { status: 429 } });
    expect(shouldRetryRequest(error, POST_CONFIG, 0)).toBe(false);
  });

  it('never retries 429 once the retry budget is exhausted', () => {
    const error = makeError({ response: { status: 429 } });
    expect(shouldRetryRequest(error, GET_CONFIG, MAX_RETRY_COUNT)).toBe(false);
    expect(shouldRetryRequest(error, GET_CONFIG, MAX_RETRY_COUNT + 1)).toBe(
      false
    );
  });

  it('identifies 429 responses as rate-limited', () => {
    expect(isRateLimited(makeError({ response: { status: 429 } }))).toBe(true);
    expect(isRateLimited(makeError({ response: { status: 503 } }))).toBe(false);
    expect(isRateLimited(makeError())).toBe(false);
  });

  it('does not retry when the request config is missing', () => {
    expect(shouldRetryRequest(makeError(), undefined, 0)).toBe(false);
  });

  it('does not retry when the method is unknown', () => {
    expect(shouldRetryRequest(makeError(), {}, 0)).toBe(false);
  });
});

describe('getRetryDelayMs', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('returns the base delay for the first attempt without jitter', () => {
    mockRandomValue(0);
    expect(getRetryDelayMs(0)).toBe(BASE_RETRY_DELAY_MS);
  });

  it('exponential backoff: doubles the base delay each attempt', () => {
    mockRandomValue(0);
    expect(getRetryDelayMs(1)).toBe(BASE_RETRY_DELAY_MS * 2);
    expect(getRetryDelayMs(2)).toBe(BASE_RETRY_DELAY_MS * 4);
  });

  it('is monotonic across attempts', () => {
    for (let attempt = 0; attempt < 4; attempt++) {
      const current = getRetryDelayMs(attempt);
      const next = getRetryDelayMs(attempt + 1);
      expect(next).toBeGreaterThan(current);
    }
  });

  it('is bounded by base delay plus max jitter', () => {
    mockRandomValue(0.9999);
    expect(getRetryDelayMs(0)).toBeLessThanOrEqual(
      BASE_RETRY_DELAY_MS + MAX_JITTER_MS
    );
    expect(getRetryDelayMs(0)).toBeGreaterThanOrEqual(BASE_RETRY_DELAY_MS);
  });

  it('honors the Retry-After seconds header over exponential backoff', () => {
    const error = makeError({
      response: { status: 429, headers: { 'retry-after': '5' } }
    });
    expect(getRetryDelayMs(0, error)).toBe(5000);
  });

  it('honors the Retry-After HTTP-date header', () => {
    const future = new Date(Date.now() + 60_000).toUTCString();
    const error = makeError({
      response: { status: 429, headers: { 'retry-after': future } }
    });
    const delay = getRetryDelayMs(0, error);
    expect(delay).toBeGreaterThan(55_000);
    expect(delay).toBeLessThanOrEqual(61_000);
  });

  it('falls back to exponential backoff when a 429 carries no Retry-After header', () => {
    mockRandomValue(0);
    const error = makeError({ response: { status: 429 } });
    expect(getRetryDelayMs(0, error)).toBe(BASE_RETRY_DELAY_MS);
  });
});
