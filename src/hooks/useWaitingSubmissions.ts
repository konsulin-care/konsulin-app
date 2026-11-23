'use client';

import { useAuth } from '@/context/auth/authContext';
import type { PendingSubmission } from '@/lib/indexeddb';
import { ownerKeyFor } from '@/lib/submission-owner';
import { listOwnedSubmissions } from '@/lib/submission-queue';
import { QUESTIONNAIRE_RESPONSE_KIND } from '@/lib/submission-replay';
import { useEffect, useState } from 'react';

/** How often the queued responses are re-read from IndexedDB. */
const REFRESH_INTERVAL_MS = 30_000;

/** A queued questionnaire response that has not been parked for review. */
export interface WaitingResponse {
  questionnaire?: string;
  authored?: string;
}

/** Narrows an unknown value to a plain record. */
function asRecord(value: unknown): Record<string, unknown> | null {
  if (typeof value !== 'object' || value === null) return null;
  return value as Record<string, unknown>;
}

/** Maps a queued questionnaire response to its waiting payload fields. */
function toWaitingResponse(item: PendingSubmission): WaitingResponse {
  const payload = asRecord(item.payload);
  const questionnaire = payload?.questionnaire;
  const authored = payload?.authored;
  const response: WaitingResponse = {};
  if (typeof questionnaire === 'string') response.questionnaire = questionnaire;
  if (typeof authored === 'string') response.authored = authored;
  return response;
}

/** Keeps only non-parked questionnaire responses and maps their payloads. */
function waitingResponsesOf(
  items: readonly PendingSubmission[]
): WaitingResponse[] {
  return items
    .filter(
      item =>
        item.status !== 'parked' && item.kind === QUESTIONNAIRE_RESPONSE_KIND
    )
    .map(item => toWaitingResponse(item));
}

/**
 * Lists the current owner's queued questionnaire responses without replaying
 * them. Replays would double-post, so this hook only reads the queue and
 * refreshes it on mount, on reconnect and every 30 seconds.
 *
 * @returns The waiting questionnaire-response payloads for the current owner.
 */
export function useWaitingSubmissions(): readonly WaitingResponse[] {
  const auth = useAuth();
  const isLoading = auth?.isLoading ?? false;
  const isAuthenticated = auth?.state?.isAuthenticated ?? false;
  const userInfo = auth?.state?.userInfo;
  const ownerKey = ownerKeyFor({
    isAuthenticated,
    role: userInfo?.role_name,
    fhirId: userInfo?.fhirId
  });
  const isGuest = !isAuthenticated;
  const [responses, setResponses] = useState<readonly WaitingResponse[]>([]);

  useEffect(() => {
    if (isLoading) {
      return () => {
        // No listeners exist while auth is still loading.
      };
    }

    let cancelled = false;

    /** Reads the owner's queue and updates state unless unmounted. */
    const refresh = async (): Promise<void> => {
      try {
        const items = await listOwnedSubmissions(ownerKey, isGuest);
        if (cancelled) return;
        setResponses(waitingResponsesOf(items));
      } catch (error) {
        console.warn(
          '[useWaitingSubmissions] failed to read the submission queue',
          error
        );
        if (!cancelled) setResponses([]);
      }
    };

    // skipcq: JS-0098 - fire-and-forget read on mount
    void refresh();

    /** Re-reads the queue when connectivity returns. */
    const onOnline = (): void => {
      // skipcq: JS-0098 - fire-and-forget read on reconnect
      void refresh();
    };
    window.addEventListener('online', onOnline);
    const interval = window.setInterval(() => {
      // skipcq: JS-0098 - fire-and-forget periodic read
      void refresh();
    }, REFRESH_INTERVAL_MS);

    return () => {
      cancelled = true;
      window.removeEventListener('online', onOnline);
      window.clearInterval(interval);
    };
  }, [isGuest, isLoading, ownerKey]);

  if (isLoading) return [];
  return responses;
}
