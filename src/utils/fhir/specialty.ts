import { NUCC_TAXONOMY } from '@/data/nucc-taxonomy';
import type { CodeableConcept, PractitionerRole } from 'fhir/r4';
import { FhirSystems } from './extensions';

/** Build a code → taxonomy entry lookup for validation and display lookup. */
function taxonomyByCode(): Map<string, (typeof NUCC_TAXONOMY)[number]> {
  return new Map(NUCC_TAXONOMY.map(entry => [entry.code, entry]));
}

/** Whether a concept carries at least one NUCC taxonomy coding. */
function isNuccCoded(concept: CodeableConcept): boolean {
  return (
    concept.coding?.some(
      coding => coding.system === FhirSystems.nuccTaxonomy
    ) ?? false
  );
}

/**
 * Extract the NUCC taxonomy codes currently set on a PractitionerRole.
 *
 * External specialties (other code systems or text-only entries) are
 * ignored — they are preserved, not managed by the NUCC picker.
 *
 * @param role - The PractitionerRole resource
 * @returns The NUCC coding codes in resource order
 */
export function getNuccSpecialtyCodes(role: PractitionerRole): string[] {
  return (role.specialty ?? [])
    .flatMap(concept => concept.coding ?? [])
    .filter(coding => coding.system === FhirSystems.nuccTaxonomy)
    .map(coding => coding.code ?? '')
    .filter(code => code !== '');
}

/**
 * Build the specialty array to PUT for a NUCC picker selection.
 *
 * NUCC-coded concepts are fully replaced by the selected codes (with the
 * taxonomy system, code, display, and text). Pre-existing external concepts
 * — other code systems and text-only entries — are preserved as-is so a
 * save never deletes data the picker does not own. Selected codes that are
 * not present in the NUCC taxonomy are dropped silently.
 *
 * @param role - The current PractitionerRole resource
 * @param selectedCodes - NUCC codes chosen in the picker
 * @returns A new specialty array (external entries first, then NUCC)
 */
export function buildSpecialtyPayload(
  role: PractitionerRole,
  selectedCodes: string[]
): CodeableConcept[] {
  const byCode = taxonomyByCode();
  const nuccConcepts = selectedCodes.flatMap(code => {
    const entry = byCode.get(code);
    if (!entry) return [];
    return [
      {
        coding: [
          {
            system: FhirSystems.nuccTaxonomy,
            code: entry.code,
            display: entry.label
          }
        ],
        text: entry.label
      }
    ];
  });
  const external = (role.specialty ?? []).filter(
    concept => !isNuccCoded(concept)
  );
  return [...external, ...nuccConcepts];
}
