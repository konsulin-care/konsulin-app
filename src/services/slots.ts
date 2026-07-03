import { getAPI } from '@/services/api';
import { useQuery } from '@tanstack/react-query';
import type { Bundle, BundleEntry, PractitionerRoleAvailableTime, Slot } from 'fhir/r4';

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

/** Convert 'HH:mm' time string to minutes-from-midnight. */
export function timeToMinutes(timeStr: string): number {
  const [h, m] = timeStr.split(':').map(Number);
  return h * 60 + (m ?? 0);
}

/** Convert minutes-from-midnight to 'HH:mm' string. */
export function minutesToTimeStr(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

const DAY_LABELS = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];

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
  durationMinutes = 60
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

/**
 * Hook to fetch busy slots for a practitioner role on a given date.
 *
 * Queries Slot resources with status:not=free to get all occupied slots
 * (busy, busy-unavailable, busy-tentative).
 */
export function usePractitionerSlots(
  practitionerRoleId: string,
  date: string
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
