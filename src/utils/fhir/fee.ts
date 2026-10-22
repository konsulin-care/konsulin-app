import type { Extension, HealthcareService, Money } from 'fhir/r4';
import { FhirExtensionUrls, getExtension, upsertExtension } from './extensions';

type WithExtension = { extension?: Extension[] };

/**
 * Locale used for all fee display formatting.
 *
 * Single source of truth for number grouping (en-US → comma
 * separators, e.g. 100000 → "100,000"). When i18n lands, swap this
 * constant for the user-selected locale.
 */
export const FEE_DISPLAY_LOCALE = 'en-US';

/**
 * Format a numeric fee value with locale grouping (e.g. "100,000").
 *
 * @param value - The fee amount
 * @returns The grouped number string
 */
export function formatFeeValue(value: number): string {
  return value.toLocaleString(FEE_DISPLAY_LOCALE);
}

/**
 * Format a numeric value as currency (e.g. "Rp 100,000").
 *
 * @param value - The amount
 * @param currency - ISO 4217 currency code
 * @returns The formatted currency string
 */
export function formatCurrencyValue(value: number, currency: string): string {
  return new Intl.NumberFormat(FEE_DISPLAY_LOCALE, {
    style: 'currency',
    currency,
    minimumFractionDigits: 0
  }).format(value);
}

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
 * Format a fee Money object as an en-US Rupiah string (e.g. "Rp 150,000").
 *
 * @param fee - The Money object with value and optional currency
 * @returns Formatted IDR string
 */
export function formatFee(fee: Money): string {
  return `Rp ${formatFeeValue(fee.value ?? 0)}`;
}
