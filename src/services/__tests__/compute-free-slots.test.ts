import type { PractitionerRoleAvailableTime } from 'fhir/r4';
import { describe, expect, it } from 'vitest';
import { computeFreeSlots } from '../slots';

describe('computeFreeSlots', () => {
  const TZ_OFFSET = '+07:00';
  const availableTime: PractitionerRoleAvailableTime[] = [
    {
      daysOfWeek: ['mon', 'tue', 'wed', 'thu', 'fri'],
      availableStartTime: '09:00',
      availableEndTime: '17:00'
    }
  ];

  const date = new Date('2026-07-02'); // Thursday

  it('returns full day as free slots when no busy slots', () => {
    const result = computeFreeSlots(availableTime, [], date, 60, TZ_OFFSET);
    // 09:00-17:00 +07:00 → 02:00-10:00 UTC in test env (TZ=UTC)
    // 02:00, 03:00, 04:00, 05:00, 06:00, 07:00, 08:00, 09:00
    expect(result).toHaveLength(8);
    expect(result[0]).toEqual({ start: '02:00', end: '03:00' });
    expect(result[7]).toEqual({ start: '09:00', end: '10:00' });
  });

  it('removes time occupied by a busy slot', () => {
    const busySlots = [
      { start: '2026-07-02T10:00:00+07:00', end: '2026-07-02T11:00:00+07:00' }
    ];
    const result = computeFreeSlots(
      availableTime,
      busySlots,
      date,
      60,
      TZ_OFFSET
    );
    // Busy 10:00-11:00 +07:00 → 03:00-04:00 UTC → slot at 03:00 removed
    // 02:00, 04:00, 05:00, 06:00, 07:00, 08:00, 09:00
    expect(result).toHaveLength(7);
    expect(result[0]).toEqual({ start: '02:00', end: '03:00' });
    expect(result[1]).toEqual({ start: '04:00', end: '05:00' });
  });

  it('removes time that partially overlaps a 60-min window', () => {
    const busySlots = [
      { start: '2026-07-02T10:30:00+07:00', end: '2026-07-02T11:30:00+07:00' }
    ];
    const result = computeFreeSlots(
      availableTime,
      busySlots,
      date,
      60,
      TZ_OFFSET
    );
    // Busy 10:30-11:30 +07:00 → 03:30-04:30 UTC
    // 03:00 slot (03:00-04:00) overlaps 03:30-04:30 → removed
    // 04:00 slot (04:00-05:00) overlaps 03:30-04:30 → removed
    // 02:00, 05:00, 06:00, 07:00, 08:00, 09:00
    expect(result).toHaveLength(6);
    expect(result[0]).toEqual({ start: '02:00', end: '03:00' });
    expect(result[1]).toEqual({ start: '05:00', end: '06:00' });
  });

  it('handles multiple busy slots', () => {
    const busySlots = [
      { start: '2026-07-02T10:00:00+07:00', end: '2026-07-02T11:00:00+07:00' },
      { start: '2026-07-02T14:00:00+07:00', end: '2026-07-02T15:30:00+07:00' }
    ];
    const result = computeFreeSlots(
      availableTime,
      busySlots,
      date,
      60,
      TZ_OFFSET
    );
    // Busy1: 10:00-11:00 +07:00 → 03:00-04:00 UTC → removes 03:00
    // Busy2: 14:00-15:30 +07:00 → 07:00-08:30 UTC → removes 07:00, 08:00
    expect(result).toHaveLength(5);
    expect(result.map(s => s.start)).toEqual([
      '02:00',
      '04:00',
      '05:00',
      '06:00',
      '09:00'
    ]);
  });

  it('handles split availability (lunch break)', () => {
    const splitTime: PractitionerRoleAvailableTime[] = [
      {
        daysOfWeek: ['thu'],
        availableStartTime: '09:00',
        availableEndTime: '12:00'
      },
      {
        daysOfWeek: ['thu'],
        availableStartTime: '13:00',
        availableEndTime: '17:00'
      }
    ];
    const result = computeFreeSlots(splitTime, [], date, 60, TZ_OFFSET);
    // 09:00-12:00 +07:00 → 02:00-05:00 UTC → 02:00, 03:00, 04:00
    // 13:00-17:00 +07:00 → 06:00-10:00 UTC → 06:00, 07:00, 08:00, 09:00
    expect(result).toHaveLength(7);
    expect(result[0]).toEqual({ start: '02:00', end: '03:00' });
    expect(result[3]).toEqual({ start: '06:00', end: '07:00' });
  });

  it('returns empty array when day has no matching availableTime', () => {
    const weekendTime: PractitionerRoleAvailableTime[] = [
      {
        daysOfWeek: ['sat', 'sun'],
        availableStartTime: '09:00',
        availableEndTime: '12:00'
      }
    ];
    const result = computeFreeSlots(weekendTime, [], date, 60, TZ_OFFSET); // Thursday
    expect(result).toEqual([]);
  });

  it('returns empty array when fully booked', () => {
    const busySlots = [
      { start: '2026-07-02T09:00:00+07:00', end: '2026-07-02T17:00:00+07:00' }
    ];
    const result = computeFreeSlots(
      availableTime,
      busySlots,
      date,
      60,
      TZ_OFFSET
    );
    // Full-day busy → no free slots
    expect(result).toEqual([]);
  });

  describe('with custom durationMinutes', () => {
    it('returns 30-min slots when durationMinutes=30', () => {
      const result = computeFreeSlots(availableTime, [], date, 30, TZ_OFFSET);
      // 09:00-17:00 +07:00 → 02:00-10:00 UTC = 480 min = 16 × 30 min
      expect(result).toHaveLength(16);
      expect(result[0]).toEqual({ start: '02:00', end: '02:30' });
      expect(result[1]).toEqual({ start: '02:30', end: '03:00' });
      expect(result[15]).toEqual({ start: '09:30', end: '10:00' });
    });

    it('returns 90-min slots when durationMinutes=90', () => {
      const result = computeFreeSlots(availableTime, [], date, 90, TZ_OFFSET);
      // 02:00-10:00 UTC = 480 min = 5 × 90 min + 30 min leftover
      // 02:00-03:30, 03:30-05:00, 05:00-06:30, 06:30-08:00, 08:00-09:30
      expect(result).toHaveLength(5);
      expect(result[0]).toEqual({ start: '02:00', end: '03:30' });
      expect(result[4]).toEqual({ start: '08:00', end: '09:30' });
    });

    it('excludes slots that overlap busy intervals with 30-min duration', () => {
      const busySlots = [
        { start: '2026-07-02T10:00:00+07:00', end: '2026-07-02T11:00:00+07:00' }
      ];
      const result = computeFreeSlots(
        availableTime,
        busySlots,
        date,
        30,
        TZ_OFFSET
      );
      // Busy 10:00-11:00 +07:00 → 03:00-04:00 UTC
      // 03:00-03:30 and 03:30-04:00 excluded. 16 - 2 = 14
      expect(result).toHaveLength(14);
      expect(result.find(s => s.start === '03:00')).toBeUndefined();
      expect(result.find(s => s.start === '03:30')).toBeUndefined();
      expect(result[0]).toEqual({ start: '02:00', end: '02:30' });
    });

    it('defaults to 60 minutes when durationMinutes is not provided', () => {
      const result = computeFreeSlots(
        availableTime,
        [],
        date,
        undefined,
        TZ_OFFSET
      );
      expect(result).toHaveLength(8);
      expect(result[0]).toEqual({ start: '02:00', end: '03:00' });
    });

    it('handles non-hour-aligned start/end times with durationMinutes=45', () => {
      const timeWindow: PractitionerRoleAvailableTime[] = [
        {
          daysOfWeek: ['thu'],
          availableStartTime: '09:30',
          availableEndTime: '12:15'
        }
      ];
      const result = computeFreeSlots(timeWindow, [], date, 45, TZ_OFFSET);
      // 09:30-12:15 +07:00 → 02:30-05:15 UTC = 165 min = 3 × 45 min + 30 leftover
      // 02:30-03:15, 03:15-04:00, 04:00-04:45
      expect(result).toHaveLength(3);
      expect(result[0]).toEqual({ start: '02:30', end: '03:15' });
      expect(result[2]).toEqual({ start: '04:00', end: '04:45' });
    });
  });
});
