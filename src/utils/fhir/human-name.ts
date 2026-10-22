import type { HumanName } from 'fhir/r4';

/**
 * Collapse a FHIR HumanName into "given family" display format.
 * Given names are repeatable in FHIR (middle names live in `given`),
 * so all given parts are joined with spaces before the family name.
 *
 * @param name - The FHIR HumanName to collapse.
 * @returns The collapsed "John Magnificent Doe" style string, or '' when empty.
 */
export function collapseHumanName(name?: HumanName): string {
  if (!name) return '';
  return [...(name.given ?? []), name.family].filter(Boolean).join(' ');
}

/**
 * Build an official FHIR HumanName from given name parts and an optional
 * family name. `family` is omitted when falsy so round-trips stay clean.
 *
 * @param given - Given name parts (first and middle names), repeatable.
 * @param family - Optional family name.
 * @returns A `use: 'official'` HumanName.
 */
export function buildHumanName(given: string[], family?: string): HumanName {
  return {
    use: 'official',
    given,
    ...(family ? { family } : {})
  };
}
