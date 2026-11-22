const ISO_DATE_ONLY = /^\d{4}-\d{2}-\d{2}$/;

/**
 * Convert an ISO date or date-time string into a calendar date in the given time zone.
 *
 * @param iso ISO 8601 date or date-time string.
 * @param timeZone IANA time zone name; defaults to the process time zone.
 * @returns The local calendar date formatted as `yyyy-MM-dd`.
 */
export const localDateOf = (iso: string, timeZone?: string): string => {
  if (ISO_DATE_ONLY.test(iso)) {
    return iso;
  }

  return new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  }).format(new Date(iso));
};
