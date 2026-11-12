import { describe, expect, it } from 'vitest';
import { buildBatchIcs } from '../ics';
import type { CalendarEvent } from '../types';

const event: CalendarEvent = {
  uid: 'appt-1@konsulin.test',
  title: 'Consultation',
  description: 'Initial consult',
  startDate: '2025-03-15'
};

const now = new Date(Date.UTC(2025, 2, 10, 8, 30, 0));

describe('buildBatchIcs', () => {
  it('emits BEGIN:VCALENDAR, VERSION:2.0, PRODID and one VEVENT with UID and DTSTAMP', () => {
    const ics = buildBatchIcs(event, now);
    expect(ics).toContain('BEGIN:VCALENDAR');
    expect(ics).toContain('VERSION:2.0');
    expect(ics).toContain('PRODID');
    expect(ics).toContain('END:VCALENDAR');
    expect(ics.match(/BEGIN:VEVENT/g)).toHaveLength(1);
    expect(ics).toContain(`UID:${event.uid}`);
    expect(ics).toContain('DTSTAMP:20250310T083000Z');
  });

  it('emits DTSTART;VALUE=DATE as the start date and DTEND;VALUE=DATE as the next day', () => {
    const ics = buildBatchIcs(event, now);
    expect(ics).toContain('DTSTART;VALUE=DATE:20250315');
    expect(ics).toContain('DTEND;VALUE=DATE:20250316');
  });

  it('rolls DTEND over leap-day, month and year boundaries', () => {
    expect(buildBatchIcs({ ...event, startDate: '2024-02-28' }, now)).toContain(
      'DTEND;VALUE=DATE:20240229'
    );
    expect(buildBatchIcs({ ...event, startDate: '2025-01-31' }, now)).toContain(
      'DTEND;VALUE=DATE:20250201'
    );
    expect(buildBatchIcs({ ...event, startDate: '2025-12-31' }, now)).toContain(
      'DTEND;VALUE=DATE:20260101'
    );
    expect(buildBatchIcs({ ...event, startDate: '2023-12-31' }, now)).toContain(
      'DTEND;VALUE=DATE:20240101'
    );
  });

  it('includes a VALARM block inside the VEVENT', () => {
    const ics = buildBatchIcs(event, now);
    expect(ics).toContain('BEGIN:VALARM');
    expect(ics).toContain('END:VALARM');
    const vevent = ics.slice(
      ics.indexOf('BEGIN:VEVENT'),
      ics.indexOf('END:VEVENT')
    );
    expect(vevent).toContain('BEGIN:VALARM');
    expect(vevent).toContain('END:VALARM');
    expect(vevent).toContain('TRIGGER:-PT0M');
    expect(vevent).toContain('ACTION:DISPLAY');
  });

  it('separates every line with CRLF only', () => {
    const ics = buildBatchIcs(event, now);
    const withoutCrlf = ics.replace(/\r\n/g, '');
    expect(withoutCrlf).not.toContain('\n');
    expect(withoutCrlf).not.toContain('\r');
    const lines = ics.split('\r\n');
    expect(lines).toContain('BEGIN:VCALENDAR');
    expect(lines).toContain('END:VCALENDAR');
    expect(lines.length).toBeGreaterThanOrEqual(17);
  });

  it('folds lines longer than 75 octets with CRLF followed by a space', () => {
    const longEvent: CalendarEvent = {
      ...event,
      title:
        'A very long appointment title that will certainly exceed the folding limit',
      description: 'naïve café notes. '.repeat(15)
    };
    const ics = buildBatchIcs(longEvent, now);
    expect(ics).toContain('\r\n ');
    for (const line of ics.split('\r\n')) {
      expect(Buffer.byteLength(line, 'utf8')).toBeLessThanOrEqual(75);
    }
    const unfolded = ics.replace(/\r\n /g, '');
    expect(unfolded).toContain(`SUMMARY:${longEvent.title}`);
    expect(unfolded).toContain(`DESCRIPTION:${longEvent.description}`);
  });

  it('escapes commas, semicolons, backslashes and newlines in SUMMARY and DESCRIPTION', () => {
    const tricky: CalendarEvent = {
      ...event,
      title: 'Follow-up, day 2; bring\\records',
      description: 'Line one\nLine two, with commas; and \\ backslash'
    };
    const ics = buildBatchIcs(tricky, now);
    expect(ics).toContain('SUMMARY:Follow-up\\, day 2\\; bring\\\\records');
    expect(ics).toContain(
      'DESCRIPTION:Line one\\nLine two\\, with commas\\; and \\\\ backslash'
    );
  });
});
