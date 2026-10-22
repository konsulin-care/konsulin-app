import { FhirExtensionUrls, FhirSystems } from '@/utils/fhir/extensions';
import { parseReferralRef } from '@/utils/referral';
import type { Communication } from 'fhir/r4';

/** Topic code for research-referral Communications. */
export const REFERRAL_TOPIC_CODE = 'research-referral';

/** Referral id parts: recipient, sender, and batch all affect the digest. */
export interface ReferralIdParts {
  recipient: string;
  sender: string;
  batch: string;
}

/** Inputs for building and writing a referral Communication. */
export interface ReferralCommunicationInput extends ReferralIdParts {
  id: string;
}

/**
 * Computes the deterministic Communication id: `referral-<sha256>` of the
 * pipe-joined recipient, sender, and batch. Duplicate writes for the same
 * triple collide on the same id and are rejected by If-None-Match.
 *
 * @param parts - Recipient, sender, and batch identifiers.
 * @returns The deterministic id.
 */
export async function buildReferralId(parts: ReferralIdParts): Promise<string> {
  const input = `${parts.recipient}|${parts.sender}|${parts.batch}`;
  const digest = await crypto.subtle.digest(
    'SHA-256',
    new TextEncoder().encode(input)
  );
  const hex = [...new Uint8Array(digest)]
    .map(byte => byte.toString(16).padStart(2, '0'))
    .join('');
  return `referral-${hex}`;
}

/**
 * Builds the referral Communication resource: sender is the referrer,
 * recipient is the referee, topic marks it as a research referral, and a
 * batch extension records which batch the referee completed.
 *
 * @param input - Deterministic id plus recipient/sender/batch.
 * @returns The Communication resource.
 */
export function buildReferralCommunication(
  input: ReferralCommunicationInput
): Communication {
  return {
    resourceType: 'Communication',
    id: input.id,
    status: 'completed',
    sender: { reference: `Patient/${input.sender}` },
    recipient: [{ reference: `Patient/${input.recipient}` }],
    topic: {
      coding: [
        {
          system: FhirSystems.researchReferral,
          code: REFERRAL_TOPIC_CODE
        }
      ]
    },
    extension: [
      {
        url: FhirExtensionUrls.referralBatch,
        valueReference: { reference: `PlanDefinition/${input.batch}` }
      }
    ]
  };
}

/**
 * True when a referral Communication should be written: a patient ref is
 * present, the batch is complete, and nothing was written for it yet.
 *
 * @param opts - Ref, batch completion state, and written flag.
 * @returns Whether the write should proceed.
 */
export function shouldWriteReferral(opts: {
  ref: string | null;
  batchComplete: boolean;
  alreadyWritten: boolean;
}): boolean {
  if (!opts.batchComplete || opts.alreadyWritten) return false;
  return parseReferralRef(opts.ref) !== null;
}
