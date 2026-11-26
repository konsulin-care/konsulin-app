import { appendFinding } from '@/utils/fhir/study-findings';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import type {
  Bundle,
  BundleEntry,
  BundleEntryRequest,
  ResearchStudy
} from 'fhir/r4';
import { getAPI } from '../api';

/** Input for posting one finding on a study. */
export interface PostFindingInput {
  studyId: string;
  text: string;
  time: string;
  authorReference: string;
  authorDisplay?: string;
  participantCount?: number;
}

/** Raised when the study changed on the server since it was read (HTTP 412). */
export class StudyConflictError extends Error {
  constructor(studyId: string) {
    super(`ResearchStudy/${studyId} was modified by someone else`);
    this.name = 'StudyConflictError';
  }
}

/**
 * True when a caught error carries an HTTP 412 response.
 *
 * @param error - Caught error, possibly an axios error with a response.
 * @returns Whether the error is a failed optimistic version check.
 */
function isPreconditionFailure(error: unknown): boolean {
  if (typeof error !== 'object' || error === null) return false;
  const response = (error as { response?: { status?: number } }).response;
  return response?.status === 412;
}

/**
 * Builds the transaction request entry for the updated study.
 *
 * @param study - The updated ResearchStudy.
 * @returns PUT entry with the optimistic version check when available.
 */
function buildEntry(study: ResearchStudy): BundleEntry<ResearchStudy> {
  const versionId = study.meta?.versionId;
  const request: BundleEntryRequest = {
    method: 'PUT',
    url: `ResearchStudy/${study.id}`
  };
  if (versionId) request.ifMatch = `W/"${versionId}"`;
  return { resource: study, request };
}

/**
 * Reads the study, appends the finding and writes it back through a
 * transaction bundle whose PUT carries the loaded version as ifMatch.
 *
 * @param input - Study id plus the finding to append.
 * @returns The updated ResearchStudy.
 */
async function postFinding(input: PostFindingInput): Promise<ResearchStudy> {
  const API = await getAPI();
  const loaded = await API.get<ResearchStudy>(
    `/fhir/ResearchStudy/${input.studyId}`
  );
  const updated = appendFinding(loaded.data, input);
  const bundle: Bundle = {
    resourceType: 'Bundle',
    type: 'transaction',
    entry: [buildEntry(updated)]
  };
  try {
    await API.post<Bundle>('/fhir', bundle);
  } catch (error) {
    if (isPreconditionFailure(error))
      throw new StudyConflictError(input.studyId);
    throw error;
  }
  return updated;
}

/**
 * Posts a finding on a study and refreshes the researcher dashboard.
 *
 * A 412 from the version check surfaces as a StudyConflictError and is not
 * retried.
 *
 * @returns Mutation accepting a PostFindingInput.
 */
export function usePostFinding() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationKey: ['research-finding'],
    mutationFn: (input: PostFindingInput) => postFinding(input),
    onSuccess: () => {
      // skipcq: JS-0098 - fire-and-forget cache invalidation
      void queryClient
        .invalidateQueries({ queryKey: ['researcher-dashboard'] })
        .catch(() => {
          /* cache invalidation best-effort */
        });
    }
  });
}
