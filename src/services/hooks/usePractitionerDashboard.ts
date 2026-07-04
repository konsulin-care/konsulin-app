/* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-return, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-argument */

import { getAPI } from '@/services/api';
import type { MergedSession } from '@/types/appointment';
import { getAvailableDays } from '@/app/practitioner/utils';
import { parseMergedSessions } from '@/utils/helper';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { format } from 'date-fns';
import { useEffect, useMemo } from 'react';
import type {
  Appointment,
  Bundle,
  BundleEntry,
  Location,
  PractitionerRole
} from 'fhir/r4';

type ColorEntry = { color: string; name: string };

const LOCATION_COLORS = [
  '#13C2C2',
  '#F5222D',
  '#1890FF',
  '#FA8C16',
  '#722ED1',
  '#52C41A',
  '#EB2F96',
  '#FADB14'
];

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
  colorLegend: ColorEntry[];
  availableTime: PractitionerRole['availableTime'];
  listAvailableDate: Date[];
  isLoading: boolean;
};

function getLocationColor(locationId: string | null): string {
  if (!locationId) return '#D9D9D9';
  let hash = 0;
  for (let i = 0; i < locationId.length; i++) {
    hash = locationId.charCodeAt(i) + ((hash << 5) - hash);
  }
  return LOCATION_COLORS[Math.abs(hash) % LOCATION_COLORS.length];
}

/** Extract all resources of a given type from a FHIR Bundle. */
function extractResources<T extends { resourceType: string }>(
  bundle: Bundle | undefined,
  resourceType: string
): T[] {
  return (
    (bundle?.entry ?? [])
      .filter(
        (e): e is BundleEntry & { resource: T } =>
          e.resource?.resourceType === resourceType
      )
      .map(e => e.resource) ?? []
  );
}

type AppointmentLocation = {
  date: string | null;
  locationRef: string | undefined;
};

/** Extract date and location reference from each appointment in the bundle. */
function extractAppointmentLocations(
  bundle: Bundle | undefined
): AppointmentLocation[] {
  return extractResources<Appointment>(bundle, 'Appointment').flatMap(a => ({
    date: a.start ? format(new Date(a.start), 'yyyy-MM-dd') : null,
    locationRef: (a.participant ?? []).find(
      (p: Appointment['participant'][number]) =>
        p.actor?.reference?.startsWith('Location/')
    )?.actor?.reference
  }));
}

/** Build day dots map and color legend from month data. */
function computeDayVisuals(
  appointments: AppointmentLocation[],
  locations: Location[]
): { dayDots: Map<string, string[]>; colorLegend: ColorEntry[] } {
  const dayDots = new Map<string, string[]>();
  const legendMap = new Map<string, ColorEntry>();
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
      const name = loc?.name ?? (loc?.alias?.[0] ?? locId);
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
  return useQuery({
    queryKey: ['dashboard-month', practitionerId, utcStart, utcEnd],
    queryFn: async () => {
      const API = await getAPI();
      const response = await API.get<Bundle>(
        `/fhir/Appointment?actor=Practitioner/${practitionerId}&slot.start=ge${utcStart}&slot.start=le${utcEnd}&_elements=id,participant,start&_include=Appointment:actor:PractitionerRole&_include=Appointment:actor:Location&_count=200`
      );
      return response.data;
    },
    staleTime: 30_000,
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

  return useQuery({
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
  monthData: Bundle | undefined
) {
  const queryClient = useQueryClient();
  const roleQueryKey = useMemo(
    () => ['dashboard-roles', practitionerId],
    [practitionerId]
  );

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

  return useQuery<PractitionerRole[]>({
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
    enabled: Boolean(practitionerId)
  });
}

/**
 * Orchestrate Query M (month-scoped appointments) and Query D (single-day cards).
 *
 * Uses a lightweight month query to derive day dots, color legend, and
 * calendar availability from PractitionerRole + Location resources.
 * Full appointment data is fetched per selected day for card rendering.
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

  const { data: roles } = useRoleQuery(practitionerId, monthData);

  // Query D: full day data when a day is selected
  const dayQuery = useDayQuery(practitionerId, selectedDate);
  const daySessions = dayQuery.data
    ? parseMergedSessions(dayQuery.data)
    : [];

  // Compute available days from aggregated PractitionerRole availableTime
  const availableTime = (roles ?? []).flatMap(
    r => r.availableTime ?? []
  );
  const listAvailableDate = getAvailableDays(availableTime, monthStart);

  // Extract locations from month data
  const locations = extractResources<Location>(monthData, 'Location');

  // Compute day dots and color legend
  const appointmentLocations = extractAppointmentLocations(monthData);
  const { dayDots, colorLegend } = computeDayVisuals(
    appointmentLocations,
    locations
  );

  const sessions = monthData ? parseMergedSessions(monthData) : [];

  return {
    sessions,
    daySessions,
    isDayLoading: dayQuery.isLoading,
    dayDots,
    colorLegend,
    availableTime,
    listAvailableDate,
    isLoading: monthQuery.isLoading
  };
}
