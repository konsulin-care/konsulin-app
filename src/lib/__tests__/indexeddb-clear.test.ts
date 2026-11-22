import { ANONYMOUS_SESSION_IDENTIFIER_SYSTEM } from '@/constants/anonymous-session';
import type { PendingSubmission } from '@/lib/indexeddb/types';
import { STORES } from '@/lib/indexeddb/types';
import { beforeEach, describe, expect, it, vi } from 'vitest';

interface FakeRequest {
  result: unknown;
  error: unknown;
  onsuccess: (() => void) | null;
  onerror: (() => void) | null;
}

interface FakeTransaction {
  oncomplete: (() => void) | null;
  onerror: ((event: unknown) => void) | null;
  objectStore: () => {
    openCursor: () => FakeRequest;
  };
}

const mockDbState = vi.hoisted(() => {
  const stores = new Map<string, Map<string, unknown>>();
  const encodeKey = (key: unknown): string =>
    Array.isArray(key) ? JSON.stringify(key) : String(key);
  return { stores, encodeKey };
});

vi.mock('@/lib/indexeddb/connection', () => {
  /** Returns the in-memory store for a store name, creating it if needed. */
  const dataFor = (name: string): Map<string, unknown> => {
    let data = mockDbState.stores.get(name);
    if (!data) {
      data = new Map<string, unknown>();
      mockDbState.stores.set(name, data);
    }
    return data;
  };

  /** Builds a request whose success handler fires on the next tick. */
  const makeDeleteRequest = (name: string, key: unknown): FakeRequest => {
    const request: FakeRequest = {
      result: undefined,
      error: null,
      onsuccess: null,
      onerror: null
    };
    setTimeout(() => {
      dataFor(name).delete(mockDbState.encodeKey(key));
      if (request.onsuccess) request.onsuccess();
    }, 0);
    return request;
  };

  /** Opens a cursor that walks a snapshot of the store and honors deletes. */
  const openCursor = (
    name: string,
    transaction: FakeTransaction
  ): FakeRequest => {
    const request: FakeRequest = {
      result: null,
      error: null,
      onsuccess: null,
      onerror: null
    };
    const entries = [...dataFor(name).entries()];
    let index = 0;

    const advance = (): void => {
      if (index >= entries.length) {
        request.result = null;
        if (request.onsuccess) request.onsuccess();
        if (transaction.oncomplete) transaction.oncomplete();
        return;
      }
      const [key, value] = entries[index];
      index += 1;
      request.result = {
        key,
        value,
        delete: () => {
          dataFor(name).delete(key);
        },
        continue: () => {
          setTimeout(advance, 0);
        }
      };
      if (request.onsuccess) request.onsuccess();
    };

    setTimeout(advance, 0);
    return request;
  };

  /** Builds a transaction that exposes a single cursor-backed store. */
  const makeTransaction = (name: string): FakeTransaction => {
    const transaction: FakeTransaction = {
      oncomplete: null,
      onerror: null,
      objectStore: () => ({
        openCursor: () => openCursor(name, transaction)
      })
    };
    return transaction;
  };

  const db = {
    transaction: (name: string) => makeTransaction(name)
  };

  return {
    openDB: () => Promise.resolve(db),
    getStore: (_db: unknown, name: string) => ({
      delete: (key: unknown) => makeDeleteRequest(name, key)
    })
  };
});

import { clearUserData } from '@/lib/indexeddb/crud';

/** Builds a pending submission with an empty ownerId (legacy shape). */
function makeItem(
  id: string,
  payload: unknown,
  kind = 'questionnaire-response'
): PendingSubmission {
  return {
    id,
    ownerId: '',
    kind,
    payload,
    createdAt: 1,
    attempts: 0
  };
}

/** Stores pending submissions keyed by id for the next cleanup call. */
function seedPending(items: PendingSubmission[]): Map<string, unknown> {
  const pending = new Map<string, unknown>();
  for (const item of items) pending.set(item.id, item);
  mockDbState.stores.set(STORES.pendingSubmissions, pending);
  return pending;
}

describe('clearUserData pending submissions', () => {
  beforeEach(() => {
    mockDbState.stores.clear();
  });

  it('deletes only pending items owned by the supplied queue owner key', async () => {
    const pending = seedPending([
      makeItem('patient-1', {
        author: { reference: 'Patient/p1' }
      }),
      makeItem('patient-2', {
        author: { reference: 'Patient/p2' }
      }),
      makeItem('guest-1', {
        identifier: [
          {
            system: ANONYMOUS_SESSION_IDENTIFIER_SYSTEM,
            value: 'guest-1'
          }
        ]
      }),
      makeItem(
        'soap-1',
        {
          entry: [
            {
              resource: {
                author: { reference: 'Practitioner/x1' }
              }
            }
          ]
        },
        'soap-bundle'
      )
    ]);

    await clearUserData('user-1', { queueOwnerKey: 'Patient/p1' });

    expect([...pending.keys()]).toEqual(['patient-2', 'guest-1', 'soap-1']);
  });

  it('uses the payload author rather than the stored ownerId', async () => {
    const pending = seedPending([
      {
        ...makeItem('stale-owner', { author: { reference: 'Patient/p2' } }),
        ownerId: 'Patient/p1'
      },
      makeItem('patient-1', { author: { reference: 'Patient/p1' } })
    ]);

    await clearUserData('user-1', { queueOwnerKey: 'Patient/p1' });

    expect([...pending.keys()]).toEqual(['stale-owner']);
  });

  it('deletes no pending items when no queue owner key is supplied', async () => {
    const pending = seedPending([
      makeItem('patient-1', { author: { reference: 'Patient/p1' } }),
      makeItem('patient-2', { author: { reference: 'Patient/p2' } })
    ]);

    await clearUserData('user-1');

    expect([...pending.keys()]).toEqual(['patient-1', 'patient-2']);
  });
});
