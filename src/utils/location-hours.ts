import { DayOfWeek, TimeRange } from '@/types/availability';
import { generateTimeRangeId } from '@/utils/availability';
import { type Location } from 'fhir/r4';

/** FHIR day-of-week short names indexed by internal DayOfWeek (0=Mon, 6=Sun). */
export const DAY_NAMES = [
  'mon',
  'tue',
  'wed',
  'thu',
  'fri',
  'sat',
  'sun'
] as const;

/** Produce an empty hours record for all 7 days. */
export function emptyHoursRecord(): Record<DayOfWeek, TimeRange[]> {
  return { 0: [], 1: [], 2: [], 3: [], 4: [], 5: [], 6: [] };
}

/**
 * Convert FHIR Location.hoursOfOperation to internal Record<DayOfWeek, TimeRange[]>.
 * Strips `:00` seconds suffix from FHIR times.
 */
export function parseHoursFromFHIR(
  hoursOfOperation: Location['hoursOfOperation']
): Record<DayOfWeek, TimeRange[]> {
  const result = emptyHoursRecord();
  if (!hoursOfOperation) return result;

  hoursOfOperation.forEach(entry => {
    if (!entry.daysOfWeek || !entry.openingTime || !entry.closingTime) return;

    const from = entry.openingTime.slice(0, 5);
    const to = entry.closingTime.slice(0, 5);

    entry.daysOfWeek.forEach(dayStr => {
      const dayIndex = DAY_NAMES.indexOf(dayStr);
      if (dayIndex === -1) return;
      const day = dayIndex as DayOfWeek;

      result[day] = [...result[day], { id: generateTimeRangeId(), from, to }];
    });
  });

  return result;
}

/**
 * Convert internal Record<DayOfWeek, TimeRange[]> to FHIR hoursOfOperation array.
 * Appends `:00` seconds suffix for FHIR compatibility.
 */
export function buildFhirHours(hours: Record<DayOfWeek, TimeRange[]>): {
  daysOfWeek: ('mon' | 'tue' | 'wed' | 'thu' | 'fri' | 'sat' | 'sun')[];
  openingTime: string;
  closingTime: string;
}[] {
  const result: {
    daysOfWeek: ('mon' | 'tue' | 'wed' | 'thu' | 'fri' | 'sat' | 'sun')[];
    openingTime: string;
    closingTime: string;
  }[] = [];

  for (let d = 0; d <= 6; d++) {
    const day = d as DayOfWeek;
    const ranges = hours[day];
    if (!ranges || ranges.length === 0) continue;

    ranges.forEach(range => {
      result.push({
        daysOfWeek: [DAY_NAMES[day]],
        openingTime: `${range.from}:00`,
        closingTime: `${range.to}:00`
      });
    });
  }

  return result;
}
