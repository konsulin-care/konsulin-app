'use client';

import ParkedSubmissionsDialog from '@/components/pwa/parked-submissions-dialog';
import { useAuth } from '@/context/auth/authContext';
import { useTranslations } from '@/i18n';
import type { PendingSubmission } from '@/lib/indexeddb';
import { ownerKeyFor, type ReplayIdentity } from '@/lib/submission-owner';
import {
  listOwnedSubmissions,
  listenForSyncReplay,
  removeSubmission,
  replayPendingSubmissions,
  retrySubmission
} from '@/lib/submission-queue';
import { registerSubmissionReplayHandlers } from '@/lib/submission-replay';
import { useCallback, useEffect, useMemo, useState } from 'react';

/** Number of queued submissions and a manual retry trigger. */
export type PendingSubmissionsState = {
  waitingCount: number;
  parkedCount: number;
  parkedItems: PendingSubmission[];
  syncNow: () => Promise<void>;
  retryParked: (id: string) => Promise<void>;
  discardParked: (id: string) => Promise<void>;
};

/** Owner-scoped queue snapshot split into waiting and parked items. */
type OwnedSnapshot = {
  waitingCount: number;
  parkedCount: number;
  parkedItems: PendingSubmission[];
};

/** Counts waiting and parked items for the current owner's queue. */
async function loadSnapshot(identity: ReplayIdentity): Promise<OwnedSnapshot> {
  const items = await listOwnedSubmissions(identity.ownerKey, identity.isGuest);
  const parkedItems = items.filter(item => item.status === 'parked');
  return {
    waitingCount: items.length - parkedItems.length,
    parkedCount: parkedItems.length,
    parkedItems
  };
}

/**
 * Tracks queued offline submissions owned by the current identity.
 * Waits for auth to resolve, registers replay handlers and the SW message
 * listener once, replays on page load and on the online event, and exposes
 * the current owner's waiting and parked items plus manual retry actions.
 *
 * @returns Waiting and parked counts, parked items and manual actions.
 */
export function usePendingSubmissions(): PendingSubmissionsState {
  const { isLoading, state } = useAuth();
  const [waitingCount, setWaitingCount] = useState(0);
  const [parkedCount, setParkedCount] = useState(0);
  const [parkedItems, setParkedItems] = useState<PendingSubmission[]>([]);

  const identity = useMemo<ReplayIdentity>(() => {
    const userInfo = state.userInfo;
    return {
      ownerKey: ownerKeyFor({
        isAuthenticated: state.isAuthenticated,
        role: userInfo.role_name,
        fhirId: userInfo.fhirId
      }),
      isGuest: !state.isAuthenticated
    };
  }, [state.isAuthenticated, state.userInfo]);

  /** Refreshes the counts and parked items from the current owner's queue. */
  const refresh = useCallback(async (target: ReplayIdentity): Promise<void> => {
    const snapshot = await loadSnapshot(target);
    setWaitingCount(snapshot.waitingCount);
    setParkedCount(snapshot.parkedCount);
    setParkedItems(snapshot.parkedItems);
  }, []);

  /** Replays the current owner's queue and refreshes the banner. */
  const syncNow = useCallback(async (): Promise<void> => {
    if (isLoading) return;
    await replayPendingSubmissions(identity);
    await refresh(identity);
  }, [identity, isLoading, refresh]);

  /** Resets one parked item to waiting, replays it and refreshes the banner. */
  const retryParked = useCallback(
    async (id: string): Promise<void> => {
      await retrySubmission(id, identity);
      await refresh(identity);
    },
    [identity, refresh]
  );

  /** Removes one parked item from this device and refreshes the banner. */
  const discardParked = useCallback(
    async (id: string): Promise<void> => {
      await removeSubmission(id);
      await refresh(identity);
    },
    [identity, refresh]
  );

  useEffect(() => {
    // Wait for auth to resolve before replaying anything.
    if (isLoading) return () => {};

    registerSubmissionReplayHandlers();
    const unsubscribe = listenForSyncReplay(() => identity);

    let cancelled = false;

    /** Refreshes the banner unless the effect was cleaned up. */
    const refreshIfActive = async (): Promise<void> => {
      const snapshot = await loadSnapshot(identity);
      if (cancelled) return;
      setWaitingCount(snapshot.waitingCount);
      setParkedCount(snapshot.parkedCount);
      setParkedItems(snapshot.parkedItems);
    };

    /** Replays queued submissions for this identity, then refreshes counts. */
    const replay = async (): Promise<void> => {
      await replayPendingSubmissions(identity);
      await refreshIfActive();
    };

    // Page-load replay: flush anything queued while the app was offline.
    // skipcq: JS-0098 - fire-and-forget replay on page load
    void replay();

    /** Fires a replay when the browser comes back online. */
    const onOnline = (): void => {
      // skipcq: JS-0098 - fire-and-forget replay on reconnect
      void replay();
    };
    window.addEventListener('online', onOnline);

    return () => {
      cancelled = true;
      window.removeEventListener('online', onOnline);
      unsubscribe();
    };
  }, [identity, isLoading]);

  return {
    waitingCount,
    parkedCount,
    parkedItems,
    syncNow,
    retryParked,
    discardParked
  };
}

/**
 * Banner showing waiting and parked offline submissions for the current owner.
 * Hides each part when its count is zero and renders nothing when both are 0.
 */
export default function PendingSubmissionsBanner() {
  const {
    waitingCount,
    parkedCount,
    parkedItems,
    syncNow,
    retryParked,
    discardParked
  } = usePendingSubmissions();
  const [reviewOpen, setReviewOpen] = useState(false);
  const t = useTranslations('common');

  if (waitingCount === 0 && parkedCount === 0) return null;

  /** Triggers a manual sync of queued submissions. */
  const handleSyncNow = () => {
    // skipcq: JS-0098 - fire-and-forget manual sync
    void syncNow();
  };

  return (
    <>
      <output className='border-border bg-warning-tint text-warning-deep flex flex-wrap items-center gap-x-4 gap-y-1 border-b px-4 py-2 text-sm'>
        {waitingCount > 0 && (
          <span className='flex items-center gap-2'>
            <span>{t('pwa.waiting_to_sync', { count: waitingCount })}</span>
            <button
              type='button'
              onClick={handleSyncNow}
              className='text-turquoise-deep cursor-pointer font-semibold underline'
            >
              {t('pwa.sync_now')}
            </button>
          </span>
        )}
        {parkedCount > 0 && (
          <span className='flex items-center gap-2'>
            <span>{t('pwa.parked_to_sync', { count: parkedCount })}</span>
            <button
              type='button'
              onClick={() => setReviewOpen(true)}
              className='text-turquoise-deep cursor-pointer font-semibold underline'
            >
              {t('pwa.review')}
            </button>
          </span>
        )}
      </output>
      <ParkedSubmissionsDialog
        open={reviewOpen}
        onOpenChange={setReviewOpen}
        items={parkedItems}
        onRetry={retryParked}
        onDiscard={discardParked}
      />
    </>
  );
}
