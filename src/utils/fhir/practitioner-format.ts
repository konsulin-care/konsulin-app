import type { BundleEntry, HealthcareService, PractitionerRole } from 'fhir/r4';

/** Data shape for a practitioner card. */
export interface CardData {
  id: string;
  practitionerName: string;
  photoUrl: string | undefined;
  specialties: string[];
  healthcareServiceNames: string[];
  practitionerRoleId: string;
}

/**
 * Extract practitioner name from a BundleEntry resource.
 *
 * @param r - The resource (Practitioner) from a BundleEntry.
 * @returns Formatted name string (given + family) or "-" if missing.
 */
export function getPractitionerName(r: BundleEntry['resource']): string {
  const n = (
    r as { name?: Array<{ given?: string[]; family?: string }> } | undefined
  )?.name?.[0];
  return [n?.given?.join(' '), n?.family].filter(Boolean).join(' ') || '-';
}

/**
 * Extract photo URL from a BundleEntry resource.
 *
 * @param r - The resource (Practitioner) from a BundleEntry.
 * @returns Photo URL string or undefined if not present.
 */
export function getPhotoUrl(r: BundleEntry['resource']): string | undefined {
  return (r as { photo?: Array<{ url?: string }> } | undefined)?.photo?.[0]
    ?.url;
}

/**
 * Get healthcare service names from a PractitionerRole using a lookup map.
 *
 * @param role - BundleEntry containing a PractitionerRole resource.
 * @param hsMap - Map of HealthcareService id -> name.
 * @returns Array of service names.
 */
export function getServiceNames(
  role: BundleEntry<PractitionerRole>,
  hsMap: Map<string, string>
): string[] {
  const refs = role.resource.healthcareService;
  if (!refs) return [];
  return refs
    .map(ref => {
      const id = ref.reference?.split('/')[1];
      return id ? (hsMap.get(id) ?? '') : '';
    })
    .filter(Boolean);
}

/**
 * Map BundleEntry array to practitioner card data for display.
 *
 * @param entries - Array of BundleEntry resources from FHIR search.
 * @returns Array of CardData objects for PractitionerCard components.
 */
export function mapToCardData(entries: BundleEntry[]): CardData[] {
  const practitionerRoles = entries.filter(
    (e): e is BundleEntry<PractitionerRole> =>
      e.resource?.resourceType === 'PractitionerRole'
  );
  const practitioners = entries.filter(
    e => e.resource?.resourceType === 'Practitioner'
  );
  const healthcareServices = entries.filter(
    (e): e is BundleEntry<HealthcareService> =>
      e.resource?.resourceType === 'HealthcareService'
  );
  const hsMap = new Map(
    healthcareServices
      .filter(hs => hs.resource?.id)
      .map(hs => [hs.resource.id, hs.resource.name ?? ''])
  );
  return practitioners
    .map(item => {
      const practitionerId = item.resource?.id;
      if (!practitionerId) return null;
      const role = practitionerRoles.find(
        r =>
          r.resource?.practitioner?.reference?.split('/')[1] === practitionerId
      );
      if (!role?.resource?.id) return null;
      return {
        id: practitionerId,
        practitionerName: getPractitionerName(item.resource),
        photoUrl: getPhotoUrl(item.resource),
        specialties: (role.resource.specialty?.map(s => s.text) ?? []).filter(
          Boolean
        ),
        healthcareServiceNames: getServiceNames(role, hsMap),
        practitionerRoleId: role.resource.id
      };
    })
    .filter((entry): entry is CardData => entry !== null);
}
