import { nextDayYmd, toYmd } from './ics';
import type { CalendarEvent } from './types';

const RENDER_BASE = 'https://calendar.google.com/calendar/render';

/**
 * Builds the Google Calendar template URL for an all-day event. The end date
 * is exclusive (start + 1 day).
 *
 * @param event - Calendar event to link
 * @returns Google Calendar TEMPLATE URL
 */
export function googleCalendarUrl(event: CalendarEvent): string {
  const query = [
    'action=TEMPLATE',
    `text=${encodeURIComponent(event.title)}`,
    `dates=${toYmd(event.startDate)}/${nextDayYmd(event.startDate)}`,
    `details=${encodeURIComponent(event.description)}`
  ];
  return `${RENDER_BASE}?${query.join('&')}`;
}
