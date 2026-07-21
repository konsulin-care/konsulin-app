/**
 * Check if a FHIR coding system string represents LOINC.
 *
 * Accepts both http:// and https:// schemes and is case-insensitive
 * since FHIR servers may return either variant.
 *
 * @param system - The coding system URL (or null/undefined)
 * @returns true if the system is LOINC (loinc.org)
 */
export function isLoincSystem(system: string | undefined | null): boolean {
  if (!system) return false;
  return system.replace(/^https?:\/\//, '').toLowerCase() === 'loinc.org';
}
