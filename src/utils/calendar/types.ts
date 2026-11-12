/**
 * Client-side calendar event payload used by the add-to-calendar utilities.
 */
export interface CalendarEvent {
  /** Unique event identifier used as the ICS UID. */
  uid: string;
  /** Event title, used as SUMMARY / Google Calendar text. */
  title: string;
  /** Event description, used as DESCRIPTION / Google Calendar details. */
  description: string;
  /** Event start date in yyyy-MM-dd format. */
  startDate: string;
}
