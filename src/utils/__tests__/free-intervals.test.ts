import type { PractitionerRoleAvailableTime, Slot } from 'fhir/r4';
import { describe, expect, it } from 'vitest';
import { computeFreeIntervals } from '../free-intervals';

/** Helper to create an ISO datetime string for a given date and time. */
function isoDate(dateStr: string, timeStr: string): string {
  return `${dateStr}T${timeStr}:00.000Z`;
}

describe('computeFreeIntervals', () => {
  const date = '2026-07-06'; // Monday

  it('returns empty when no availableTime for that day', () => {
    const availableTime: PractitionerRoleAvailableTime[] = [
      {
        daysOfWeek: ['tue'],
        availableStartTime: '09:00',
        availableEndTime: '17:00'
      }
    ];
    const result = computeFreeIntervals(availableTime, [], 30, new Date(date));
    expect(result).toEqual([]);
  });

  it('returns full-day intervals when no non-free slots', () => {
    const availableTime: PractitionerRoleAvailableTime[] = [
      {
        daysOfWeek: ['mon'],
        availableStartTime: '09:00',
        availableEndTime: '12:00'
      }
    ];
    const result = computeFreeIntervals(availableTime, [], 30, new Date(date));
    expect(result).toHaveLength(6);
    expect(result[0].start).toBe('2026-07-06T09:00:00.000Z');
    expect(result[0].end).toBe('2026-07-06T09:30:00.000Z');
    expect(result[5].start).toBe('2026-07-06T11:30:00.000Z');
    expect(result[5].end).toBe('2026-07-06T12:00:00.000Z');
  });

  it('skips intervals that overlap non-free slots', () => {
    const availableTime: PractitionerRoleAvailableTime[] = [
      {
        daysOfWeek: ['mon'],
        availableStartTime: '09:00',
        availableEndTime: '11:00'
      }
    ];
    const nonFreeSlots: Slot[] = [
      {
        resourceType: 'Slot',
        id: 'slot-1',
        status: 'busy-unavailable',
        start: isoDate(date, '09:30'),
        end: isoDate(date, '10:00'),
        schedule: { reference: 'Schedule/1' }
      }
    ];
    const result = computeFreeIntervals(
      availableTime,
      nonFreeSlots,
      30,
      new Date(date)
    );
    // Intervals: 09:00-09:30 (before blocked), 10:00-10:30, 10:30-11:00 (after blocked)
    // 09:30-10:00 is blocked
    expect(result).toHaveLength(3);
    expect(result[0].start).toBe('2026-07-06T09:00:00.000Z');
    expect(result[1].start).toBe('2026-07-06T10:00:00.000Z');
    expect(result[2].start).toBe('2026-07-06T10:30:00.000Z');
  });

  it('handles multiple availableTime ranges with gaps', () => {
    const availableTime: PractitionerRoleAvailableTime[] = [
      {
        daysOfWeek: ['mon'],
        availableStartTime: '09:00',
        availableEndTime: '12:00'
      },
      {
        daysOfWeek: ['mon'],
        availableStartTime: '14:00',
        availableEndTime: '17:00'
      }
    ];
    const result = computeFreeIntervals(availableTime, [], 60, new Date(date));
    // 09:00-12:00 = 3 intervals (09:00, 10:00, 11:00) at 60min each
    // 14:00-17:00 = 3 intervals (14:00, 15:00, 16:00)
    expect(result).toHaveLength(6);
    expect(result[0].start).toBe('2026-07-06T09:00:00.000Z');
    expect(result[2].start).toBe('2026-07-06T11:00:00.000Z');
    expect(result[3].start).toBe('2026-07-06T14:00:00.000Z');
    expect(result[5].start).toBe('2026-07-06T16:00:00.000Z');
  });

  it('uses 60-minute duration correctly', () => {
    const availableTime: PractitionerRoleAvailableTime[] = [
      {
        daysOfWeek: ['mon'],
        availableStartTime: '09:00',
        availableEndTime: '12:00'
      }
    ];
    const result = computeFreeIntervals(availableTime, [], 60, new Date(date));
    expect(result).toHaveLength(3);
    expect(result[0].start).toBe('2026-07-06T09:00:00.000Z');
    expect(result[0].end).toBe('2026-07-06T10:00:00.000Z');
    expect(result[1].start).toBe('2026-07-06T10:00:00.000Z');
    expect(result[1].end).toBe('2026-07-06T11:00:00.000Z');
    expect(result[2].start).toBe('2026-07-06T11:00:00.000Z');
    expect(result[2].end).toBe('2026-07-06T12:00:00.000Z');
  });

  it('filters non-free slots on a different date', () => {
    const availableTime: PractitionerRoleAvailableTime[] = [
      {
        daysOfWeek: ['mon'],
        availableStartTime: '09:00',
        availableEndTime: '17:00'
      }
    ];
    const nonFreeSlots: Slot[] = [
      {
        resourceType: 'Slot',
        id: 'slot-other',
        status: 'busy-unavailable',
        start: '2026-07-07T10:00:00.000Z', // Tuesday, different day
        end: '2026-07-07T11:00:00.000Z',
        schedule: { reference: 'Schedule/1' }
      }
    ];
    // Monday slots should be unaffected
    const result = computeFreeIntervals(
      availableTime,
      nonFreeSlots,
      60,
      new Date(date)
    );
    expect(result).toHaveLength(8); // 09:00-17:00 = 8 hours / 60min
  });

  it('handles partially overlapping non-free slot at start of window', () => {
    const availableTime: PractitionerRoleAvailableTime[] = [
      {
        daysOfWeek: ['mon'],
        availableStartTime: '09:00',
        availableEndTime: '12:00'
      }
    ];
    const nonFreeSlots: Slot[] = [
      {
        resourceType: 'Slot',
        id: 'slot-overlap-start',
        status: 'busy-unavailable',
        start: isoDate(date, '08:30'), // starts before available window
        end: isoDate(date, '10:00'), // ends inside
        schedule: { reference: 'Schedule/1' }
      }
    ];
    const result = computeFreeIntervals(
      availableTime,
      nonFreeSlots,
      30,
      new Date(date)
    );
    // 09:00-10:00 blocked (overlapping non-free slot), 10:00-12:00 free
    expect(result.length).toBeGreaterThan(0);
    expect(result[0].start).toBe('2026-07-06T10:00:00.000Z');
  });

  it('returns empty when all time is blocked', () => {
    const availableTime: PractitionerRoleAvailableTime[] = [
      {
        daysOfWeek: ['mon'],
        availableStartTime: '09:00',
        availableEndTime: '17:00'
      }
    ];
    const nonFreeSlots: Slot[] = [
      {
        resourceType: 'Slot',
        id: 'slot-all',
        status: 'busy-unavailable',
        start: isoDate(date, '08:00'),
        end: isoDate(date, '18:00'),
        schedule: { reference: 'Schedule/1' }
      }
    ];
    const result = computeFreeIntervals(
      availableTime,
      nonFreeSlots,
      30,
      new Date(date)
    );
    expect(result).toEqual([]);
  });

  it('handles empty availableTime gracefully', () => {
    const result = computeFreeIntervals([], [], 30, new Date(date));
    expect(result).toEqual([]);
  });

  it('filters only non-free slot statuses', () => {
    const availableTime: PractitionerRoleAvailableTime[] = [
      {
        daysOfWeek: ['mon'],
        availableStartTime: '09:00',
        availableEndTime: '11:00'
      }
    ];
    // Include a free slot - should NOT be filtered out
    const slots: Slot[] = [
      {
        resourceType: 'Slot',
        id: 'slot-free',
        status: 'free',
        start: isoDate(date, '09:30'),
        end: isoDate(date, '10:00'),
        schedule: { reference: 'Schedule/1' }
      }
    ];
    const result = computeFreeIntervals(
      availableTime,
      slots,
      30,
      new Date(date)
    );
    // All slots should be available since the 'free' slot doesn't block
    expect(result).toHaveLength(4); // 09:00, 09:30, 10:00, 10:30
  });
});
