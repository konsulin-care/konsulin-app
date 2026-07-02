import { describe, expect, it } from 'vitest';
import { computeFreeSlots } from '../clinicians';

describe('computeFreeSlots', () => {
  const availableTime = [
    {
      daysOfWeek: ['mon', 'tue', 'wed', 'thu', 'fri'] as const,
      availableStartTime: '09:00',
      availableEndTime: '17:00'
    }
  ];

  const date = new Date('2026-07-02'); // Thursday

  it('returns full day as free slots when no busy slots', () => {
    const result = computeFreeSlots(availableTime, [], date);
    // 09:00-10:00, 10:00-11:00, 11:00-12:00, 12:00-13:00, 13:00-14:00, 14:00-15:00, 15:00-16:00, 16:00-17:00
    expect(result).toHaveLength(8);
    expect(result[0]).toEqual({ start: '09:00', end: '10:00' });
    expect(result[7]).toEqual({ start: '16:00', end: '17:00' });
  });

  it('removes time occupied by a busy slot', () => {
    const busySlots = [
      { start: '2026-07-02T10:00:00+07:00', end: '2026-07-02T11:00:00+07:00' }
    ];
    const result = computeFreeSlots(availableTime, busySlots, date);
    // 09-10, 11-12, 12-13, 13-14, 14-15, 15-16, 16-17
    expect(result).toHaveLength(7);
    expect(result[0]).toEqual({ start: '09:00', end: '10:00' });
    expect(result[1]).toEqual({ start: '11:00', end: '12:00' });
  });

  it('removes time that partially overlaps a 60-min window', () => {
    const busySlots = [
      { start: '2026-07-02T10:30:00+07:00', end: '2026-07-02T11:30:00+07:00' }
    ];
    const result = computeFreeSlots(availableTime, busySlots, date);
    // 09-10 is free, 10-11 overlaps busy (10:30-11:00), so not free
    // 11-12 overlaps busy (11:00-11:30), so not free
    // 12-13, 13-14, 14-15, 15-16, 16-17 are free
    expect(result).toHaveLength(6);
    expect(result[0]).toEqual({ start: '09:00', end: '10:00' });
    expect(result[1]).toEqual({ start: '12:00', end: '13:00' });
  });

  it('handles multiple busy slots', () => {
    const busySlots = [
      { start: '2026-07-02T10:00:00+07:00', end: '2026-07-02T11:00:00+07:00' },
      { start: '2026-07-02T14:00:00+07:00', end: '2026-07-02T15:30:00+07:00' }
    ];
    const result = computeFreeSlots(availableTime, busySlots, date);
    // Missing: 10-11, 14-15, 15-16 (14-15:30 covers 14-15 and overlaps 15-16)
    expect(result).toHaveLength(5);
    expect(result.map(s => s.start)).toEqual([
      '09:00',
      '11:00',
      '12:00',
      '13:00',
      '16:00'
    ]);
  });

  it('handles split availability (lunch break)', () => {
    const splitTime = [
      {
        daysOfWeek: ['thu'] as const,
        availableStartTime: '09:00',
        availableEndTime: '12:00'
      },
      {
        daysOfWeek: ['thu'] as const,
        availableStartTime: '13:00',
        availableEndTime: '17:00'
      }
    ];
    const result = computeFreeSlots(splitTime, [], date);
    // 09-10, 10-11, 11-12, 13-14, 14-15, 15-16, 16-17
    expect(result).toHaveLength(7);
    expect(result[0]).toEqual({ start: '09:00', end: '10:00' });
    expect(result[3]).toEqual({ start: '13:00', end: '14:00' });
  });

  it('returns empty array when day has no matching availableTime', () => {
    const weekendTime = [
      {
        daysOfWeek: ['sat', 'sun'] as const,
        availableStartTime: '09:00',
        availableEndTime: '12:00'
      }
    ];
    const result = computeFreeSlots(weekendTime, [], date); // Thursday
    expect(result).toEqual([]);
  });

  it('returns empty array when fully booked', () => {
    const busySlots = [
      { start: '2026-07-02T09:00:00+07:00', end: '2026-07-02T17:00:00+07:00' }
    ];
    const result = computeFreeSlots(availableTime, busySlots, date);
    expect(result).toEqual([]);
  });

  describe('with custom durationMinutes', () => {
    it('returns 30-min slots when durationMinutes=30', () => {
      const result = computeFreeSlots(availableTime, [], date, 30);
      // 09:00 to 17:00 = 8h = 480min = 16 x 30min slots
      expect(result).toHaveLength(16);
      expect(result[0]).toEqual({ start: '09:00', end: '09:30' });
      expect(result[1]).toEqual({ start: '09:30', end: '10:00' });
      expect(result[15]).toEqual({ start: '16:30', end: '17:00' });
    });

    it('returns 90-min slots when durationMinutes=90', () => {
      const result = computeFreeSlots(availableTime, [], date, 90);
      // 09:00 to 17:00 = 8h = 480min = 5 x 90min slots + 30min leftover
      // 09:00-10:30, 10:30-12:00, 12:00-13:30, 13:30-15:00, 15:00-16:30
      expect(result).toHaveLength(5);
      expect(result[0]).toEqual({ start: '09:00', end: '10:30' });
      expect(result[4]).toEqual({ start: '15:00', end: '16:30' });
    });

    it('excludes slots that overlap busy intervals with 30-min duration', () => {
      const busySlots = [
        { start: '2026-07-02T10:00:00+07:00', end: '2026-07-02T11:00:00+07:00' }
      ];
      const result = computeFreeSlots(availableTime, busySlots, date, 30);
      // 10:00-11:00 is busy → 10:00-10:30, 10:30-11:00 are excluded
      // 09:00-17:00 = 16 slots - 2 = 14
      expect(result).toHaveLength(14);
      expect(result.find(s => s.start === '10:00')).toBeUndefined();
      expect(result.find(s => s.start === '10:30')).toBeUndefined();
      expect(result[0]).toEqual({ start: '09:00', end: '09:30' });
    });

    it('defaults to 60 minutes when durationMinutes is not provided', () => {
      const result = computeFreeSlots(availableTime, [], date);
      expect(result).toHaveLength(8);
      expect(result[0]).toEqual({ start: '09:00', end: '10:00' });
    });

    it('handles non-hour-aligned start/end times with durationMinutes=45', () => {
      const timeWindow = [
        {
          daysOfWeek: ['thu'] as const,
          availableStartTime: '09:30',
          availableEndTime: '12:15'
        }
      ];
      const result = computeFreeSlots(timeWindow, [], date, 45);
      // 09:30 to 12:15 = 165min = 3 x 45min + 30min leftover
      // 09:30-10:15, 10:15-11:00, 11:00-11:45
      expect(result).toHaveLength(3);
      expect(result[0]).toEqual({ start: '09:30', end: '10:15' });
      expect(result[2]).toEqual({ start: '11:00', end: '11:45' });
    });
  });
});
