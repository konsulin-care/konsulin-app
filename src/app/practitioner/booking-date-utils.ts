/** Compare two dates by year/month/day (ignore time). */
function isSameCalendarDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

/** Check if a given date exists in the available days array. */
export function isDateAvailable(date: Date, availableDays: Date[]): boolean {
  return availableDays.some(availableDate =>
    isSameCalendarDay(date, availableDate)
  );
}

/**
 * Find the next available date starting from `currentDate`.
 *
 * If all available days are in the past or none are provided, returns the
 * input date unchanged. Otherwise increments day-by-day until an available
 * day is found.
 */
export function getNextAvailableDate(
  currentDate: Date,
  availableDays: Date[]
): Date {
  const date = new Date(currentDate);

  if (availableDays.length === 0) {
    return date;
  }

  // Early check: if all available days are before currentDate, return it unchanged
  const allInPast = availableDays.every(d => {
    if (d.getFullYear() < currentDate.getFullYear()) return true;
    if (d.getFullYear() > currentDate.getFullYear()) return false;
    if (d.getMonth() < currentDate.getMonth()) return true;
    if (d.getMonth() > currentDate.getMonth()) return false;
    return d.getDate() < currentDate.getDate();
  });
  if (allInPast) {
    return date;
  }

  // Loop until an available day is found
  while (!isDateAvailable(date, availableDays)) {
    date.setDate(date.getDate() + 1);
  }

  return date;
}

/** Earliest usable date: today if available, otherwise the next available date. */
export function pickInitialDate(today: Date, availableDays: Date[]): Date {
  return isDateAvailable(today, availableDays)
    ? today
    : getNextAvailableDate(today, availableDays);
}
