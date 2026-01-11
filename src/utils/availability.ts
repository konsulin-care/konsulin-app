import { DayOfWeek, TimeRange, WeeklyAvailability } from '@/types/availability';
import { Organization, PractitionerRole } from 'fhir/r4';

const DAY_NAMES = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'] as const;
const DAY_MAP: Record<string, DayOfWeek> = {
  mon: 0,
  tue: 1,
  wed: 2,
  thu: 3,
  fri: 4,
  sat: 5,
  sun: 6
};

/**
 * Generate a unique ID for a time range
 */
export function generateTimeRangeId(): string {
  return `time-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Initialize weekly availability structure from PractitionerRole
 */
export function initializeWeeklyAvailability(
  practitionerRole: PractitionerRole
): WeeklyAvailability {
  const availability: WeeklyAvailability = {
    0: {},
    1: {},
    2: {},
    3: {},
    4: {},
    5: {},
    6: {}
  };

  if (!practitionerRole.availableTime) {
    return availability;
  }

  // If the practitionerRole has an organization, we use its ID.
  const defaultOrgId = practitionerRole.organization?.reference || 'default';

  practitionerRole.availableTime.forEach(item => {
    if (item.daysOfWeek) {
      item.daysOfWeek.forEach(dayStr => {
        const day = DAY_MAP[dayStr];
        if (day !== undefined) {
          if (!availability[day][defaultOrgId]) {
            availability[day][defaultOrgId] = [];
          }

          if (item.availableStartTime && item.availableEndTime) {
            availability[day][defaultOrgId].push({
              id: generateTimeRangeId(),
              from: item.availableStartTime.substring(0, 5),
              to: item.availableEndTime.substring(0, 5)
            });
          }
        }
      });
    }
  });

  return availability;
}

/**
 * Get the initial selected day based on existing availability
 * Defaults to Monday if no availability exists
 */
export function getInitialSelectedDay(
  weeklyAvailability: WeeklyAvailability
): DayOfWeek {
  // Check days 0-6
  for (let i = 0; i <= 6; i++) {
    const day = i as DayOfWeek;
    if (hasAvailabilityForDay(day, weeklyAvailability)) {
      return day;
    }
  }
  return 1; // Default to Monday (1)
}

/**
 * Check if a day has any availability slots
 */
export function hasAvailabilityForDay(
  day: DayOfWeek,
  weeklyAvailability: WeeklyAvailability
): boolean {
  const dayAvailability = weeklyAvailability[day];
  if (!dayAvailability) return false;

  return Object.values(dayAvailability).some(
    ranges => ranges && ranges.length > 0
  );
}

/**
 * Parse FHIR availableTime to internal WeeklyAvailability format
 */
export function parseFhirAvailableTime(
  availableTime: any[],
  organizations: Organization[]
): WeeklyAvailability {
  return {
    0: {},
    1: {},
    2: {},
    3: {},
    4: {},
    5: {},
    6: {}
  };
}

/**
 * Convert internal WeeklyAvailability to FHIR availableTime format
 */
export function convertToFhirAvailableTime(
  weeklyAvailability: WeeklyAvailability
): any[] {
  const result: any[] = [];

  // Iterate through each day
  for (let i = 0; i <= 6; i++) {
    const day = i as DayOfWeek;
    const dayAvailability = weeklyAvailability[day];

    // Iterate through organizations for that day
    Object.values(dayAvailability).forEach(timeRanges => {
      timeRanges.forEach(range => {
        result.push({
          daysOfWeek: [DAY_NAMES[day]],
          availableStartTime: range.from,
          availableEndTime: range.to
        });
      });
    });
  }

  return result;
}

/**
 * Validate a time range
 */
export function validateTimeRange(timeRange: TimeRange): {
  valid: boolean;
  error?: string;
} {
  // Check if times are in HH:mm format
  const timeRegex = /^([01]?[0-9]|2[0-3]):[0-5][0-9]$/;

  if (!timeRegex.test(timeRange.from)) {
    return { valid: false, error: 'Invalid "from" time format' };
  }

  if (!timeRegex.test(timeRange.to)) {
    return { valid: false, error: 'Invalid "to" time format' };
  }

  // Check if from is before to
  if (timeRange.from >= timeRange.to) {
    return { valid: false, error: '"From" time must be before "to" time' };
  }

  return { valid: true };
}

/**
 * Get day name for display
 */
export function getDayName(day: DayOfWeek): string {
  const names = [
    'Monday',
    'Tuesday',
    'Wednesday',
    'Thursday',
    'Friday',
    'Saturday',
    'Sunday'
  ];
  return names[day];
}

/**
 * Get day short name for display
 */
export function getDayShortName(day: DayOfWeek): string {
  const names = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  return names[day];
}
