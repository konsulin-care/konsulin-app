import {
  buildReferralCommunication,
  buildReferralId,
  type ReferralIdParts
} from '@/utils/referral-communication';
import { getAPI } from '../api';

/**
 * Writes a referral Communication via PUT with If-None-Match so a duplicate
 * (same recipient|sender|batch) is rejected by the server with 409.
 *
 * @param parts - Recipient, sender, and batch identifiers.
 * @returns True when created, false when it already exists.
 */
export async function writeReferralCommunication(
  parts: ReferralIdParts
): Promise<boolean> {
  const id = await buildReferralId(parts);
  const communication = buildReferralCommunication({ id, ...parts });
  const API = await getAPI();
  try {
    await API.put(`/fhir/Communication/${id}`, communication, {
      headers: { 'If-None-Match': '*' }
    });
    return true;
  } catch (error) {
    if (isConflictError(error)) return false;
    throw error;
  }
}

/**
 * True when an error is an HTTP 409 conflict (resource already exists).
 *
 * @param error - Caught error, possibly an axios error with a response.
 * @returns Whether the error carries a 409 status.
 */
function isConflictError(error: unknown): boolean {
  if (typeof error !== 'object' || error === null) return false;
  const response = (error as { response?: { status?: number } }).response;
  return response?.status === 409;
}
