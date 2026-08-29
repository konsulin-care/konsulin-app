import type { IRecord } from '@/types/record';
import { isLoincSystem } from '@/utils/fhir';
import type { Coding, Observation } from 'fhir/r4';

/**
 * Extract a Patient Note, Practitioner Note, or generic Observation from a
 * FHIR Observation resource into a partial IRecord.
 *
 * @param resource - The FHIR Observation resource.
 * @returns Partial IRecord with type, id, title, result, and lastUpdated.
 */
// eslint-disable-next-line complexity
export function extractObservation(resource: Observation): Partial<IRecord> {
  const codeList = resource.code?.coding ?? [];
  const loincCode = codeList.find((c: Coding) => isLoincSystem(c.system))?.code;

  const practitionerRef = resource.performer?.[0]?.reference;
  const practitionerId = practitionerRef?.split('/')[1] ?? null;

  if (loincCode === '51855-5') {
    const notes = (resource.note ?? []).map(n => n.text).join('\n\n');
    return {
      type: 'PatientNote',
      id: `${resource.resourceType}/${resource.id}`,
      title: resource.valueString ?? 'Patient Note',
      result: notes,
      lastUpdated: resource.meta?.lastUpdated ?? '',
      practitionerId: practitionerId ?? undefined
    };
  }

  if (loincCode === '67855-7') {
    return {
      type: 'PractitionerNote',
      id: `${resource.resourceType}/${resource.id}`,
      title: codeList[0]?.display ?? '',
      result: resource.valueString ?? '',
      lastUpdated: resource.meta?.lastUpdated ?? '',
      practitionerId: practitionerId ?? undefined
    };
  }

  return {
    type: 'Observation',
    id: `${resource.resourceType}/${resource.id}`,
    title: codeList[0]?.display ?? resource.code?.text ?? 'Observation',
    result: resource.valueString ?? resource.valueCodeableConcept?.text ?? '',
    lastUpdated: resource.meta?.lastUpdated ?? ''
  };
}
