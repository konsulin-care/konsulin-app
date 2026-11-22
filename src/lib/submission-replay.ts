import { getAppQueryClient } from '@/components/general/query-provider';
import { ANONYMOUS_SESSION_IDENTIFIER_SYSTEM } from '@/constants/anonymous-session';
import { registerSubmissionHandler } from '@/lib/submission-queue';
import {
  buildAnonymousIdentifier,
  ensureAnonymousSession
} from '@/services/anonymous-session';
import { getAPI } from '@/services/api';

/** Kind for a queued questionnaire response submission. */
export const QUESTIONNAIRE_RESPONSE_KIND = 'questionnaire-response';

/** Kind for a queued SOAP bundle submission. */
export const SOAP_BUNDLE_KIND = 'soap-bundle';

/** Narrows an unknown value to a plain record. */
function asRecord(value: unknown): Record<string, unknown> | null {
  if (typeof value !== 'object' || value === null) return null;
  return value as Record<string, unknown>;
}

/** Returns the author reference of a questionnaire response payload. */
function authorReferenceOf(payload: unknown): string | undefined {
  const author = asRecord(asRecord(payload)?.author);
  const reference = author?.reference;
  return typeof reference === 'string' && reference.length > 0
    ? reference
    : undefined;
}

/** Returns the anonymous identifier of a questionnaire response payload. */
function anonymousIdentifierOf(
  payload: unknown
): { system: string; value: string } | undefined {
  const identifiers = asRecord(payload)?.identifier;
  if (!Array.isArray(identifiers)) return undefined;
  for (const rawIdentifier of identifiers) {
    const identifier = asRecord(rawIdentifier);
    if (!identifier) continue;
    const system = identifier.system;
    const value = identifier.value;
    if (
      system === ANONYMOUS_SESSION_IDENTIFIER_SYSTEM &&
      typeof value === 'string' &&
      value.length > 0
    ) {
      return { system, value };
    }
  }
  return undefined;
}

/** True when a guest payload has neither an author nor an identifier. */
function isUnboundGuestPayload(payload: unknown): boolean {
  const record = asRecord(payload);
  if (!record) return false;
  if (authorReferenceOf(record)) return false;
  const identifiers = record.identifier;
  return !Array.isArray(identifiers) || identifiers.length === 0;
}

/**
 * Binds an anonymous identifier to a previously unbound guest payload.
 *
 * @param payload - The queued questionnaire response payload.
 * @param identifier - The identifier built from the guest session.
 * @returns A copy of the payload carrying the anonymous identifier.
 */
function bindAnonymousIdentifier(
  payload: unknown,
  identifier: unknown
): unknown {
  const record = asRecord(payload);
  if (!record) return payload;
  return { ...record, identifier: [identifier] };
}

/**
 * Builds the exists-probe URL for a questionnaire response payload.
 *
 * @param payload - The questionnaire response payload to probe for.
 * @returns The FHIR search URL scoped to the payload author or identifier.
 */
function buildExistsProbeUrl(payload: unknown): string {
  const record = asRecord(payload);
  const author = authorReferenceOf(record);
  const identifier = anonymousIdentifierOf(record);
  let scope = '';
  if (author) {
    scope = `author=${author}`;
  } else if (identifier) {
    scope = `identifier=${identifier.system}|${identifier.value}`;
  }
  const questionnaire = record?.questionnaire;
  const authored = record?.authored;
  const params = [
    scope,
    typeof questionnaire === 'string' ? `questionnaire=${questionnaire}` : '',
    typeof authored === 'string' ? `authored=ge${authored}` : '',
    typeof authored === 'string' ? `authored=le${authored}` : '',
    '_summary=count'
  ].filter(param => param.length > 0);
  return `/fhir/QuestionnaireResponse?${params.join('&')}`;
}

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
      let outgoing = payload;
      if (isUnboundGuestPayload(payload)) {
        const identifier = buildAnonymousIdentifier(
          await ensureAnonymousSession(false)
        );
        outgoing = bindAnonymousIdentifier(payload, identifier);
      }

      const probe = await API.get<{ total?: number }>(
        buildExistsProbeUrl(outgoing)
      );
      const total = probe.data?.total;
      if (typeof total === 'number' && total >= 1) return;

      await API.post('/fhir/QuestionnaireResponse', outgoing);
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
