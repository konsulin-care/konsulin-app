import type { HumanName } from 'fhir/r4';

export function mergeNames(name: HumanName[] | undefined): string {
  if (!name || name.length === 0) return '-';
  const parts = [
    ...(name[0]?.given || []),
    name[0]?.family || '',
  ].filter(Boolean);
  return parts.join(' ') || '-';
}
