import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

type ConnectivityModule = typeof import('@/lib/connectivity');

/** Re-imports the module so each test starts with fresh internal state. */
function freshModule(): Promise<ConnectivityModule> {
  vi.resetModules();
  return import('@/lib/connectivity');
}

describe('connectivity', () => {
  let connectivity: ConnectivityModule;

  beforeEach(async () => {
    vi.useFakeTimers();
    vi.setSystemTime(1_000_000);
    connectivity = await freshModule();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it('starts as stable', () => {
    expect(connectivity.getStatus()).toBe('stable');
  });

  it('stays stable after a single failure', () => {
    connectivity.reportRequestOutcome(false);
    expect(connectivity.getStatus()).toBe('stable');
  });

  it('turns unstable after a burst of failures', () => {
    connectivity.reportRequestOutcome(false);
    connectivity.reportRequestOutcome(false);
    expect(connectivity.getStatus()).toBe('unstable');
  });

  it('recovers to stable after a success clears the failure window', () => {
    connectivity.reportRequestOutcome(false);
    connectivity.reportRequestOutcome(false);
    expect(connectivity.getStatus()).toBe('unstable');

    connectivity.reportRequestOutcome(true);
    expect(connectivity.getStatus()).toBe('stable');
  });

  it('expires old failures after the 30s window elapses', () => {
    connectivity.reportRequestOutcome(false);
    connectivity.reportRequestOutcome(false);
    expect(connectivity.getStatus()).toBe('unstable');

    vi.setSystemTime(1_000_000 + 31_000);
    expect(connectivity.getStatus()).toBe('stable');
  });

  it('reports offline when navigator.onLine is false', () => {
    Object.defineProperty(navigator, 'onLine', {
      configurable: true,
      get: () => false
    });
    try {
      expect(connectivity.getStatus()).toBe('offline');
    } finally {
      // jsdom defines onLine on the prototype; deleting the own property
      // restores the prototype getter for subsequent tests.
      Reflect.deleteProperty(navigator, 'onLine');
    }
  });

  it('flips to offline on a window offline event and back on online', () => {
    connectivity.initConnectivity();

    window.dispatchEvent(new Event('offline'));
    expect(connectivity.getStatus()).toBe('offline');

    window.dispatchEvent(new Event('online'));
    expect(connectivity.getStatus()).toBe('stable');
  });

  it('notifies subscribers on status changes', () => {
    const listener = vi.fn();
    connectivity.subscribe(listener);

    connectivity.reportRequestOutcome(false);
    connectivity.reportRequestOutcome(false);

    expect(listener).toHaveBeenLastCalledWith('unstable');
  });

  it('unsubscribe stops notifications', () => {
    const listener = vi.fn();
    const unsubscribe = connectivity.subscribe(listener);
    unsubscribe();

    connectivity.reportRequestOutcome(false);
    connectivity.reportRequestOutcome(false);

    expect(listener).not.toHaveBeenCalled();
  });
});
