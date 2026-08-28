import type { IRecord } from '@/types/record';
import type { Condition } from 'fhir/r4';

/**
 * Extract a Condition resource into a partial IRecord.
 *
 * Evidence codes are rendered as a markdown bullet list.
 *
 * @param resource - The FHIR Condition resource.
 * @returns Partial IRecord with type, id, title, result, and lastUpdated.
 */
export function extractCondition(resource: Condition): Partial<IRecord> {
  const evidenceBullets = (resource.evidence ?? [])
    .flatMap(e => (e.code ?? []).map(c => c.text).filter(Boolean))
    .map(t => `- ${t}`)
    .join('\n');

  return {
    type: 'Condition',
    id: `${resource.resourceType}/${resource.id}`,
    title: resource.code?.text ?? '',
    result: evidenceBullets,
    lastUpdated: resource.meta?.lastUpdated ?? ''
  };
}
