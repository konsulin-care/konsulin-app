import type { Location } from 'fhir/r4';

const DAY_ORDER = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'] as const;

const DAY_LABELS: Record<string, string> = {
  mon: 'Mon',
  tue: 'Tue',
  wed: 'Wed',
  thu: 'Thu',
  fri: 'Fri',
  sat: 'Sat',
  sun: 'Sun'
};

/**
 * Format a FHIR Location address into a display string.
 *
 * @param addr - The address from a Location resource.
 * @returns Formatted address string (line, city, state, postalCode).
 */
export function formatAddress(addr: Location['address']): string {
  if (!addr) return '';
  const parts: string[] = [];
  if (addr.line) parts.push(...addr.line);
  if (addr.city) parts.push(addr.city);
  if (addr.state)
    parts.push(
      addr.postalCode ? `${addr.state} ${addr.postalCode}` : addr.state
    );
  else if (addr.postalCode) parts.push(addr.postalCode);
  return parts.join(', ');
}

/**
 * Build a list of formatted hours strings from Location hoursOfOperation.
 *
 * @param hours - The hoursOfOperation array from a Location resource.
 * @returns Array of formatted strings like "Mon: 09:00-17:00".
 */
export function buildHoursList(hours: Location['hoursOfOperation']): string[] {
  if (!hours || hours.length === 0) return [];
  const hoursMap = new Map<string, string>();
  for (const entry of hours) {
    if (!entry.daysOfWeek?.length || !entry.openingTime || !entry.closingTime)
      continue;
    const timeStr = `${entry.openingTime.slice(0, 5)}-${entry.closingTime.slice(0, 5)}`;
    for (const day of entry.daysOfWeek) {
      const label = DAY_LABELS[day.toLowerCase()];
      if (label) hoursMap.set(day.toLowerCase(), `${label}: ${timeStr}`);
    }
  }
  return DAY_ORDER.filter(d => hoursMap.has(d)).map(d => hoursMap.get(d) ?? '');
}
