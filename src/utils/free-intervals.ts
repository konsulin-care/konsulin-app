import type { PractitionerRoleAvailableTime, Slot } from 'fhir/r4';

/**
 * Day name constants (internal: 0=Mon, 6=Sun).
 */
const DAY_NAMES = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'] as const;

/** A time range in minutes from midnight. */
interface MinuteRange {
  start: number;
  end: number;
}

/**
 * A bookable time interval with ISO datetime start/end strings.
 */
export interface BookableInterval {
  start: string;
  end: string;
}

/**
 * Convert a JavaScript Date to an internal day index (0=Monday, 6=Sunday).
 */
/** Day-of-week name literal type. */
type DayName = (typeof DAY_NAMES)[number];

function dateToDayIndex(date: Date): number {
  return (date.getDay() + 6) % 7;
}

/**
 * Parse a time string (HH:mm or HH:mm:ss) to total minutes since midnight.
 */
function parseTimeToMinutes(time: string): number {
  const parts = time.split(':');
  const h = Number(parts[0]) || 0;
  const m = Number(parts[1]) || 0;
  return h * 60 + m;
}

/**
 * Format minutes since midnight back to HH:mm.
 */
function minutesToTime(totalMinutes: number): string {
  const h = Math.floor(totalMinutes / 60);
  const m = totalMinutes % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

/**
 * Format a date object to YYYY-MM-DD.
 */
function formatDateStr(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/**
 * Check if a slot's start datetime falls on the given date string.
 */
function slotMatchesDate(slot: Slot, dateStr: string): boolean {
  return slot.start?.startsWith(dateStr) ?? false;
}

/**
 * Extract time-only portion (HH:mm) from an ISO datetime string.
 */
function extractTime(isoString: string): string {
  return isoString.slice(11, 16);
}

/**
 * Build available minute ranges from PractitionerRole.availableTime for a specific day.
 */
function buildAvailableRanges(
  availableTime: PractitionerRoleAvailableTime[],
  dayName: DayName
): MinuteRange[] {
  const dayWindows = availableTime.filter(
    at =>
      at.daysOfWeek?.includes(dayName) &&
      at.availableStartTime &&
      at.availableEndTime
  );

  return dayWindows.map(at => ({
    start: parseTimeToMinutes(at.availableStartTime),
    end: parseTimeToMinutes(at.availableEndTime)
  }));
}

/**
 * Merge overlapping or adjacent minute ranges. Expects sorted input.
 */
function mergeRanges(ranges: MinuteRange[]): MinuteRange[] {
  const merged: MinuteRange[] = [];
  for (const range of ranges) {
    const last = merged.at(-1);
    if (last && range.start <= last.end) {
      last.end = Math.max(last.end, range.end);
    } else {
      merged.push({ start: range.start, end: range.end });
    }
  }
  return merged;
}

/**
 * Collect non-free slots as minute ranges for a given date.
 */
function buildBlockerRanges(slots: Slot[], dateStr: string): MinuteRange[] {
  const blockers: MinuteRange[] = slots
    .filter(s => s.status !== 'free' && slotMatchesDate(s, dateStr))
    .map(s => ({
      start: parseTimeToMinutes(extractTime(s.start)),
      end: parseTimeToMinutes(extractTime(s.end))
    }));

  blockers.sort((a, b) => a.start - b.start);
  return blockers;
}

/**
 * Process one available range against blocker ranges, accumulating free segments.
 * Returns the list of free segments discovered for this range.
 */
function processOneRange(
  avail: MinuteRange,
  blockers: MinuteRange[]
): MinuteRange[] {
  const segments: MinuteRange[] = [];
  let currentStart = avail.start;

  for (const blocker of blockers) {
    if (blocker.end <= currentStart) {
      continue;
    }
    if (blocker.start >= avail.end) {
      break;
    }

    if (blocker.start > currentStart) {
      segments.push({
        start: currentStart,
        end: Math.min(blocker.start, avail.end)
      });
    }

    currentStart = Math.max(currentStart, blocker.end);

    if (currentStart >= avail.end) {
      break;
    }
  }

  if (currentStart < avail.end) {
    segments.push({ start: currentStart, end: avail.end });
  }

  return segments;
}

/**
 * Subtract blocker ranges from available ranges, producing free minute ranges.
 */
function subtractBlockers(
  availRanges: MinuteRange[],
  blockerRanges: MinuteRange[]
): MinuteRange[] {
  const free: MinuteRange[] = [];

  for (const avail of availRanges) {
    const segments = processOneRange(avail, blockerRanges);
    free.push(...segments);
  }

  return free;
}

/**
 * Partition free minute ranges into bookable intervals of a given duration.
 */
function partitionIntoIntervals(
  freeRanges: MinuteRange[],
  durationMinutes: number,
  dateStr: string
): BookableInterval[] {
  const result: BookableInterval[] = [];

  for (const fr of freeRanges) {
    const totalFreeMinutes = fr.end - fr.start;
    const intervalCount = Math.floor(totalFreeMinutes / durationMinutes);

    for (let i = 0; i < intervalCount; i++) {
      const startMin = fr.start + i * durationMinutes;
      const endMin = startMin + durationMinutes;

      result.push({
        start: `${dateStr}T${minutesToTime(startMin)}:00.000Z`,
        end: `${dateStr}T${minutesToTime(endMin)}:00.000Z`
      });
    }
  }

  return result;
}

/**
 * Compute bookable free intervals for a given date.
 *
 * Takes a practitioner's available time windows, non-free Slots (busy-unavailable,
 * busy-tentative, booked), and a service duration in minutes. Returns an array
 * of {@link BookableInterval} that represent contiguous bookable slots within
 * the practitioner's free time.
 *
 * Only Slot resources with a status other than 'free' are treated as blockers.
 * Slots with status 'free' are ignored (they represent available time).
 *
 * @param availableTime - PractitionerRole.availableTime arrays (day + time windows)
 * @param slots - All Slot resources for the practitioner (free and non-free)
 * @param durationMinutes - Duration of each bookable interval in minutes
 * @param date - The target date
 * @returns Array of bookable intervals with ISO datetime start/end
 */
export function computeFreeIntervals(
  availableTime: PractitionerRoleAvailableTime[],
  slots: Slot[],
  durationMinutes: number,
  date: Date
): BookableInterval[] {
  const dayName: DayName = DAY_NAMES[dateToDayIndex(date)];
  const dateStr = formatDateStr(date);

  const rawRanges = buildAvailableRanges(availableTime, dayName);
  if (rawRanges.length === 0) {
    return [];
  }

  rawRanges.sort((a, b) => a.start - b.start);
  const mergedAvail = mergeRanges(rawRanges);
  const blockerRanges = buildBlockerRanges(slots, dateStr);
  const freeRanges = subtractBlockers(mergedAvail, blockerRanges);

  return partitionIntoIntervals(freeRanges, durationMinutes, dateStr);
}
