export type ConnectivityStatus = 'stable' | 'unstable' | 'offline';

/** Failures older than this window no longer count toward "unstable". */
export const FAILURE_WINDOW_MS = 30_000;

/** Failures within the window required to flip to "unstable". */
export const UNSTABLE_FAILURE_THRESHOLD = 2;

type Listener = (status: ConnectivityStatus) => void;

const listeners = new Set<Listener>();
let failureTimes: number[] = [];
let forceOffline = false;
let initialized = false;

/** True when the browser reports the network as fully offline. */
function browserIsOffline(): boolean {
  return (
    typeof navigator !== 'undefined' &&
    typeof navigator.onLine === 'boolean' &&
    !navigator.onLine
  );
}

/** Computes the current status from browser state and recorded failures. */
function computeStatus(): ConnectivityStatus {
  if (forceOffline || browserIsOffline()) return 'offline';
  const cutoff = Date.now() - FAILURE_WINDOW_MS;
  const recentFailures = failureTimes.filter(time => time >= cutoff);
  if (recentFailures.length >= UNSTABLE_FAILURE_THRESHOLD) return 'unstable';
  return 'stable';
}

/** Notifies all subscribers of the latest status. */
function emit(): void {
  const status = computeStatus();
  for (const listener of listeners) {
    listener(status);
  }
}

/**
 * Records the outcome of a real request. A success clears the failure
 * window (no intervening success), while a failure is timestamped and
 * counted toward the "unstable" threshold.
 *
 * @param ok - True when the request succeeded.
 */
export function reportRequestOutcome(ok: boolean): void {
  if (ok) {
    failureTimes = [];
  } else {
    failureTimes.push(Date.now());
  }
  emit();
}

/** Returns the current connectivity status. */
export function getStatus(): ConnectivityStatus {
  return computeStatus();
}

/**
 * Subscribes to status changes.
 *
 * @param listener - Called with the new status on every change.
 * @returns An unsubscribe function.
 */
export function subscribe(listener: Listener): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

/**
 * Attaches window online/offline listeners as a hard signal. Idempotent.
 * No-op outside the browser (SSR, tests without a window).
 */
export function initConnectivity(): void {
  if (initialized || typeof window === 'undefined') return;
  initialized = true;
  window.addEventListener('offline', () => {
    forceOffline = true;
    emit();
  });
  window.addEventListener('online', () => {
    forceOffline = false;
    emit();
  });
}
