import type { CalendarEvent } from './types';

const PRODID = 'PRODID:-//Konsulin//Add To Calendar//EN';
const LINE_LIMIT_OCTETS = 75;
const encoder = new TextEncoder();

/**
 * Zero-pads a number to two digits.
 *
 * @param value - Number to pad
 * @returns Two-digit string
 */
function pad2(value: number): string {
  return value.toString().padStart(2, '0');
}

/**
 * Escapes ICS TEXT values: backslash, newline, comma and semicolon.
 *
 * @param value - Raw text
 * @returns Escaped ICS text
 */
function escapeText(value: string): string {
  return value
    .replaceAll('\\', '\\\\')
    .replaceAll('\r\n', '\\n')
    .replaceAll('\r', '\\n')
    .replaceAll('\n', '\\n')
    .replaceAll(';', '\\;')
    .replaceAll(',', '\\,');
}

/**
 * Folds a logical ICS line so no physical line exceeds 75 octets.
 * Continuation lines start with a single space after CRLF.
 *
 * @param line - Logical (unfolded) line
 * @returns Folded line
 */
function foldLine(line: string): string {
  const chunks: string[] = [];
  let current = '';
  let currentOctets = 0;
  let limit = LINE_LIMIT_OCTETS;
  for (const char of line) {
    const charOctets = encoder.encode(char).length;
    if (currentOctets + charOctets > limit) {
      chunks.push(current);
      current = char;
      currentOctets = charOctets;
      limit = LINE_LIMIT_OCTETS - 1;
    } else {
      current += char;
      currentOctets += charOctets;
    }
  }
  chunks.push(current);
  return chunks.join('\r\n ');
}

/**
 * Formats a Date as an ICS UTC timestamp (YYYYMMDDTHHMMSSZ).
 *
 * @param date - Timestamp source
 * @returns ICS UTC timestamp
 */
function toUtcStamp(date: Date): string {
  return (
    `${date.getUTCFullYear()}${pad2(date.getUTCMonth() + 1)}${pad2(date.getUTCDate())}` +
    `T${pad2(date.getUTCHours())}${pad2(date.getUTCMinutes())}${pad2(date.getUTCSeconds())}Z`
  );
}

/**
 * Converts a yyyy-MM-dd date to the YYYYMMDD form used in ICS/Google dates.
 *
 * @param dateStr - Date in yyyy-MM-dd format
 * @returns Date as YYYYMMDD
 */
export function toYmd(dateStr: string): string {
  return dateStr.replaceAll('-', '');
}

/**
 * Shifts a yyyy-MM-dd date one day forward, rolling over month and year
 * boundaries (leap days included).
 *
 * @param dateStr - Date in yyyy-MM-dd format
 * @returns Next calendar date as YYYYMMDD
 */
export function nextDayYmd(dateStr: string): string {
  const [year, month, day] = dateStr.split('-').map(Number);
  const next = new Date(Date.UTC(year, month - 1, day + 1));
  return `${next.getUTCFullYear()}${pad2(next.getUTCMonth() + 1)}${pad2(next.getUTCDate())}`;
}

/**
 * Builds a single-event ICS document (VCALENDAR/VEVENT/VALARM) with CRLF
 * line endings, 75-octet line folding and TEXT escaping.
 *
 * @param event - Calendar event to serialize
 * @param now - Timestamp used for DTSTAMP
 * @returns ICS string terminated with CRLF
 */
export function buildBatchIcs(event: CalendarEvent, now: Date): string {
  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    PRODID,
    'BEGIN:VEVENT',
    `UID:${event.uid}`,
    `DTSTAMP:${toUtcStamp(now)}`,
    `DTSTART;VALUE=DATE:${toYmd(event.startDate)}`,
    `DTEND;VALUE=DATE:${nextDayYmd(event.startDate)}`,
    `SUMMARY:${escapeText(event.title)}`,
    `DESCRIPTION:${escapeText(event.description)}`,
    'BEGIN:VALARM',
    'TRIGGER:-PT0M',
    'ACTION:DISPLAY',
    `DESCRIPTION:${escapeText(event.title)}`,
    'END:VALARM',
    'END:VEVENT',
    'END:VCALENDAR'
  ];
  return `${lines.map(line => foldLine(line)).join('\r\n')}\r\n`;
}
