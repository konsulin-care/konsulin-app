import ScoreDisplay from '@/components/assessment/score-display';
import { Skeleton } from '@/components/ui/skeleton';
import { useAuth } from '@/context/auth/authContext';
import { STORES, dbDelete, dbGet } from '@/lib/indexeddb';
import { getAPI } from '@/services/api';
import {
  RESULT_BRIEF_PLACEHOLDER,
  useQuestionnaireResponse
} from '@/services/api/assessment';
import { getFee } from '@/utils/fhir/fee';
import { questionnaireIdOf } from '@/utils/fhir/questionnaire-url';
import { useQuery } from '@tanstack/react-query';
import {
  Money,
  Questionnaire,
  QuestionnaireResponse,
  QuestionnaireResponseItem
} from 'fhir/r4';
import { useEffect, useMemo, useState } from 'react';

type Props = {
  readonly recordId: string;
  readonly onTitleChange?: (title: string) => void;
  readonly onFeeChange?: (fee: Money | null) => void;
};

/** Max attempts when waiting for a service request id to land. */
const MAX_ID_READ_ATTEMPTS = 5;

/** Delay between service request id read attempts. */
const ID_READ_INTERVAL_MS = 1000;

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

/**
 *
 */
export default function RecordAssessment({
  recordId,
  onTitleChange,
  onFeeChange
}: Props) {
  const {
    data: questionnaireResponseRaw,
    isLoading: questionnaireResponseIsLoading
  } = useQuestionnaireResponse({
    questionnaireId: recordId,
    enabled: true
  });
  const questionnaireResponse =
    questionnaireResponseRaw as unknown as QuestionnaireResponse | null;
  const [polledResultBrief, setPolledResultBrief] = useState<string | null>(
    null
  );
  const { state: authState } = useAuth();

  useEffect(() => {
    let cancelled = false;
    let attempts = 0;
    const MAX_ATTEMPTS = 3;

    /** Polls the backend for result brief data. */
    const poll = async (serviceRequestId: string) => {
      try {
        const API = await getAPI();
        const res = await API.get<{ data: { note?: string } }>(
          `/api/v1/service-request/${serviceRequestId}/result`
        );

        const note: string | undefined = res.data?.data?.note?.trim();

        if (note && !cancelled) {
          if (!authState.isAuthenticated) return;
          setPolledResultBrief(note);

          const interpretationItem = questionnaireResponse.item.find(
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
            item: questionnaireResponse.item.map(
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
        if (attempts < MAX_ATTEMPTS && !cancelled) {
          setTimeout(() => {
            poll(serviceRequestId).catch(console.error);
          }, 1000);
        }
      } catch (err) {
        console.error('[record-assessment] polling error:', err);
      }
    };

    /** Polls for the result brief from the backend service request. */
    /** Polls for the result brief from the backend service request. */
    const start = async () => {
      if (!questionnaireResponse) return;
      if (!authState.isAuthenticated) return;

      const interpretationItem = questionnaireResponse.item.find(
        (item: QuestionnaireResponseItem) => item.linkId === 'interpretation'
      );

      const resultBriefItem = interpretationItem?.item.find(
        (subItem: QuestionnaireResponseItem) =>
          subItem.linkId === 'result-brief'
      );

      const existingResult =
        resultBriefItem?.answer?.[0]?.valueString?.trim() ?? '';

      if (existingResult && existingResult !== RESULT_BRIEF_PLACEHOLDER) {
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
  }, [questionnaireResponse, recordId, authState.isAuthenticated]);

  // Fetch questionnaire title + fee extension for header and Get Report FAB
  const questionnaireId = questionnaireIdOf(
    questionnaireResponse?.questionnaire
  );
  const { data: questionnaire } = useQuery<Questionnaire | null>({
    queryKey: ['questionnaire', questionnaireId, 'title,extension'],
    queryFn: async () => {
      const API = await getAPI();
      const response = await API.get<Questionnaire>(
        `/fhir/Questionnaire/${questionnaireId}?_elements=title,extension`
      );
      return response.data ?? null;
    },
    enabled: Boolean(questionnaireId)
  });
  const questionnaireTitle = questionnaire?.title ?? questionnaireId;
  const fee = useMemo(
    () => (questionnaire ? getFee(questionnaire) : null),
    [questionnaire]
  );

  // Push the resolved title up to RecordDetail
  useEffect(() => {
    if (questionnaireTitle && onTitleChange) {
      onTitleChange(questionnaireTitle);
    }
  }, [questionnaireTitle, onTitleChange]);

  // Push the questionnaire fee up to RecordDetail; reset on unmount
  useEffect(() => {
    onFeeChange?.(fee);
    return () => onFeeChange?.(null);
  }, [fee, onFeeChange]);

  // Compute the result brief:
  // For guest users, pass null (ScoreDisplay shows "Claim the results to request analysis.")
  // For authenticated, use polled result or placeholder
  const computedResultBrief = useMemo<string | null>(() => {
    if (!authState.isAuthenticated) return null;

    if (polledResultBrief) return polledResultBrief;

    // Check for existing result brief in the QR data
    const interpretationItem = questionnaireResponse?.item.find(
      (item: QuestionnaireResponseItem) => item.linkId === 'interpretation'
    );
    const resultBriefItem = interpretationItem?.item.find(
      (subItem: QuestionnaireResponseItem) => subItem.linkId === 'result-brief'
    );
    const existingBrief =
      resultBriefItem?.answer?.[0]?.valueString?.trim() ?? '';

    if (existingBrief && existingBrief !== RESULT_BRIEF_PLACEHOLDER) {
      return existingBrief;
    }

    // No result yet — let the authenticated view decide
    return null;
  }, [authState.isAuthenticated, polledResultBrief, questionnaireResponse]);

  return questionnaireResponseIsLoading && !questionnaireResponse ? (
    <div className='flex min-h-[200px] items-center justify-center'>
      <Skeleton className='h-[80px] w-full rounded-lg bg-[hsl(210,40%,96.1%)]' />
    </div>
  ) : (
    <ScoreDisplay
      questionnaireResponse={questionnaireResponse}
      isLoading={questionnaireResponseIsLoading}
      resultBrief={computedResultBrief}
    />
  );
}
