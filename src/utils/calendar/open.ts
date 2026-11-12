import { googleCalendarUrl } from './google';
import { buildBatchIcs } from './ics';
import { detectCalendarPlatform } from './platform';
import type { CalendarEvent } from './types';

const CALENDAR_MIME = 'text/calendar;charset=utf-8';
const REVOKE_DELAY_MS = 1000;

/**
 * Opens the ICS file on iOS Safari: builds a text/calendar Blob, navigates
 * the current tab to its object URL, then revokes the URL after a timeout.
 *
 * @param event - Calendar event to export
 */
function openIcsFile(event: CalendarEvent): void {
  const blob = new Blob([buildBatchIcs(event, new Date())], {
    type: CALENDAR_MIME
  });
  const objectUrl = URL.createObjectURL(blob);
  window.location.assign(objectUrl);
  setTimeout(() => {
    URL.revokeObjectURL(objectUrl);
  }, REVOKE_DELAY_MS);
}

/**
 * Adds an event to the user's calendar: iOS Safari downloads the ICS file
 * via a Blob URL in the same tab; every other platform opens Google Calendar
 * in a new tab with noopener.
 *
 * @param event - Calendar event to add
 */
export function addToCalendar(event: CalendarEvent): void {
  const platform = detectCalendarPlatform(
    navigator.userAgent,
    navigator.maxTouchPoints || 0
  );
  if (platform === 'ios-safari') {
    openIcsFile(event);
    return;
  }
  window.open(googleCalendarUrl(event), '_blank', 'noopener');
}
