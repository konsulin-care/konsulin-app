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
 * True when the server rejected the request with 429 Too Many Requests.
 *
 * 429 is transient (rate limiting) and safe to retry for idempotent GETs;
 * callers can use this to distinguish rate limits from other 4xx failures.
 *
 * @param error - The axios error from the failed request.
 * @returns True when the response status is 429.
 */
export function isRateLimited(error: unknown): boolean {
  if (typeof error !== 'object' || error === null) return false;
  const status = (error as { response?: { status?: unknown } }).response
    ?.status;
  return status === 429;
}

/**
 * Reads the `Retry-After` header (seconds or HTTP-date) from a failed
 * response as a delay in milliseconds, or null when absent or unparseable.
 *
 * @param error - The axios error carrying the response headers.
 * @returns Delay in milliseconds, or null when no usable header exists.
 */
function retryAfterDelayMs(error?: unknown): number | null {
  if (typeof error !== 'object' || error === null) return null;
  const headers = (error as { response?: { headers?: unknown } }).response
    ?.headers;
  if (typeof headers !== 'object' || headers === null) return null;
  const record = headers as Record<string, unknown>;
  const raw = record['retry-after'] ?? record['Retry-After'];
  if (typeof raw !== 'string' && typeof raw !== 'number') return null;
  const value = String(raw).trim();
  if (!value) return null;

  // Seconds form: `Retry-After: 120`.
  if (/^\d+$/.test(value)) return Number(value) * 1000;

  // HTTP-date form: `Retry-After: Wed, 21 Oct 2026 07:28:00 GMT`.
  const dateMs = Date.parse(value);
  if (Number.isNaN(dateMs)) return null;
  return Math.max(0, dateMs - Date.now());
}

/**
 * Decides whether a failed request should be retried.
 *
 * Only idempotent GET requests are retried, only for network-level failures,
 * server errors (>= 500), or 429 rate limits, and only while the retry
 * budget is available. Other 4xx responses (including 401/403) are never
 * retried.
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
  if (isRateLimited(error)) return true;

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
 * plus bounded random jitter to avoid thundering-herd retries. When the
 * failed response carries a `Retry-After` header (429), the server-specified
 * delay takes precedence so the client waits out the rate-limit window.
 *
 * @param attempt - Zero-based retry attempt index.
 * @param error - Optional axios error whose response may carry Retry-After.
 * @returns Delay in milliseconds, honoring Retry-After when present.
 */
export function getRetryDelayMs(attempt: number, error?: unknown): number {
  const retryAfter = retryAfterDelayMs(error);
  if (retryAfter !== null) return retryAfter;

  const base = BASE_RETRY_DELAY_MS * 2 ** attempt;
  return base + randomUnit() * MAX_JITTER_MS;
}
