import { describe, expect, it } from 'vitest';
import { googleCalendarUrl } from '../google';
import type { CalendarEvent } from '../types';

const event: CalendarEvent = {
  uid: 'appt-1@konsulin.test',
  title: 'Consultation',
  description: 'Initial consult',
  startDate: '2025-03-15'
};

describe('googleCalendarUrl', () => {
  it('targets calendar.google.com/calendar/render with action=TEMPLATE', () => {
    const url = googleCalendarUrl(event);
    expect(url).toContain('https://calendar.google.com/calendar/render');
    expect(url).toContain('action=TEMPLATE');
    expect(new URL(url).searchParams.get('action')).toBe('TEMPLATE');
  });

  it('encodes text and details and sets dates to YYYYMMDD/YYYYMMDD with exclusive end', () => {
    const special: CalendarEvent = {
      ...event,
      title: 'Plan: Q1, review; sync',
      description: 'Bring notes\nand files, plus \\stuff'
    };
    const url = googleCalendarUrl(special);
    expect(url).toContain(`text=${encodeURIComponent(special.title)}`);
    expect(url).toContain(`details=${encodeURIComponent(special.description)}`);
    expect(url).toContain('dates=20250315/20250316');
    expect(new URL(url).searchParams.get('text')).toBe(special.title);
    expect(new URL(url).searchParams.get('details')).toBe(special.description);
  });

  it('rolls the exclusive end over year boundaries', () => {
    const url = googleCalendarUrl({ ...event, startDate: '2025-12-31' });
    expect(url).toContain('dates=20251231/20260101');
  });
});
