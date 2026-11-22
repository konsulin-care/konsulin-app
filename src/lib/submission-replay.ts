import { getAppQueryClient } from '@/components/general/query-provider';
import { registerSubmissionHandler } from '@/lib/submission-queue';
import { getAPI } from '@/services/api';

/** Kind for a queued questionnaire response submission. */
export const QUESTIONNAIRE_RESPONSE_KIND = 'questionnaire-response';

/** Kind for a queued SOAP bundle submission. */
export const SOAP_BUNDLE_KIND = 'soap-bundle';

/**
 * Extracts the HTTP status from an error, if one was received.
 *
 * @param error - Any thrown value, typically an `ApiError` or axios error.
 * @returns The numeric status, or `undefined` when no status is present.
 */
export function errorStatus(error: unknown): number | undefined {
  if (typeof error !== 'object' || error === null) return undefined;
  const err = error as { status?: unknown; response?: { status?: unknown } };
  if (typeof err.status === 'number') return err.status;
  const responseStatus = err.response?.status;
  return typeof responseStatus === 'number' ? responseStatus : undefined;
}

/**
 * True when an error means no HTTP response was received (or axios reported
 * `ERR_NETWORK`), false for any error carrying an HTTP status.
 *
 * @param error - Any thrown value to classify.
 * @returns Whether the error should be treated as a network failure.
 */
export function isNetworkError(error: unknown): boolean {
  if (typeof error !== 'object' || error === null) return false;
  const err = error as { code?: string };
  if (err.code === 'ERR_NETWORK') return true;
  return errorStatus(error) === undefined;
}

/**
 * Registers replay handlers for offline-queued submissions.
 * Call once at app startup so page-load replays can dispatch.
 */
export function registerSubmissionReplayHandlers(): void {
  registerSubmissionHandler(
    QUESTIONNAIRE_RESPONSE_KIND,
    async (payload: unknown) => {
      const API = await getAPI();
      await API.post('/fhir/QuestionnaireResponse', payload);
      // Reflect the synced contribution in research progress widgets.
      const queryClient = getAppQueryClient();
      if (queryClient) {
        // skipcq: JS-0098 - fire-and-forget query invalidation
        void queryClient.invalidateQueries({ queryKey: ['research'] });
      }
    }
  );

  registerSubmissionHandler(SOAP_BUNDLE_KIND, async (payload: unknown) => {
    const API = await getAPI();
    await API.post('/fhir', payload);
  });
}
