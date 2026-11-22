/* eslint-disable @typescript-eslint/no-floating-promises */
import {
  dbDelete,
  dbGetAll,
  dbGetAllKeys,
  dbSet,
  STORES,
  type PendingSubmission
} from '@/lib/indexeddb';

/** Background Sync tag used to trigger a replay when connectivity returns. */
export const SYNC_TAG = 'replay-pending';

/** Message the service worker broadcasts when a sync event fires. */
export const SYNC_REPLAY_MESSAGE = 'SYNC_REPLAY';

/** Minimal SyncManager surface used to request a background replay. */
type SyncManagerLike = {
  register(tag: string): Promise<void>;
};

/** Minimal Web Locks surface used to serialize replay across tabs. */
type LockManagerLike = {
  request(
    name: string,
    options: { ifAvailable: boolean },
    callback: (lock: unknown) => Promise<void>
  ): Promise<void>;
};

/** Name of the lock that guards a queue replay. */
const REPLAY_LOCK = 'konsulin-replay';

/** Shared replay promise used when the Web Locks API is unavailable. */
let replayInFlight: Promise<void> | null = null;

/** Handlers replay a queued payload and reject when it still cannot be sent. */
type SubmissionHandler = (payload: unknown) => Promise<void>;

const handlers = new Map<string, SubmissionHandler>();

/** Generates a unique id for a queued submission, timestamped with createdAt. */
function generateId(createdAt: number): string {
  if (
    typeof crypto !== 'undefined' &&
    typeof crypto.randomUUID === 'function'
  ) {
    return crypto.randomUUID();
  }
  // Fallback for engines without crypto.randomUUID: CSPRNG segment.
  if (
    typeof crypto !== 'undefined' &&
    typeof crypto.getRandomValues === 'function'
  ) {
    const buffer = crypto.getRandomValues(new Uint32Array(2));
    return `pending-${createdAt}-${buffer[0].toString(36)}${buffer[1].toString(36)}`;
  }
  return `pending-${createdAt}`;
}

/**
 * Stores a submission that failed to send so it can be replayed later.
 * Also registers a background sync tag where supported (best effort).
 */
export async function enqueueSubmission(
  kind: string,
  payload: unknown,
  ownerId = ''
): Promise<PendingSubmission> {
  const createdAt = Date.now();
  const entry: PendingSubmission = {
    id: generateId(createdAt),
    ownerId,
    kind,
    payload,
    createdAt,
    attempts: 0
  };
  await dbSet(STORES.pendingSubmissions, entry);
  registerBackgroundSync();
  return entry;
}

/** Removes a queued submission by id. */
export async function removeSubmission(id: string): Promise<void> {
  await dbDelete(STORES.pendingSubmissions, id);
}

/** Lists all queued submissions. */
export function listPendingSubmissions(): Promise<PendingSubmission[]> {
  return dbGetAll<PendingSubmission>(STORES.pendingSubmissions);
}

/** Returns the number of queued submissions. */
export async function pendingCount(): Promise<number> {
  const keys = await dbGetAllKeys(STORES.pendingSubmissions);
  return keys.length;
}

/** Registers the replay handler used for a submission kind. */
export function registerSubmissionHandler(
  kind: string,
  handler: SubmissionHandler
): void {
  handlers.set(kind, handler);
}

/** Returns the Web Locks manager, or null when the API is unavailable. */
function getLockManager(): LockManagerLike | null {
  if (typeof navigator === 'undefined') return null;
  const locks = (navigator as Navigator & { locks?: LockManagerLike }).locks;
  if (!locks || typeof locks.request !== 'function') return null;
  return locks;
}

/**
 * Drains the queue once: replays every item through its registered handler.
 * Successful submissions are removed; failed ones keep their entry
 * with an incremented attempt count. Unknown kinds are skipped.
 */
async function drainQueue(): Promise<void> {
  const items = await listPendingSubmissions();
  for (const item of items) {
    const handler = handlers.get(item.kind);
    if (!handler) continue;
    try {
      await handler(item.payload);
      await removeSubmission(item.id);
    } catch (error) {
      console.warn('[submission-queue] replay failed for', item.id, error);
      await dbSet(STORES.pendingSubmissions, {
        ...item,
        attempts: item.attempts + 1
      });
    }
  }
}

/**
 * Replays all queued submissions through their registered handlers.
 * Serialized across tabs with the Web Locks API (`ifAvailable`), falling
 * back to a shared module-level promise when the API is unavailable.
 * Returns without sending when another tab already holds the lock.
 */
export async function replayPendingSubmissions(): Promise<void> {
  const locks = getLockManager();
  if (locks) {
    await locks.request(REPLAY_LOCK, { ifAvailable: true }, async lock => {
      if (!lock) return;
      await drainQueue();
    });
    return;
  }

  if (replayInFlight !== null) {
    await replayInFlight;
    return;
  }

  const run = drainQueue().finally(() => {
    replayInFlight = null;
  });
  replayInFlight = run;
  await run;
}

/**
 * Requests a background sync replay where SyncManager is supported.
 * Silently no-ops on browsers without it (e.g. iOS Safari).
 */
export async function registerBackgroundSync(): Promise<void> {
  try {
    if (
      typeof navigator === 'undefined' ||
      !navigator.serviceWorker ||
      !('serviceWorker' in navigator)
    ) {
      return;
    }
    const registration = await navigator.serviceWorker.ready;
    if (!('sync' in registration)) return;
    const withSync = registration as unknown as { sync: SyncManagerLike };
    await withSync.sync.register(SYNC_TAG);
  } catch {
    // Best effort only — the online event and page-load replay are the baseline.
  }
}

/**
 * Listens for SYNC_REPLAY messages from the service worker and replays
 * the queue. Returns an unsubscribe function.
 */
export function listenForSyncReplay(): () => void {
  if (typeof navigator === 'undefined' || !navigator.serviceWorker) {
    return () => {
      // No service worker available — nothing to unsubscribe.
    };
  }

  /** Replays the queue when the service worker broadcasts a sync message. */
  const onMessage = (event: MessageEvent): void => {
    const data = event.data as { type?: string } | null;
    if (data?.type === SYNC_REPLAY_MESSAGE) {
      replayPendingSubmissions();
    }
  };
  navigator.serviceWorker.addEventListener('message', onMessage);
  return () => {
    navigator.serviceWorker.removeEventListener('message', onMessage);
  };
}
