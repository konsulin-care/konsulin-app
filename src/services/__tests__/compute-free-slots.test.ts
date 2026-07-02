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
});
