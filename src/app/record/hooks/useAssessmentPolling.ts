import { STORES, dbDelete, dbGet } from '@/lib/indexeddb';
import { getAPI } from '@/services/api';
import type { QuestionnaireResponse, QuestionnaireResponseItem } from 'fhir/r4';
import { useEffect, useState } from 'react';

/** Max attempts when waiting for a service request id to land. */
const MAX_ID_READ_ATTEMPTS = 5;

/** Delay between service request id read attempts. */
const ID_READ_INTERVAL_MS = 1000;

/** Max poll attempts for result brief. */
const MAX_POLL_ATTEMPTS = 3;

/**
 * Reads the stored service request id, retrying briefly so a webhook result
 * that lands shortly after navigation is still picked up for polling.
 *
 * @param recordId - QuestionnaireResponse id keying the store entry.
 * @param isCancelled - Aborts further retries once the component unmounts.
 * @returns The service request id, or undefined when never found.
 */
async function readServiceRequestId(
  recordId: string,
  isCancelled: () => boolean
): Promise<string | undefined> {
  for (let attempt = 0; attempt < MAX_ID_READ_ATTEMPTS; attempt += 1) {
    const srRecord = await dbGet<{ serviceRequestId: string }>(
      STORES.serviceRequests,
      recordId
    );
    const serviceRequestId = srRecord?.serviceRequestId;
    if (serviceRequestId || isCancelled()) return serviceRequestId;
    if (attempt < MAX_ID_READ_ATTEMPTS - 1) {
      await new Promise(resolve => setTimeout(resolve, ID_READ_INTERVAL_MS));
    }
  }
  return undefined;
}

interface UseAssessmentPollingParams {
  recordId: string;
  questionnaireResponse: QuestionnaireResponse | null | undefined;
  isAuthenticated: boolean;
}

interface UseAssessmentPollingResult {
  polledResultBrief: string | null;
}

/**
 * Polls for a result brief from the backend service request and updates
 * the QuestionnaireResponse with the result.
 *
 * @param params.recordId - The QuestionnaireResponse id.
 * @param params.questionnaireResponse - The loaded QR resource.
 * @param params.isAuthenticated - Whether the user is authenticated.
 * @returns The polled result brief, or null if not yet available.
 */
export function useAssessmentPolling({
  recordId,
  questionnaireResponse,
  isAuthenticated
}: UseAssessmentPollingParams): UseAssessmentPollingResult {
  const [polledResultBrief, setPolledResultBrief] = useState<string | null>(
    null
  );

  useEffect(() => {
    let cancelled = false;
    let attempts = 0;

    /** Polls the backend for result brief data. */
    const poll = async (serviceRequestId: string): Promise<void> => {
      try {
        const API = await getAPI();
        const res = await API.get<{ data: { note?: string } }>(
          `/api/v1/service-request/${serviceRequestId}/result`
        );

        const note: string | undefined = res.data?.data?.note?.trim();

        if (note && !cancelled) {
          if (!isAuthenticated) return;
          setPolledResultBrief(note);

          // Update the QR with the new result brief
          const interpretationItem = questionnaireResponse?.item.find(
            (item: QuestionnaireResponseItem) =>
              item.linkId === 'interpretation'
          );

          const updatedInterpretationItem = {
            ...interpretationItem,
            item: [
              ...(interpretationItem?.item ?? []).filter(
                (i: QuestionnaireResponseItem) => i.linkId !== 'result-brief'
              ),
              {
                linkId: 'result-brief',
                answer: [{ valueString: note }]
              }
            ]
          };

          const updatedQR = {
            ...questionnaireResponse,
            item: questionnaireResponse?.item.map(
              (item: QuestionnaireResponseItem) =>
                item.linkId === 'interpretation'
                  ? updatedInterpretationItem
                  : item
            )
          };

          await API.put(`/fhir/QuestionnaireResponse/${recordId}`, updatedQR);

          dbDelete(STORES.serviceRequests, recordId).catch((err: unknown) =>
            console.warn('[IndexedDB]', err)
          );
          return;
        }

        attempts += 1;
        if (attempts < MAX_POLL_ATTEMPTS && !cancelled) {
          setTimeout(() => {
            poll(serviceRequestId).catch(console.error);
          }, 1000);
        }
      } catch (err) {
        console.error('[record-assessment] polling error:', err);
      }
    };

    /** Start polling for the result brief. */
    const start = async (): Promise<void> => {
      if (!questionnaireResponse) return;
      if (!isAuthenticated) return;

      // Check for existing result brief
      const interpretationItem = questionnaireResponse.item.find(
        (item: QuestionnaireResponseItem) => item.linkId === 'interpretation'
      );

      const resultBriefItem = interpretationItem?.item.find(
        (subItem: QuestionnaireResponseItem) =>
          subItem.linkId === 'result-brief'
      );

      const existingResult =
        resultBriefItem?.answer?.[0]?.valueString?.trim() ?? '';

      if (existingResult && existingResult !== 'Waiting...') {
        setPolledResultBrief(existingResult);
        return;
      }

      const serviceRequestId = await readServiceRequestId(
        recordId,
        () => cancelled
      );
      if (!serviceRequestId) return;

      poll(serviceRequestId).catch(console.error);
    };

    start().catch(console.error);

    return () => {
      cancelled = true;
    };
  }, [questionnaireResponse, recordId, isAuthenticated]);

  return { polledResultBrief };
}
