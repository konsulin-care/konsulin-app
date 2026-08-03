import type { Extension, HealthcareService, Money } from 'fhir/r4';
import { FhirExtensionUrls, getExtension, upsertExtension } from './extensions';

type WithExtension = { extension?: Extension[] };

/**
 * Build a fee extension carrying an IDR Money value.
 *
 * The canonical shape for the Konsulin fee extension, shared by
 * HealthcareService and Questionnaire resources.
 *
 * @param value - The fee amount in IDR
 * @returns The fee Extension object
 */
export function buildFeeExtension(value: number): Extension {
  return {
    url: FhirExtensionUrls.fee,
    valueMoney: { value, currency: 'IDR' }
  };
}

/**
 * Set or replace the fee extension on a resource.
 *
 * Replaces any existing fee extension and preserves all unrelated
 * extensions. Returns a new resource; the input is not mutated.
 *
 * @param resource - FHIR resource with an optional extension array
 * @param value - The fee amount in IDR
 * @returns A new resource with the fee extension set
 */
export function setFee<T extends WithExtension>(resource: T, value: number): T {
  return upsertExtension(resource, buildFeeExtension(value));
}

/**
 * Extract the fee (Money) from a resource's extension.
 *
 * Looks for an extension with url matching the fee extension defined
 * for Konsulin. Returns null when no fee extension is found or the
 * valueMoney is incomplete.
 *
 * @param resource - FHIR resource with an optional extension array
 * @returns The fee Money object, or null if not present
 */
export function getFee(resource: WithExtension): Money | null {
  const ext = getExtension(resource, FhirExtensionUrls.fee);
  if (!ext?.valueMoney?.value) return null;
  return {
    value: ext.valueMoney.value,
    currency: ext.valueMoney.currency ?? 'IDR'
  };
}

/**
 * Extract the fee (Money) from a HealthcareService's extension.
 *
 * Thin wrapper over the generic fee reader.
 *
 * @param hs - The HealthcareService resource to extract fee from
 * @returns The fee Money object, or null if not present
 */
export function getFeeFromHealthcareService(
  hs: HealthcareService
): Money | null {
  return getFee(hs);
}

/**
 * Format a fee Money object as an Indonesian Rupiah string (e.g. "Rp 150.000").
 *
 * @param fee - The Money object with value and optional currency
 * @returns Formatted IDR string
 */
export function formatFee(fee: Money): string {
  const formatted = (fee.value ?? 0).toLocaleString('id-ID');
  return `Rp ${formatted}`;
}
