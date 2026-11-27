/** Token bucket capacity: how many requests may start in a burst. */
export const RATE_LIMIT_CAPACITY = 15;

/** Sustained request rate per second once the burst budget is spent. */
export const RATE_LIMIT_PER_SECOND = 15;

/** Maximum number of requests allowed to be in flight at the same time. */
export const MAX_IN_FLIGHT = 6;

/** Overrides for {@link createRequestLimiter}, mainly used in tests. */
export interface RequestLimiterOptions {
  /** Burst size. Defaults to {@link RATE_LIMIT_CAPACITY}. */
  capacity?: number;
  /** Sustained rate per second. Defaults to {@link RATE_LIMIT_PER_SECOND}. */
  perSecond?: number;
  /** Concurrent request ceiling. Defaults to {@link MAX_IN_FLIGHT}. */
  maxInFlight?: number;
  /** Clock in milliseconds. Defaults to `Date.now`. */
  now?: () => number;
}

/** Release function returned by {@link RequestLimiter.acquire}. Idempotent. */
export type ReleaseSlot = () => void;

/** Gate that queues callers until both a token and a slot are available. */
export interface RequestLimiter {
  /**
   * Waits for a token and an in-flight slot.
   *
   * @returns A promise resolving to the release function for the slot.
   */
  acquire(): Promise<ReleaseSlot>;
}

/** A queued caller waiting for a token and a slot. */
interface Waiter {
  resolve: (release: ReleaseSlot) => void;
}

/**
 * Creates a request limiter combining a token bucket with an in-flight cap.
 *
 * A caller is admitted only when a token is available and fewer than
 * `maxInFlight` requests are outstanding. Waiters are served strictly FIFO,
 * so a burst is spread out instead of being rejected by the server's own
 * rate limiter.
 *
 * @param options - Optional capacity, rate, concurrency and clock overrides.
 * @returns A limiter whose `acquire` resolves to an idempotent release.
 */
export function createRequestLimiter(
  options: RequestLimiterOptions = {}
): RequestLimiter {
  const capacity = options.capacity ?? RATE_LIMIT_CAPACITY;
  const perSecond = options.perSecond ?? RATE_LIMIT_PER_SECOND;
  const maxInFlight = options.maxInFlight ?? MAX_IN_FLIGHT;
  const now = options.now ?? (() => Date.now());

  const queue: Waiter[] = [];
  let tokens = capacity;
  let lastRefill = now();
  let inFlight = 0;
  let timer: ReturnType<typeof setTimeout> | null = null;

  /** Tops the bucket up for the time elapsed since the last refill. */
  const refill = (): void => {
    const current = now();
    const elapsed = current - lastRefill;
    if (elapsed <= 0) return;
    tokens = Math.min(capacity, tokens + (elapsed / 1000) * perSecond);
    lastRefill = current;
  };

  /** Milliseconds until the next token becomes available. */
  const msUntilNextToken = (): number => {
    if (tokens >= 1) return 0;
    return Math.ceil(((1 - tokens) / perSecond) * 1000);
  };

  /** Admitted callers get a function that frees exactly one slot. */
  const grant = (): ReleaseSlot => {
    inFlight += 1;
    let released = false;
    return () => {
      if (released) return;
      released = true;
      inFlight -= 1;
      drain();
    };
  };

  /**
   * Admits as many queued waiters as tokens and slots allow, then schedules a
   * single wake-up for the next token when slots are available but tokens are
   * not. Releases trigger the same drain, so no timer is needed while the
   * in-flight cap is the binding constraint.
   */
  function drain(): void {
    refill();
    while (queue.length > 0 && inFlight < maxInFlight && tokens >= 1) {
      const waiter = queue.shift();
      if (!waiter) break;
      tokens -= 1;
      waiter.resolve(grant());
    }
    if (timer !== null) {
      clearTimeout(timer);
      timer = null;
    }
    if (queue.length > 0 && inFlight < maxInFlight) {
      timer = setTimeout(() => {
        timer = null;
        drain();
      }, msUntilNextToken());
    }
  }

  return {
    acquire: () =>
      new Promise<ReleaseSlot>(resolve => {
        queue.push({ resolve });
        drain();
      })
  };
}

/**
 * Process-wide limiter shared by every axios instance, so parallel caches and
 * ad-hoc fetches cannot combine into a burst the backend rejects with 429.
 */
export const requestLimiter: RequestLimiter = createRequestLimiter();
