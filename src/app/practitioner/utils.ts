/* eslint-disable @typescript-eslint/no-explicit-any */
import { addMinutes, format, parse } from 'date-fns';

/* returns all available appointment days for a given month.
 * example:
 * if availableTime = [{ daysOfWeek: ['mon', 'wed'] }] and month = April 2025,
 * it will return all mondays and wednesdays in April 2025
 */
export const getAvailableDays = (availableTime: any[], month: Date): Date[] => {
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

// Helper function to extract slotMinutes from Schedule's comment field
export function getSlotMinutesText(schedule: any): string {
  if (!schedule) {
    return '';
  }
  if (typeof schedule !== 'object') {
    return '';
  }
  if (typeof schedule.comment !== 'string') {
    return '';
  }
  try {
    const commentObj = JSON.parse(schedule.comment);
    if (typeof commentObj.slotMinutes === 'number') {
      if (commentObj.slotMinutes > 0) {
        return ` ${commentObj.slotMinutes} Menit`;
      } else {
        return '';
      }
    } else {
      return '';
    }
  } catch {
    return '';
  }
}
