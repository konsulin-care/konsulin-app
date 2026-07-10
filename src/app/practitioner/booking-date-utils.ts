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

  // Early check: if all dates in availableDays are in the past, return the input date
  const now = new Date();
  const allInPast = availableDays.every(d => {
    if (d.getFullYear() < now.getFullYear()) return true;
    if (d.getFullYear() > now.getFullYear()) return false;
    if (d.getMonth() < now.getMonth()) return true;
    if (d.getMonth() > now.getMonth()) return false;
    return d.getDate() < now.getDate();
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
