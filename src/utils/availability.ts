import { DayOfWeek, TimeRange, WeeklyAvailability } from '@/types/availability';
import { PractitionerRole } from 'fhir/r4';

/**
 * Day names array using internal DayOfWeek convention (0 = Monday, 6 = Sunday)
 * Note: This differs from JavaScript's Date.getDay() which returns (0 = Sunday, 6 = Saturday)
 */
const DAY_NAMES = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'] as const;

/**
 * Mapping from day name strings to internal DayOfWeek index (0 = Monday, 6 = Sunday)
 * Note: This differs from JavaScript's Date.getDay() which returns (0 = Sunday, 6 = Saturday)
 */
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
 * Convert JavaScript Date.getDay() index (0 = Sunday, 6 = Saturday)
 * to internal DayOfWeek index (0 = Monday, 6 = Sunday)
 */
export function fromJsDayIndex(jsDayIndex: number): DayOfWeek {
  // JavaScript: 0=Sun, 1=Mon, 2=Tue, 3=Wed, 4=Thu, 5=Fri, 6=Sat
  // Internal:   0=Mon, 1=Tue, 2=Wed, 3=Thu, 4=Fri, 5=Sat, 6=Sun
  return ((jsDayIndex + 6) % 7) as DayOfWeek;
}

/**
 * Convert internal DayOfWeek index (0 = Monday, 6 = Sunday)
 * to JavaScript Date.getDay() index (0 = Sunday, 6 = Saturday)
 */
export function toJsDayIndex(dayOfWeek: DayOfWeek): number {
  // Internal:   0=Mon, 1=Tue, 2=Wed, 3=Thu, 4=Fri, 5=Sat, 6=Sun
  // JavaScript: 0=Sun, 1=Mon, 2=Tue, 3=Wed, 4=Thu, 5=Fri, 6=Sat
  return (dayOfWeek + 1) % 7;
}

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
 * Initialize weekly availability structure from multiple PractitionerRoles
 */
export function initializeWeeklyAvailabilityFromRoles(
  practitionerRoles: PractitionerRole[]
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

  if (!practitionerRoles || practitionerRoles.length === 0) {
    return availability;
  }

  // Process each practitioner role
  practitionerRoles.forEach(practitionerRole => {
    if (!practitionerRole.availableTime) {
      return;
    }

    // If the practitionerRole has an organization, we use its ID.
    const orgId =
      practitionerRole.organization?.reference || practitionerRole.id;

    practitionerRole.availableTime.forEach(item => {
      if (item.daysOfWeek) {
        item.daysOfWeek.forEach(dayStr => {
          const day = DAY_MAP[dayStr];
          if (day !== undefined) {
            if (!availability[day][orgId]) {
              availability[day][orgId] = [];
            }

            if (item.availableStartTime && item.availableEndTime) {
              availability[day][orgId].push({
                id: generateTimeRangeId(),
                from: item.availableStartTime.substring(0, 5),
                to: item.availableEndTime.substring(0, 5)
              });
            }
          }
        });
      }
    });
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
  return 0; // Default to Monday (0)
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
 * Convert internal WeeklyAvailability to FHIR availableTime format for a specific organization
 */
export function convertToFhirAvailableTimeForOrganization(
  weeklyAvailability: WeeklyAvailability,
  organizationId: string
): any[] {
  const result: any[] = [];

  // Iterate through each day
  for (let i = 0; i <= 6; i++) {
    const day = i as DayOfWeek;
    const dayAvailability = weeklyAvailability[day];

    // Get time ranges only for the specific organization
    const timeRanges = dayAvailability[organizationId];
    if (timeRanges) {
      timeRanges.forEach(range => {
        result.push({
          daysOfWeek: [DAY_NAMES[day]],
          availableStartTime: range.from,
          availableEndTime: range.to
        });
      });
    }
  }

  return result;
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
