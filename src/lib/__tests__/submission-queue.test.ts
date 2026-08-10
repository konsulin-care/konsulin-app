import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { PendingSubmission } from '@/lib/indexeddb';

// We must mock the IDB module before importing the queue.
vi.mock('@/lib/indexeddb', () => ({
  STORES: { pendingSubmissions: 'pending_submissions' },
  dbSet: vi.fn(),
  dbDelete: vi.fn(),
  dbGetAll: vi.fn(),
  dbGetAllKeys: vi.fn()
}));

import { dbDelete, dbGetAll, dbGetAllKeys, dbSet } from '@/lib/indexeddb';
import {
  enqueueSubmission,
  listPendingSubmissions,
  listenForSyncReplay,
  pendingCount,
  registerBackgroundSync,
  registerSubmissionHandler,
  removeSubmission,
  replayPendingSubmissions
} from '@/lib/submission-queue';

const mockDbSet = vi.mocked(dbSet);
const mockDbDelete = vi.mocked(dbDelete);
const mockDbGetAll = vi.mocked(dbGetAll);
const mockDbGetAllKeys = vi.mocked(dbGetAllKeys);

const storeName = 'pending_submissions';

function makeItem(
  overrides: Partial<PendingSubmission> = {}
): PendingSubmission {
  return {
    id: 'item-1',
    ownerId: '',
    kind: 'assessment',
    payload: {},
    createdAt: 1,
    attempts: 0,
    ...overrides
  };
}

/** Stubs navigator.serviceWorker and returns an emit helper for messages. */
function stubServiceWorker() {
  const messageHandlers: Array<(event: MessageEvent) => void> = [];
  const stub = {
    addEventListener: vi.fn(
      (_type: string, handler: (event: MessageEvent) => void) => {
        messageHandlers.push(handler);
      }
    ),
    removeEventListener: vi.fn(
      (_type: string, handler: (event: MessageEvent) => void) => {
        const index = messageHandlers.indexOf(handler);
        if (index !== -1) messageHandlers.splice(index, 1);
      }
    )
  };
  Object.defineProperty(navigator, 'serviceWorker', {
    configurable: true,
    value: stub
  });
  return {
    emit: (type: string, data?: unknown): void => {
      for (const handler of messageHandlers) {
        handler({ data } as MessageEvent);
      }
    }
  };
}

describe('submission queue', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('enqueueSubmission', () => {
    it('stores an entry with generated id, kind, payload and zero attempts', async () => {
      mockDbSet.mockResolvedValue();

      const entry = await enqueueSubmission(
        'assessment',
        { item: [{ answer: 1 }] },
        'guest-1'
      );

      expect(mockDbSet).toHaveBeenCalledWith(storeName, entry);
      expect(entry).toMatchObject({
        ownerId: 'guest-1',
        kind: 'assessment',
        payload: { item: [{ answer: 1 }] },
        attempts: 0
      });
      expect(entry.id).toBeTypeOf('string');
      expect(entry.createdAt).toBeTypeOf('number');
      expect(entry.id.length).toBeGreaterThan(0);
    });
  });

  describe('listPendingSubmissions', () => {
    it('returns all stored pending submissions', async () => {
      const items = [makeItem({ id: 'a' }), makeItem({ id: 'b' })];
      mockDbGetAll.mockResolvedValue(items);

      await expect(listPendingSubmissions()).resolves.toEqual(items);
      expect(mockDbGetAll).toHaveBeenCalledWith(storeName);
    });
  });

  describe('pendingCount', () => {
    it('counts stored keys', async () => {
      mockDbGetAllKeys.mockResolvedValue(['a', 'b', 'c']);

      await expect(pendingCount()).resolves.toBe(3);
      expect(mockDbGetAllKeys).toHaveBeenCalledWith(storeName);
    });
  });

  describe('removeSubmission', () => {
    it('deletes the entry by id', async () => {
      mockDbDelete.mockResolvedValue();

      await removeSubmission('item-1');

      expect(mockDbDelete).toHaveBeenCalledWith(storeName, 'item-1');
    });
  });

  describe('replayPendingSubmissions', () => {
    it('deletes a submission after its handler succeeds', async () => {
      const handler = vi.fn<() => Promise<void>>().mockResolvedValue();
      registerSubmissionHandler('assessment', handler);
      mockDbGetAll.mockResolvedValue([
        makeItem({ id: 'a', payload: { q: 1 } })
      ]);
      mockDbDelete.mockResolvedValue();

      await replayPendingSubmissions();

      expect(handler).toHaveBeenCalledWith({ q: 1 });
      expect(mockDbDelete).toHaveBeenCalledWith(storeName, 'a');
      // No re-put with incremented attempts on success.
      expect(mockDbSet).not.toHaveBeenCalled();
    });

    it('keeps the submission and increments attempts when the handler fails', async () => {
      registerSubmissionHandler(
        'assessment',
        vi
          .fn<() => Promise<void>>()
          .mockRejectedValue(new Error('network down'))
      );
      mockDbGetAll.mockResolvedValue([makeItem({ id: 'a', attempts: 2 })]);
      mockDbSet.mockResolvedValue();

      await replayPendingSubmissions();

      expect(mockDbDelete).not.toHaveBeenCalled();
      expect(mockDbSet).toHaveBeenCalledWith(
        storeName,
        expect.objectContaining({ id: 'a', attempts: 3 })
      );
    });

    it('skips submissions whose kind has no registered handler', async () => {
      mockDbGetAll.mockResolvedValue([
        makeItem({ id: 'a', kind: 'unknown-kind' })
      ]);

      await expect(replayPendingSubmissions()).resolves.toBeUndefined();

      expect(mockDbDelete).not.toHaveBeenCalled();
      expect(mockDbSet).not.toHaveBeenCalled();
    });
  });

  describe('listenForSyncReplay', () => {
    it('replays the queue when a SYNC_REPLAY message arrives', async () => {
      mockDbGetAll.mockResolvedValue([]);
      const { emit } = stubServiceWorker();

      listenForSyncReplay();
      emit('message', { type: 'SYNC_REPLAY' });

      await vi.waitFor(() => {
        expect(mockDbGetAll).toHaveBeenCalledWith(storeName);
      });
    });

    it('ignores unrelated messages', async () => {
      mockDbGetAll.mockResolvedValue([]);
      const { emit } = stubServiceWorker();

      listenForSyncReplay();
      emit('message', { type: 'SOMETHING_ELSE' });

      await new Promise(resolve => setTimeout(resolve, 10));
      expect(mockDbGetAll).not.toHaveBeenCalled();
    });

    it('returns a no-op unsubscribe when serviceWorker is missing', () => {
      Reflect.deleteProperty(navigator, 'serviceWorker');
      const unsubscribe = listenForSyncReplay();
      expect(typeof unsubscribe).toBe('function');
    });
  });

  describe('registerBackgroundSync', () => {
    it('registers the replay tag when SyncManager is supported', async () => {
      const syncRegister = vi.fn<() => Promise<void>>().mockResolvedValue();
      Object.defineProperty(navigator, 'serviceWorker', {
        configurable: true,
        value: {
          ready: Promise.resolve({ sync: { register: syncRegister } })
        }
      });

      await registerBackgroundSync();

      expect(syncRegister).toHaveBeenCalledWith('replay-pending');
    });

    it('no-ops when SyncManager is unavailable', async () => {
      Object.defineProperty(navigator, 'serviceWorker', {
        configurable: true,
        value: { ready: Promise.resolve({}) }
      });

      await expect(registerBackgroundSync()).resolves.toBeUndefined();
    });

    it('no-ops when navigator.serviceWorker is missing', async () => {
      Reflect.deleteProperty(navigator, 'serviceWorker');

      await expect(registerBackgroundSync()).resolves.toBeUndefined();
    });
  });
});
