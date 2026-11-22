'use client';

import { useAuth } from '@/context/auth/authContext';
import { useTranslations } from '@/i18n';
import { ownerKeyFor, type ReplayIdentity } from '@/lib/submission-owner';
import {
  listOwnedSubmissions,
  listenForSyncReplay,
  replayPendingSubmissions
} from '@/lib/submission-queue';
import { registerSubmissionReplayHandlers } from '@/lib/submission-replay';
import { useCallback, useEffect, useMemo, useState } from 'react';

/** Number of queued submissions and a manual retry trigger. */
export type PendingSubmissionsState = {
  waitingCount: number;
  parkedCount: number;
  syncNow: () => Promise<void>;
};

/** Counts waiting and parked items for the current owner's queue. */
async function loadCounts(
  identity: ReplayIdentity
): Promise<{ waitingCount: number; parkedCount: number }> {
  const items = await listOwnedSubmissions(identity.ownerKey, identity.isGuest);
  let waitingCount = 0;
  let parkedCount = 0;
  for (const item of items) {
    if (item.status === 'parked') {
      parkedCount += 1;
    } else {
      waitingCount += 1;
    }
  }
  return { waitingCount, parkedCount };
}

/**
 * Tracks queued offline submissions owned by the current identity.
 * Waits for auth to resolve, registers replay handlers and the SW message
 * listener once, replays on page load and on the online event, and exposes
 * the current owner's waiting and parked counts plus a manual retry.
 *
 * @returns Waiting and parked counts and a manual sync trigger.
 */
export function usePendingSubmissions(): PendingSubmissionsState {
  const { isLoading, state } = useAuth();
  const [waitingCount, setWaitingCount] = useState(0);
  const [parkedCount, setParkedCount] = useState(0);

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

  /** Refreshes the counts from the current owner's queue items. */
  const refresh = useCallback(async (target: ReplayIdentity): Promise<void> => {
    const counts = await loadCounts(target);
    setWaitingCount(counts.waitingCount);
    setParkedCount(counts.parkedCount);
  }, []);

  const syncNow = useCallback(async (): Promise<void> => {
    if (isLoading) return;
    await replayPendingSubmissions(identity);
    await refresh(identity);
  }, [identity, isLoading, refresh]);

  useEffect(() => {
    // Wait for auth to resolve before replaying anything.
    if (isLoading) return () => {};

    registerSubmissionReplayHandlers();
    const unsubscribe = listenForSyncReplay(() => identity);

    let cancelled = false;

    /** Refreshes the counts unless the effect was cleaned up. */
    const refreshIfActive = async (): Promise<void> => {
      const counts = await loadCounts(identity);
      if (cancelled) return;
      setWaitingCount(counts.waitingCount);
      setParkedCount(counts.parkedCount);
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

  return { waitingCount, parkedCount, syncNow };
}

/** Banner showing queued submissions with a manual sync button. */
export default function PendingSubmissionsBanner() {
  const { waitingCount, syncNow } = usePendingSubmissions();
  const t = useTranslations('common');

  if (waitingCount === 0) return null;

  /** Triggers a manual sync of queued submissions. */
  const handleSyncNow = () => {
    // skipcq: JS-0098 - fire-and-forget manual sync
    void syncNow();
  };

  return (
    <output className='border-border bg-warning-tint text-warning-deep flex items-center justify-between gap-2 border-b px-4 py-2 text-sm'>
      <span>{t('pwa.waiting_to_sync', { count: waitingCount })}</span>
      <button
        type='button'
        onClick={handleSyncNow}
        className='text-turquoise-deep cursor-pointer font-semibold underline'
      >
        {t('pwa.sync_now')}
      </button>
    </output>
  );
}
