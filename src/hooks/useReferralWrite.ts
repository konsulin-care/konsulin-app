'use client';

import { useAuth } from '@/context/auth/authContext';
import { ensureAnonymousSession } from '@/services/anonymous-session';
import { writeReferralCommunication } from '@/services/api/referral';
import type { ResearchProgress } from '@/utils/fhir/research';
import {
  captureReferralRef,
  isReferralWritten,
  markReferralWritten,
  parseReferralRef,
  readRefFromUrl,
  readStoredReferralRef
} from '@/utils/referral';
import { shouldWriteReferral } from '@/utils/referral-communication';
import { useEffect } from 'react';

/**
 * Captures a landing `?ref=` and writes the referral Communication once a
 * batch completes.
 *
 * Watches the research progress: when any study's current batch flips to
 * complete and a patient-format ref was captured, PUTs a deterministic
 * Communication (sender = referrer, recipient = the referee) exactly once
 * per batch. Guests are recipients by anonymous session id.
 *
 * @param progress - Current research progress from useResearchProgress.
 */
export function useReferralWrite(progress?: ResearchProgress): void {
  const { state: authState } = useAuth();
  const fhirId = authState?.userInfo?.fhirId;

  // Capture the landing ref once per page visit.
  useEffect(() => {
    captureReferralRef(
      readRefFromUrl(window.location.href),
      window.localStorage
    );
  }, []);

  // Write the Communication when a batch completes.
  useEffect(() => {
    const completed = progress?.studies.find(
      study => study.isComplete && study.currentBatch
    );
    const batch = completed?.currentBatch;
    const ref = readStoredReferralRef(window.localStorage);
    const referrer =
      batch &&
      shouldWriteReferral({
        ref,
        batchComplete: true,
        alreadyWritten: isReferralWritten(window.localStorage, batch.id)
      })
        ? parseReferralRef(ref)
        : null;

    let cancelled = false;

    if (batch && referrer) {
      // skipcq: JS-0098 - fire-and-forget referral write; cancellation flag guards the effect
      void (async () => {
        const recipient = fhirId ?? (await ensureAnonymousSession(false));
        if (cancelled) return;

        await writeReferralCommunication({
          sender: referrer.fhirId,
          recipient,
          batch: batch.id
        });
        // The write succeeded server-side; record it even when the effect
        // was cancelled mid-flight so a later run does not re-write a
        // duplicate Communication.
        markReferralWritten(window.localStorage, batch.id);
      })();
    }

    return () => {
      cancelled = true;
    };
  }, [progress, fhirId]);
}
