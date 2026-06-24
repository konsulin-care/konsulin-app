/* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access */
import { addMinutes, format, parse } from 'date-fns';
import type { PractitionerRoleAvailableTime } from 'fhir/r4';

/* returns all available appointment days for a given month.
 * example:
 * if availableTime = [{ daysOfWeek: ['mon', 'wed'] }] and month = April 2025,
 * it will return all mondays and wednesdays in April 2025
 */
export const getAvailableDays = (
  availableTime: PractitionerRoleAvailableTime[],
  month: Date
): Date[] => {
  const availableDays: Date[] = [];
  const daysOfWeekMap: Record<string, number> = {
    mon: 1,
    tue: 2,
    wed: 3,
    thu: 4,
    fri: 5,
    sat: 6,
    sun: 0
  };

  // loop through available times and days of the week
  availableTime.forEach(({ daysOfWeek }) => {
    daysOfWeek.forEach((day: string) => {
      const dayIndex = daysOfWeekMap[day];

      const firstDayOfMonth = new Date(
        month.getFullYear(),
        month.getMonth(),
        1
      );

      // find the first occurrence of the specified day
      const currentDate = new Date(firstDayOfMonth);
      while (currentDate.getDay() !== dayIndex) {
        currentDate.setDate(currentDate.getDate() + 1);
      }

      // add every occurrence of the specified day in the month (once a week)
      while (currentDate.getMonth() === month.getMonth()) {
        availableDays.push(new Date(currentDate));
        currentDate.setDate(currentDate.getDate() + 7); // +7 to move to the next week
      }
    });
  });

  return availableDays;
};

/* generate time slots at 30-minute intervals
 * based on the practitioner's start and end times */
export const getTimeSlots = (startTime: string, endTime: string) => {
  const slots: string[] = [];
  let start = parse(startTime, 'HH:mm:ss', new Date());
  const end = parse(endTime, 'HH:mm:ss', new Date());

  while (start <= end) {
    slots.push(format(start, 'HH:mm'));
    start = addMinutes(start, 30);
  }

  return slots;
};

/** Untrusted intent payload from sessionStorage / localStorage. */
export type AppointmentPayload = {
  path: string;
  slot: { date: string; startTime: string; slotId?: string };
  formData: { session_type: string; problem_brief: string };
};

/**
 * Runtime type guard for AppointmentPayload.
 * Validates that a parsed JSON or intent payload has the expected shape.
 */
export function isAppointmentPayload(obj: unknown): obj is AppointmentPayload {
  if (typeof obj !== 'object' || obj === null) return false;
  const payload = obj as Record<string, unknown>;
  if (typeof payload.path !== 'string' || !payload.path) return false;
  if (typeof payload.slot !== 'object' || payload.slot === null) return false;
  const slot = payload.slot as Record<string, unknown>;
  if (typeof slot.date !== 'string' || !slot.date) return false;
  if (typeof slot.startTime !== 'string' || !slot.startTime) return false;
  if (typeof payload.formData !== 'object' || payload.formData === null)
    return false;
  const formData = payload.formData as Record<string, unknown>;
  return (
    typeof formData.session_type === 'string' &&
    typeof formData.problem_brief === 'string'
  );
}

/**
 * Checks whether a stored intent payload path matches the current practitioner.
 *
 * The path is saved as `/practitioner?practitionerRoleId=<id>` by booking-form-section.
 * Parses it as a URL and compares the `practitionerRoleId` query parameter exactly
 * against the provided practitionerRoleId.
 */
export function matchesPractitionerFromPath(
  path: string,
  practitionerRoleId: string
): boolean {
  if (!path || !practitionerRoleId) return false;
  try {
    const url = new URL(path, 'http://localhost');
    return url.searchParams.get('practitionerRoleId') === practitionerRoleId;
  } catch {
    return false;
  }
}

// Helper function to extract slotMinutes from Schedule's comment field
/** Extract slot duration in minutes from a Schedule's comment field. */
export function getSlotMinutesText(schedule: unknown): string {
  if (!schedule) {
    return '';
  }
  if (typeof schedule !== 'object' || schedule === null) {
    return '';
  }
  const scheduleRecord = schedule as Record<string, unknown>;
  if (typeof scheduleRecord.comment !== 'string') {
    return '';
  }
  try {
    const commentObj = JSON.parse(scheduleRecord.comment);
    if (typeof commentObj.slotMinutes === 'number') {
      return commentObj.slotMinutes > 0
        ? ` ${commentObj.slotMinutes} Menit`
        : '';
    } else {
      return '';
    }
  } catch {
    return '';
  }
}
