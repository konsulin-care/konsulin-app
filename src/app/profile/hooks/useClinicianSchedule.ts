'use client';

import { useAuth } from '@/context/auth/authContext';
import { useGetPractitionerRolesDetail } from '@/services/clinicians';
import type { IPractitionerRoleDetail } from '@/types/practitioner';
import { PractitionerRoleAvailableTime } from 'fhir/r4';
import { useEffect, useState } from 'react';

type AvailabilityMap = Record<
  string,
  Array<{ fromTime: string; toTime: string }>
>;
type GroupedSchedule = Record<string, { availability: AvailabilityMap }>;

/** Groups available time slots by organization and day of the week. */
function processTimeSlot(
  timeSlot: PractitionerRoleAvailableTime,
  organizationName: string,
  grouped: GroupedSchedule
) {
  if (!Array.isArray(timeSlot.daysOfWeek)) return;
  timeSlot.daysOfWeek.forEach((day: string) => {
    const dayKey = day.charAt(0).toUpperCase() + day.slice(1);
    if (!grouped[organizationName])
      grouped[organizationName] = { availability: {} };
    if (!grouped[organizationName].availability[dayKey]) {
      grouped[organizationName].availability[dayKey] = [];
    }
    grouped[organizationName].availability[dayKey].push({
      fromTime: timeSlot.availableStartTime ?? '',
      toTime: timeSlot.availableEndTime ?? ''
    });
  });
}

/**
 * Fetches and groups the practitioner's schedule by organization and day.
 *
 * Reads auth state internally to get the practitioner's FHIR ID, fetches
 * practitioner role details, and groups available time slots.
 *
 * @returns Grouped schedule, active firms, and loading state.
 */
export function useClinicianSchedule() {
  const { state: authState } = useAuth();
  const [practitionerRolesData, setPractitionerRolesData] = useState<
    IPractitionerRoleDetail[]
  >([]);
  const [groupedByFirmAndDay, setGroupedByFirmAndDay] =
    useState<GroupedSchedule>({});

  const { isLoading: isPractitionerRolesLoading } =
    useGetPractitionerRolesDetail(
      authState.userInfo?.fhirId ?? '',
      (data: unknown) => {
        const resources = (
          (data as Array<{ resource: unknown }>)?.map(
            entry => entry.resource
          ) || []
        ).filter(Boolean);
        setPractitionerRolesData(resources as IPractitionerRoleDetail[]);
      }
    );

  const activeFirms = practitionerRolesData?.filter(firm => firm.active) ?? [];

  useEffect(() => {
    if (!Array.isArray(activeFirms)) return;
    const newGrouped: GroupedSchedule = {};
    activeFirms.forEach(role => {
      if (!role?.organizationData) return;
      const orgName = role.organizationData.name || '';
      if (Array.isArray(role.availableTime)) {
        role.availableTime.forEach(
          (timeSlot: PractitionerRoleAvailableTime) => {
            processTimeSlot(timeSlot, orgName, newGrouped);
          }
        );
      }
    });
    setGroupedByFirmAndDay(newGrouped);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [practitionerRolesData]);

  return { groupedByFirmAndDay, isPractitionerRolesLoading, activeFirms };
}
