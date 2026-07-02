import { IPractitionerRoleDetail } from '@/types/practitioner';
import { getUtcDayRange } from '@/utils/helper';
import { useMutation, useQuery } from '@tanstack/react-query';
import { AxiosResponse } from 'axios';

import {
  Bundle,
  BundleEntry,
  Invoice,
  Organization,
  PractitionerRole,
  PractitionerRoleAvailableTime,
  Schedule,
  Slot
} from 'fhir/r4';
import { getAPI } from './api';

const DAY_LABELS = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'] as const;

/** Check if an invoice has a participant matching the given role. */
function hasParticipantForRole(
  invoice: BundleEntry<Invoice>,
  roleId: string
): boolean {
  return (
    invoice.resource?.participant?.some(
      p => p.actor?.reference === `PractitionerRole/${roleId}`
    ) ?? false
  );
}

/** Check if a schedule has an actor matching the given role. */
function hasActorForRole(
  schedule: BundleEntry<Schedule>,
  roleId: string
): boolean {
  return (
    schedule.resource?.actor?.some(
      actor => actor.reference === `PractitionerRole/${roleId}`
    ) ?? false
  );
}

/** Fetch practitioner availability for a given date range. */
export const useFindAvailability = ({
  practitionerRoleId,
  dateReference,
  startFrom,
  startTo,
  dayKey
}: {
  practitionerRoleId: string;
  dateReference?: string | Date | null;
  startFrom?: string; // ISO string boundary with offset, e.g., 2025-10-13T00:00:00+07:00
  startTo?: string; // ISO string boundary with offset, e.g., 2025-10-13T23:59:59+07:00
  dayKey?: string; // cache scoping key for day-level caching (e.g., YYYY-MM-DD+offset)
}) => {
  const computed = dateReference
    ? getUtcDayRange(new Date(dateReference))
    : null;
  const utcStart = computed?.utcStart;
  const utcEnd = computed?.utcEnd;

  const ge = startFrom || utcStart;
  const le = startTo || utcEnd;

  return useQuery({
    queryKey: [
      'find-availability',
      practitionerRoleId,
      dayKey || dateReference || ge
    ],
    queryFn: async () => {
      const API = await getAPI();
      // Encode datetimes so '+' in timezone is not interpreted as space
      const geParam = encodeURIComponent(ge);
      const leParam = encodeURIComponent(le);
      const response = await API.get<Bundle>(
        `/fhir/Slot?schedule.actor=PractitionerRole/${practitionerRoleId}&start=ge${geParam}&start=le${leParam}&_include=Slot:schedule`
      );
      return response;
    },
    select: response => response.data.entry ?? null,
    enabled: Boolean(practitionerRoleId) && Boolean(ge) && Boolean(le),
    staleTime: 5 * 60 * 1000 // 5 minutes
  });
};

/** Fetch detail for all roles belonging to a practitioner. */
export const useGetPractitionerRolesDetail = (
  practitionerId: string,
  onSuccess?: (data: BundleEntry<IPractitionerRoleDetail>[]) => void
) => {
  // eslint-disable-next-line @typescript-eslint/no-deprecated
  return useQuery<
    AxiosResponse,
    Error,
    BundleEntry<IPractitionerRoleDetail>[],
    [string, string]
  >(
    ['practitioner-roles', practitionerId],
    async () => {
      const API = await getAPI();
      const response = await API.get<Bundle>(
        `/fhir/PractitionerRole?practitioner=${practitionerId}&_include=PractitionerRole:organization&_include=PractitionerRole:practitioner&_revinclude=Invoice:participant&_revinclude=Schedule:actor`
      );
      return response;
    },
    {
      select: response => {
        const entries = (response.data as Bundle).entry || [];

        const practitionerRoles = entries.filter(
          (entry: BundleEntry) =>
            entry.resource?.resourceType === 'PractitionerRole'
        );

        const organizations = entries.filter(
          (entry: BundleEntry) =>
            entry.resource?.resourceType === 'Organization'
        );

        const schedules = entries.filter(
          (entry: BundleEntry) => entry.resource?.resourceType === 'Schedule'
        );

        const invoices = entries.filter(
          (entry: BundleEntry) => entry.resource?.resourceType === 'Invoice'
        );

        // map PractitionerRole entries
        return practitionerRoles.map((role: BundleEntry<PractitionerRole>) => {
          const roleId = role.resource.id;
          const orgRef = role.resource.organization?.reference?.split('/')[1];

          const organizationData = organizations.find(
            (org: BundleEntry<Organization>) => org.resource.id === orgRef
          )?.resource;

          const invoiceData = invoices.find((invoice: BundleEntry<Invoice>) =>
            hasParticipantForRole(invoice, roleId)
          )?.resource;

          const scheduleData = schedules
            .filter((schedule: BundleEntry<Schedule>) =>
              hasActorForRole(schedule, roleId)
            )
            .map((schedule: BundleEntry<Schedule>) => schedule.resource);

          const result = {
            ...role,
            resource: {
              ...role.resource,
              organizationData,
              invoiceData,
              scheduleData
            }
          };
          return result as unknown as BundleEntry<IPractitionerRoleDetail>;
        });
      },
      enabled: Boolean(practitionerId),
      onSuccess
    }
  );
};

/** Mutation hook to update practitioner role info via PATCH. */
export const useUpdatePractitionerInfo = () => {
  return useMutation({
    mutationKey: ['update-practitioner-role'],
    mutationFn: async (payload: PractitionerRole) => {
      const API = await getAPI();
      try {
        const response = await API.put(
          `/fhir/PractitionerRole/${payload.id}`,
          payload
        );
        return response.data; // eslint-disable-line @typescript-eslint/no-unsafe-return
      } catch (error) {
        console.error('Error when updating practitioner information :', error);
        throw error;
      }
    }
  });
};

/** Mutation hook to create a new invoice for a practitioner role. */
export const useCreateInvoice = () => {
  return useMutation({
    mutationKey: ['create-invoice'],
    mutationFn: async (payload: Invoice) => {
      const API = await getAPI();
      try {
        const response = await API.post<Invoice>('/fhir/Invoice', payload);
        return response.data;
      } catch (error) {
        console.error('Error when creating invoice :', error);
        throw error;
      }
    }
  });
};

/** Mutation hook to update an existing invoice for a practitioner role. */
export const useUpdateInvoice = () => {
  return useMutation({
    mutationKey: ['update-invoice'],
    mutationFn: async (payload: Invoice) => {
      const API = await getAPI();
      try {
        const response = await API.put<Invoice>(
          `/fhir/Invoice/${payload.id}`,
          payload
        );
        return response.data;
      } catch (error) {
        console.error('Error when updating invoice :', error);
        throw error;
      }
    }
  });
};

/** Extract minutes-from-midnight from an ISO 8601 time string. */
function toMinutes(iso: string): number {
  // ISO format: 2026-07-02T10:00:00+07:00 or 2026-07-02T10:00:00Z
  const timePart = iso.split('T')[1] ?? '00:00:00';
  const [h, m] = timePart.split(':').map(Number);
  return h * 60 + m;
}

/** Check whether [bStart, bEnd) overlaps (cStart, cEnd) using minute-of-day. */
function minutesOverlap(
  bStart: number,
  bEnd: number,
  cStart: number,
  cEnd: number
): boolean {
  return bStart < cEnd && bEnd > cStart;
}

/**
 * Given availableTime, busy slots, and a date, compute free windows.
 *
 * Compares time-of-day using minutes-from-midnight to avoid timezone issues.
 * Busy slot ISO strings are parsed for their time-of-day component only.
 *
 * @param availableTime - PractitionerRole.availableTime array
 * @param busySlots - Busy slot objects with start/end ISO strings
 * @param date - Target date (used only for day-of-week)
 * @param durationMinutes - Duration of each free slot in minutes (default 60)
 * @returns Array of free slots with HH:mm start/end
 */
export function computeFreeSlots(
  availableTime: PractitionerRoleAvailableTime[],
  busySlots: Array<{ start: string; end: string }>,
  date: Date,
  durationMinutes: number = 60
): Array<{ start: string; end: string }> {
  const dayLabel = DAY_LABELS[date.getDay()];

  // Find matching available time windows for this day of week
  const matchingWindows = availableTime.filter(
    a => a.daysOfWeek?.includes(dayLabel)
  );

  if (matchingWindows.length === 0) return [];

  // Parse busy slot time-of-day into minutes-from-midnight
  const busyRanges = busySlots.map(s => ({
    start: toMinutes(s.start),
    end: toMinutes(s.end)
  }));

  const freeSlots: Array<{ start: string; end: string }> = [];

  for (const window of matchingWindows) {
    if (!window.availableStartTime || !window.availableEndTime) continue;

    const startMinutes = timeToMinutes(window.availableStartTime);
    const endMinutes = timeToMinutes(window.availableEndTime);

    // Generate candidate slots of durationMinutes length
    let cursor = startMinutes;
    while (cursor + durationMinutes <= endMinutes) {
      const slotStart = cursor;
      const slotEnd = cursor + durationMinutes;

      const isOccupied = busyRanges.some(b =>
        minutesOverlap(b.start, b.end, slotStart, slotEnd)
      );

      if (!isOccupied) {
        freeSlots.push({
          start: minutesToTimeStr(slotStart),
          end: minutesToTimeStr(slotEnd)
        });
      }

      cursor += durationMinutes;
    }
  }

  return freeSlots;
}

/** Convert 'HH:mm' time string to minutes-from-midnight. */
function timeToMinutes(timeStr: string): number {
  const [h, m] = timeStr.split(':').map(Number);
  return h * 60 + (m ?? 0);
}

/** Convert minutes-from-midnight to 'HH:mm' string. */
function minutesToTimeStr(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

/**
 * Hook to fetch busy slots for a practitioner role on a given date.
 *
 * Queries Slot resources with status:not=free to get all occupied slots
 * (busy, busy-unavailable, busy-tentative).
 */
export function usePractitionerSlots(
  practitionerRoleId: string,
  date: string // ISO date string, e.g. '2026-07-02'
) {
  return useQuery({
    queryKey: ['practitioner-slots', practitionerRoleId, date],
    queryFn: async () => {
      const API = await getAPI();
      const geParam = encodeURIComponent(`${date}T00:00:00Z`);
      const leParam = encodeURIComponent(`${date}T23:59:59Z`);
      const response = await API.get<Bundle>(
        `/fhir/Slot?schedule.actor=PractitionerRole/${practitionerRoleId}` +
          `&start=ge${geParam}&start=le${leParam}&status:not=free`
      );
      return response.data.entry ?? [];
    },
    select: (entries: BundleEntry[]) =>
      entries
        .filter(e => e.resource?.resourceType === 'Slot')
        .map(e => (e.resource as Slot))
        .map(s => ({ start: s.start, end: s.end })),
    enabled: Boolean(practitionerRoleId) && Boolean(date)
  });
}

/**
 * Hook to fetch busy slots for a practitioner across all roles.
 *
 * Queries Slot resources by Practitioner ID (not PractitionerRole)
 * to get all occupied slots regardless of which role they belong to.
 * Returns array of {start, end} ISO strings.
 *
 * @param practitionerId - FHIR Practitioner ID
 * @param date - ISO date string (e.g. '2026-07-02')
 * @returns Query result with Array<{start: string; end: string}>
 */
export function useBusySlotsByPractitioner(
  practitionerId: string,
  date: string
) {
  return useQuery({
    queryKey: ['practitioner-busy-slots', practitionerId, date],
    queryFn: async () => {
      const API = await getAPI();
      const geParam = encodeURIComponent(`${date}T00:00:00Z`);
      const leParam = encodeURIComponent(`${date}T23:59:59Z`);
      const response = await API.get<Bundle>(
        `/fhir/Slot?schedule.actor=Practitioner/${practitionerId}` +
          `&start=ge${geParam}&start=le${leParam}&status:not=free`
      );
      return response.data.entry ?? [];
    },
    select: (entries: BundleEntry[]) =>
      entries
        .filter(e => e.resource?.resourceType === 'Slot')
        .map(e => (e.resource as Slot))
        .map(s => ({ start: s.start, end: s.end })),
    enabled: Boolean(practitionerId) && Boolean(date)
  });
}
