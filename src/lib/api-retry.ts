/** Maximum retries per request (1 initial attempt + MAX_RETRY_COUNT retries). */
export const MAX_RETRY_COUNT = 2;

/** Base delay for the first retry, doubled on each subsequent attempt. */
export const BASE_RETRY_DELAY_MS = 500;

/** Maximum random jitter added to each backoff delay. */
export const MAX_JITTER_MS = 200;

/**
 * True when an axios-style error means no HTTP response was received
 * (network-level failure rather than a server response).
 */
export function isNetworkError(error: unknown): boolean {
  if (typeof error !== 'object' || error === null) return false;
  const err = error as { response?: unknown; code?: string };
  return err.response === undefined || err.code === 'ERR_NETWORK';
}

/**
 * Decides whether a failed request should be retried.
 *
 * Only idempotent GET requests are retried, only for network-level failures
 * or server errors (>= 500), and only while the retry budget is available.
 * 4xx responses (including 401/403) are never retried.
 *
 * @param error - The axios error from the failed request.
 * @param config - The request config, used to check the HTTP method.
 * @param retryCount - Number of retries already attempted.
 * @returns True when the request should be retried.
 */
export function shouldRetryRequest(
  error: unknown,
  config: { method?: string } | undefined,
  retryCount: number
): boolean {
  if ((config?.method ?? '').toUpperCase() !== 'GET') return false;
  if (retryCount >= MAX_RETRY_COUNT) return false;
  if (isNetworkError(error)) return true;

  const status = (error as { response?: { status?: unknown } }).response
    ?.status;
  return typeof status === 'number' && status >= 500;
}

/**
 * Returns a random float in [0, 1) using the platform CSPRNG.
 * Provides the jitter for retry backoff without a weak RNG.
 */
function randomUnit(): number {
  const buffer = new Uint32Array(1);
  return crypto.getRandomValues(buffer)[0] / 2 ** 32;
}

/**
 * Computes the backoff delay for a retry attempt: exponential base delay
 * plus bounded random jitter to avoid thundering-herd retries.
 *
 * @param attempt - Zero-based retry attempt index.
 * @returns Delay in milliseconds, in [base, base + MAX_JITTER_MS].
 */
export function getRetryDelayMs(attempt: number): number {
  const base = BASE_RETRY_DELAY_MS * 2 ** attempt;
  return base + randomUnit() * MAX_JITTER_MS;
}
