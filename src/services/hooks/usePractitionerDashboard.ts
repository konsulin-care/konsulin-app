import { getAvailableDays } from '@/app/practitioner/utils';
import { getAPI } from '@/services/api';
import type { MergedSession } from '@/types/appointment';
import {
  extractAppointmentLocations,
  extractResources
} from '@/utils/fhir/appointment-extract';
import { parseMergedSessions } from '@/utils/helper';
import { getLocationColor } from '@/utils/location-color';
import {
  keepPreviousData,
  useQuery,
  useQueryClient
} from '@tanstack/react-query';
import type { Bundle, BundleEntry, Location, PractitionerRole } from 'fhir/r4';
import { useEffect, useMemo } from 'react';

type UsePractitionerDashboardParams = {
  practitionerId: string | undefined;
  monthStart: Date;
  monthEnd: Date;
  selectedDate?: Date | null;
};

type UsePractitionerDashboardReturn = {
  sessions: MergedSession[];
  daySessions: MergedSession[];
  isDayLoading: boolean;
  dayDots: Map<string, string[]>;
  colorLegend: Array<{ color: string; name: string }>;
  availableTime: PractitionerRole['availableTime'];
  listAvailableDate: Date[];
  isLoading: boolean;
};

/** Build day dots map and color legend from month data. */
function computeDayVisuals(
  appointments: Array<{ date: string | null; locationRef: string | undefined }>,
  locations: Location[]
): {
  dayDots: Map<string, string[]>;
  colorLegend: Array<{ color: string; name: string }>;
} {
  const dayDots = new Map<string, string[]>();
  const legendMap = new Map<string, { color: string; name: string }>();
  const seenLocations = new Set<string>();

  for (const { date, locationRef } of appointments) {
    if (!date) continue;

    const locId = locationRef?.split('/')[1] ?? null;
    const color = getLocationColor(locId);

    const existing = dayDots.get(date) ?? [];
    if (!existing.includes(color)) {
      existing.push(color);
      dayDots.set(date, existing);
    }

    if (locId && !seenLocations.has(locId)) {
      seenLocations.add(locId);
      const loc = locations.find(l => l.id === locId);
      const name = loc?.name ?? loc?.alias?.[0] ?? locId;
      legendMap.set(locId, { color, name });
    }
  }

  const hasUnspecified = appointments.some(ap => !ap.locationRef);
  if (hasUnspecified) {
    legendMap.set('__unspecified__', {
      color: '#D9D9D9',
      name: 'Unspecified Location'
    });
  }

  return { dayDots, colorLegend: [...legendMap.values()] };
}

/** Query M: lightweight month-scoped appointments with role + location includes. */
function useMonthQuery(
  practitionerId: string | undefined,
  utcStart: string,
  utcEnd: string
) {
  return useQuery<Bundle>({
    queryKey: ['dashboard-month', practitionerId, utcStart, utcEnd],
    queryFn: async () => {
      const API = await getAPI();
      const response = await API.get<Bundle>(
        `/fhir/Appointment?actor=Practitioner/${practitionerId}&slot.start=ge${utcStart}&slot.start=le${utcEnd}&_elements=id,participant,start&_include=Appointment:actor:PractitionerRole&_include=Appointment:actor:Location&_count=200`
      );
      return response.data;
    },
    staleTime: 30_000,
    placeholderData: keepPreviousData,
    enabled: Boolean(practitionerId)
  });
}

/** Query D: full day-scoped appointment data with all includes for card rendering. */
function useDayQuery(
  practitionerId: string | undefined,
  selectedDate: Date | undefined | null
) {
  const dayStart = selectedDate
    ? new Date(
        selectedDate.getFullYear(),
        selectedDate.getMonth(),
        selectedDate.getDate()
      )
    : undefined;
  const dayEnd = selectedDate
    ? new Date(
        selectedDate.getFullYear(),
        selectedDate.getMonth(),
        selectedDate.getDate(),
        23,
        59,
        59,
        999
      )
    : undefined;

  const dayStartISO = dayStart?.toISOString();
  const dayEndISO = dayEnd?.toISOString();

  return useQuery<Bundle>({
    queryKey: ['dashboard-day', practitionerId, dayStartISO],
    queryFn: async () => {
      const API = await getAPI();
      const response = await API.get<Bundle>(
        `/fhir/Appointment?actor=Practitioner/${practitionerId}&slot.start=ge${dayStartISO}&slot.start=le${dayEndISO}&_include=Appointment:actor:Patient&_include=Appointment:slot:Slot&_include=Appointment:actor:Location&_include=Appointment:actor:HealthcareService&_count=50`
      );
      return response.data;
    },
    enabled: Boolean(practitionerId) && Boolean(selectedDate)
  });
}

/** Fetch PractitionerRole resources, cached with staleTime: Infinity. */
function useRoleQuery(
  practitionerId: string | undefined,
  monthQuery: ReturnType<typeof useMonthQuery>
) {
  const queryClient = useQueryClient();
  const roleQueryKey = useMemo(
    () => ['dashboard-roles', practitionerId],
    [practitionerId]
  );

  const monthData = monthQuery.data;
  const hasRolesInMonth =
    extractResources<PractitionerRole>(monthData, 'PractitionerRole').length >
    0;

  useEffect(() => {
    if (!monthData || !practitionerId) return;
    const existing = queryClient.getQueryData<PractitionerRole[]>(roleQueryKey);
    if (existing) return;
    const roles = extractResources<PractitionerRole>(
      monthData,
      'PractitionerRole'
    );
    if (roles.length > 0) {
      queryClient.setQueryData(roleQueryKey, roles);
    }
  }, [monthData, practitionerId, queryClient, roleQueryKey]);

  return useQuery({
    queryKey: roleQueryKey,
    queryFn: async () => {
      const API = await getAPI();
      const response = await API.get<Bundle>(
        `/fhir/PractitionerRole?practitioner=Practitioner/${practitionerId}`
      );
      const bundle = response.data;
      return (
        bundle.entry
          ?.filter(
            (e): e is BundleEntry & { resource: PractitionerRole } =>
              e.resource?.resourceType === 'PractitionerRole'
          )
          .map(e => e.resource) ?? []
      );
    },
    staleTime: Infinity,
    gcTime: 30 * 60 * 1000,
    enabled:
      Boolean(practitionerId) &&
      (monthQuery.isError || (Boolean(monthData) && !hasRolesInMonth))
  });
}

/**
 * Orchestrate Query M (month-scoped appointments) and Query D (single-day cards).
 *
 * @param practitionerId - FHIR Practitioner ID
 * @param monthStart - Start of visible month
 * @param monthEnd - End of visible month
 * @param selectedDate - Selected day for full appointment details
 */
export function usePractitionerDashboard({
  practitionerId,
  monthStart,
  monthEnd,
  selectedDate
}: UsePractitionerDashboardParams): UsePractitionerDashboardReturn {
  const utcStart = monthStart.toISOString();
  const utcEnd = monthEnd.toISOString();

  const monthQuery = useMonthQuery(practitionerId, utcStart, utcEnd);
  const monthData = monthQuery.data;

  const { data: roles } = useRoleQuery(practitionerId, monthQuery);

  const dayQuery = useDayQuery(practitionerId, selectedDate);
  const daySessions = dayQuery.data ? parseMergedSessions(dayQuery.data) : [];

  const availableTime = ((roles ?? []) as PractitionerRole[]).flatMap(
    r => r.availableTime ?? []
  );
  const listAvailableDate = getAvailableDays(availableTime, monthStart);

  const locations = extractResources<Location>(monthData, 'Location');
  const appointmentLocations = extractAppointmentLocations(monthData);
  const { dayDots, colorLegend } = computeDayVisuals(
    appointmentLocations,
    locations
  );

  const sessions = monthData ? parseMergedSessions(monthData) : [];

  return {
    sessions,
    daySessions,
    isDayLoading: dayQuery.isFetching,
    dayDots,
    colorLegend,
    availableTime,
    listAvailableDate,
    isLoading: monthQuery.isLoading
  };
}
