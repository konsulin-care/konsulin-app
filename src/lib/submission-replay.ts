import { getAppQueryClient } from '@/components/general/query-provider';
import { registerSubmissionHandler } from '@/lib/submission-queue';
import { getAPI } from '@/services/api';

/** Kind for a queued questionnaire response submission. */
export const QUESTIONNAIRE_RESPONSE_KIND = 'questionnaire-response';

/** Kind for a queued SOAP bundle submission. */
export const SOAP_BUNDLE_KIND = 'soap-bundle';

/** True when an axios-style error means no HTTP response was received. */
export function isNetworkError(error: unknown): boolean {
  if (typeof error !== 'object' || error === null) return false;
  const err = error as { response?: unknown; code?: string };
  return err.response === undefined || err.code === 'ERR_NETWORK';
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
      // skipcq: JS-0098 - fire-and-forget query invalidation
      const queryClient = getAppQueryClient();
      if (queryClient) {
        void queryClient.invalidateQueries({ queryKey: ['research'] });
      }
    }
  );

  registerSubmissionHandler(SOAP_BUNDLE_KIND, async (payload: unknown) => {
    const API = await getAPI();
    await API.post('/fhir', payload);
  });
}
