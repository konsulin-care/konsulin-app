import { useDetailPractitioner } from '@/services/clinic';
import type { PractitionerRole } from 'fhir/r4';
import { useMemo } from 'react';

export interface PractitionerRoleResult {
  detail: ReturnType<typeof useDetailPractitioner>['newData'];
  isDetailLoading: boolean;
  practitionerId: string;
  practitionerGivenName: string | undefined;
  healthcareServiceNames: string[];
  effectiveRole: PractitionerRole | undefined;
  effectiveAvailableTime: PractitionerRole['availableTime'];
  effectiveScheduleId: string;
  practitionerTzOffset: string;
}

/**
 * Derive role-specific data from either page mode (API fetch) or
 * drawer mode (props). Consolidates all isPageMode branches into one hook.
 *
 * @param isPageMode - Whether the component is in standalone page mode
 * @param practitionerRoleId - ID to fetch in page mode
 * @param practitionerRole - Passed role object in drawer mode
 * @param scheduleId - Schedule ID in drawer mode
 */
// eslint-disable-next-line complexity
export function usePractitionerRole(
  isPageMode: boolean,
  practitionerRoleId?: string,
  practitionerRole?: PractitionerRole,
  scheduleId?: string
): PractitionerRoleResult {
  const { newData: detail, isLoading: isDetailLoading } = useDetailPractitioner(
    isPageMode ? (practitionerRoleId ?? '') : ''
  );

  const practitionerId = isPageMode
    ? (detail?.practitioner?.id ?? '')
    : (practitionerRole?.practitioner?.reference?.replace(
        'Practitioner/',
        ''
      ) ?? '');

  const practitionerGivenName = isPageMode
    ? detail?.practitioner?.name?.[0]?.given?.[0]
    : undefined;

  const healthcareServiceNames = useMemo(() => {
    if (isPageMode) {
      return detail?.healthcareServices?.map(s => s.name).filter(Boolean) ?? [];
    }
    return (
      practitionerRole?.healthcareService
        ?.map(h => h.display)
        .filter(Boolean) ?? []
    );
  }, [isPageMode, detail, practitionerRole]);

  const effectiveRole = isPageMode ? detail?.resource : practitionerRole;
  const effectiveAvailableTime = effectiveRole?.availableTime ?? [];
  const effectiveScheduleId = isPageMode
    ? (detail?.schedule?.id ?? '')
    : (scheduleId ?? '');

  const practitionerTzOffset = useMemo(() => {
    const role = effectiveRole;
    if (!role) return 'Z';
    const iso = role.period?.start || role.period?.end;
    if (typeof iso === 'string') {
      const match = /([+-]\d{2}:\d{2}|Z)$/.exec(iso);
      return match ? match[1] : 'Z';
    }
    return 'Z';
  }, [effectiveRole]);

  return {
    detail,
    isDetailLoading,
    practitionerId,
    practitionerGivenName,
    healthcareServiceNames,
    effectiveRole,
    effectiveAvailableTime,
    effectiveScheduleId,
    practitionerTzOffset
  };
}
