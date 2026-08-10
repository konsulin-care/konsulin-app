'use client';

import {
  listenForSyncReplay,
  pendingCount,
  replayPendingSubmissions
} from '@/lib/submission-queue';
import { registerSubmissionReplayHandlers } from '@/lib/submission-replay';
import { useCallback, useEffect, useState } from 'react';

/** Number of queued submissions and a manual retry trigger. */
export type PendingSubmissionsState = {
  count: number;
  syncNow: () => Promise<void>;
};

/**
 * Tracks queued offline submissions. Registers replay handlers and the
 * SW message listener once, replays on page load and on the online
 * event, and exposes a manual retry.
 */
export function usePendingSubmissions(): PendingSubmissionsState {
  const [count, setCount] = useState(0);

  const syncNow = useCallback(async () => {
    await replayPendingSubmissions();
    setCount(await pendingCount());
  }, []);

  useEffect(() => {
    registerSubmissionReplayHandlers();
    const unsubscribe = listenForSyncReplay();

    let cancelled = false;

    /** Refreshes the queued count unless the effect was cleaned up. */
    const refresh = async () => {
      const next = await pendingCount();
      if (!cancelled) setCount(next);
    };

    /** Replays queued submissions, then refreshes the count. */
    const replay = async () => {
      await replayPendingSubmissions();
      await refresh();
    };

    // Page-load replay: flush anything queued while the app was offline.
    // skipcq: JS-0098 - fire-and-forget replay on page load
    void replay();

    /** Fires a replay when the browser comes back online. */
    const onOnline = () => {
      // skipcq: JS-0098 - fire-and-forget replay on reconnect
      void replay();
    };
    window.addEventListener('online', onOnline);

    return () => {
      cancelled = true;
      window.removeEventListener('online', onOnline);
      unsubscribe();
    };
  }, []);

  return { count, syncNow };
}

/** Banner showing queued submissions with a manual sync button. */
export default function PendingSubmissionsBanner() {
  const { count, syncNow } = usePendingSubmissions();

  if (count === 0) return null;

  /** Triggers a manual sync of queued submissions. */
  const handleSyncNow = () => {
    // skipcq: JS-0098 - fire-and-forget manual sync
    void syncNow();
  };

  return (
    <div
      role='status'
      className='flex items-center justify-between gap-2 border-b border-neutral-200 bg-amber-50 px-4 py-2 text-sm'
    >
      <span>
        {count} submission{count === 1 ? '' : 's'} waiting to sync
      </span>
      <button
        type='button'
        onClick={handleSyncNow}
        className='cursor-pointer font-semibold text-teal-600 underline'
      >
        Sync now
      </button>
    </div>
  );
}
