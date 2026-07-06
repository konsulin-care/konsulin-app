import { getAPI } from '@/services/api';
import { useQuery } from '@tanstack/react-query';
import type {
  Bundle,
  BundleEntry,
  PractitionerRoleAvailableTime,
  Slot
} from 'fhir/r4';

/**
 * Parse a timezone offset string like "+07:00" or "Z" into total minutes.
 * Returns positive for east of UTC, negative for west.
 *
 * @param tzOffset - Timezone offset string, e.g. "+07:00", "-05:00", or "Z"
 * @returns Offset in minutes (e.g. 420 for +07:00)
 */
export function parseTzOffset(tzOffset: string): number {
  if (tzOffset === 'Z' || !tzOffset) return 0;
  const match = /^([+-])(\d{2}):(\d{2})$/.exec(tzOffset);
  if (!match) return 0;
  const sign = match[1] === '+' ? 1 : -1;
  return (
    sign * (Number.parseInt(match[2], 10) * 60 + Number.parseInt(match[3], 10))
  );
}

/**
 * Convert an ISO 8601 datetime string to minutes-from-midnight
 * in the runtime's local timezone.
 *
 * @param iso - ISO 8601 string (e.g. "2026-07-02T10:00:00+07:00")
 * @returns Minutes since midnight in local timezone
 */
function toLocalMinutes(iso: string): number {
  const date = new Date(iso);
  return date.getHours() * 60 + date.getMinutes();
}

/**
 * Convert a practitioner's local time string (HH:mm) to minutes-from-midnight
 * in the runtime's local timezone, using the practitioner's timezone offset.
 *
 * @param timeStr - Practitioner local time string like "09:00"
 * @param date - Target date used to anchor the conversion
 * @param practitionerTzMinutes - Practitioner's timezone offset in minutes
 * @returns Minutes since midnight in the local timezone
 */
function practitionerToLocalMinutes(
  timeStr: string,
  date: Date,
  practitionerTzMinutes: number
): number {
  const [hours, minutes] = timeStr.split(':').map(Number);
  const utcDate = new Date(
    Date.UTC(
      date.getFullYear(),
      date.getMonth(),
      date.getDate(),
      hours,
      minutes,
      0
    )
  );
  utcDate.setMinutes(utcDate.getMinutes() - practitionerTzMinutes);
  return utcDate.getHours() * 60 + utcDate.getMinutes();
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

/** Convert 'HH:mm' time string to minutes-from-midnight. */
export function timeToMinutes(timeStr: string): number {
  const [hours, minutes] = timeStr.split(':').map(Number);
  return hours * 60 + minutes;
}

/** Convert minutes-from-midnight to 'HH:mm' string. */
export function minutesToTimeStr(minutes: number): string {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return `${String(hours).padStart(2, '0')}:${String(mins).padStart(2, '0')}`;
}

const DAY_LABELS = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'] as const;

/**
 * Given availableTime, busy slots, and a date, compute free windows.
 *
 * Converts all times to the browser's local timezone before comparing,
 * so free slots are displayed in the user's local time.
 *
 * @param availableTime - PractitionerRole.availableTime array
 * @param busySlots - Busy slot objects with start/end ISO strings
 * @param date - Target date (used for day-of-week and timezone conversion)
 * @param durationMinutes - Duration of each free slot in minutes (default 60)
 * @param practitionerTzOffset - Practitioner's timezone offset like "+07:00" or "Z" (default 'Z')
 * @returns Array of free slots with HH:mm start/end in local timezone
 */
export function computeFreeSlots(
  availableTime: PractitionerRoleAvailableTime[],
  busySlots: Array<{ start: string; end: string }>,
  date: Date,
  durationMinutes = 60,
  practitionerTzOffset = 'Z'
): Array<{ start: string; end: string }> {
  const dayLabel = DAY_LABELS[date.getDay()];

  // Find matching available time windows for this day of week
  const matchingWindows = availableTime.filter(a =>
    a.daysOfWeek?.includes(dayLabel)
  );

  if (matchingWindows.length === 0) return [];

  const tzMinutes = parseTzOffset(practitionerTzOffset);

  // Parse busy slots to local minutes-from-midnight
  const busyRanges = busySlots.map(s => ({
    start: toLocalMinutes(s.start),
    end: toLocalMinutes(s.end)
  }));

  const freeSlots: Array<{ start: string; end: string }> = [];

  for (const window of matchingWindows) {
    if (!window.availableStartTime || !window.availableEndTime) continue;

    const startMinutes = practitionerToLocalMinutes(
      window.availableStartTime,
      date,
      tzMinutes
    );
    const endMinutes = practitionerToLocalMinutes(
      window.availableEndTime,
      date,
      tzMinutes
    );

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

/**
 * Hook to fetch busy slots for a practitioner role on a given date.
 *
 * Queries Slot resources with explicit non-free statuses
 * (busy, busy-unavailable, busy-tentative) since Blaze does not
 * support the :not search modifier.
 */
export function usePractitionerSlots(practitionerRoleId: string, date: string) {
  return useQuery({
    queryKey: ['practitioner-slots', practitionerRoleId, date],
    queryFn: async () => {
      const API = await getAPI();
      const geParam = encodeURIComponent(`${date}T00:00:00Z`);
      const leParam = encodeURIComponent(`${date}T23:59:59Z`);
      const response = await API.get<Bundle>(
        `/fhir/Slot?schedule.actor=PractitionerRole/${practitionerRoleId}` +
          `&start=ge${geParam}&start=le${leParam}&status=busy,busy-unavailable,busy-tentative`
      );
      return response.data.entry ?? [];
    },
    select: (entries: BundleEntry[]) =>
      entries
        .filter(e => e.resource?.resourceType === 'Slot')
        .map(e => e.resource as Slot)
        .map(s => ({ start: s.start, end: s.end })),
    enabled: Boolean(practitionerRoleId) && Boolean(date)
  });
}

/**
 * Hook to fetch busy slots for a practitioner across all roles.
 *
 * Queries Slot resources by Practitioner ID (not PractitionerRole)
 * to get all occupied slots regardless of which role they belong to.
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
          `&start=ge${geParam}&start=le${leParam}&status=busy,busy-unavailable,busy-tentative`
      );
      return response.data.entry ?? [];
    },
    select: (entries: BundleEntry[]) =>
      entries
        .filter(e => e.resource?.resourceType === 'Slot')
        .map(e => e.resource as Slot)
        .map(s => ({ start: s.start, end: s.end })),
    enabled: Boolean(practitionerId) && Boolean(date)
  });
}
