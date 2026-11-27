import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { createRequestLimiter, type ReleaseSlot } from '../request-limiter';

/** Flushes pending microtasks so queued promises can settle. */
async function flush(): Promise<void> {
  await Promise.resolve();
  await Promise.resolve();
}

describe('createRequestLimiter', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('admits the burst, then refills at the configured rate', async () => {
    const limiter = createRequestLimiter({ maxInFlight: 100 });
    const releases: ReleaseSlot[] = [];
    const settled: number[] = [];

    for (let i = 0; i < 16; i += 1) {
      void limiter.acquire().then(release => {
        settled.push(i);
        releases.push(release);
      });
    }
    await flush();

    // 15 tokens are available immediately; the 16th waits for a refill.
    expect(settled).toStrictEqual([...Array(15).keys()]);

    await vi.advanceTimersByTimeAsync(67);
    expect(settled).toHaveLength(16);
    releases.forEach(release => release());
  });

  it('caps in-flight requests and frees exactly one slot per release', async () => {
    const limiter = createRequestLimiter();
    const releases: ReleaseSlot[] = [];
    for (let i = 0; i < 6; i += 1) {
      releases.push(await limiter.acquire());
    }

    let seventhAdmitted = false;
    void limiter.acquire().then(release => {
      seventhAdmitted = true;
      releases.push(release);
    });
    await flush();
    expect(seventhAdmitted).toBe(false);

    // Releasing twice must free a single slot, not two.
    const first = releases[0];
    first();
    first();
    await flush();
    expect(seventhAdmitted).toBe(true);

    let eighthAdmitted = false;
    void limiter.acquire().then(() => {
      eighthAdmitted = true;
    });
    await flush();
    expect(eighthAdmitted).toBe(false);

    releases.slice(1).forEach(release => release());
    await flush();
    expect(eighthAdmitted).toBe(true);
  });

  it('serves queued callers in FIFO order', async () => {
    const limiter = createRequestLimiter({ capacity: 10, maxInFlight: 1 });
    const order: string[] = [];
    const pending: ReleaseSlot[] = [];
    const first = await limiter.acquire();

    void limiter.acquire().then(release => {
      order.push('second');
      pending.push(release);
    });
    void limiter.acquire().then(release => {
      order.push('third');
      pending.push(release);
    });
    await flush();
    expect(order).toStrictEqual([]);

    first();
    await flush();
    expect(order).toStrictEqual(['second']);

    pending.shift()?.();
    await flush();
    expect(order).toStrictEqual(['second', 'third']);
  });
});
