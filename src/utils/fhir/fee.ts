import type { HealthcareService, Money } from 'fhir/r4';

const FEE_EXTENSION_URL = 'https://konsulin.id/fhir/StructureDefinition/fee';

/**
 * Extract the fee (Money) from a HealthcareService's extension.
 *
 * Looks for an extension with url matching the fee extension defined
 * for Konsulin. Returns null when no fee extension is found or the
 * valueMoney is incomplete.
 *
 * @param hs - The HealthcareService resource to extract fee from
 * @returns The fee Money object, or null if not present
 */
export function getFeeFromHealthcareService(
  hs: HealthcareService
): Money | null {
  const ext = hs.extension?.find(e => e.url === FEE_EXTENSION_URL);
  if (!ext?.valueMoney?.value) return null;
  return {
    value: ext.valueMoney.value,
    currency: ext.valueMoney.currency ?? 'IDR'
  };
}
