import { describe, expect, it } from 'vitest';
import {
  getAvailableDays,
  getSlotMinutesText,
  getTimeSlots,
  isAppointmentPayload,
  matchesPractitionerFromPath
} from '../utils';

describe('matchesPractitionerFromPath', () => {
  it('returns true when path has matching practitionerRoleId', () => {
    expect(
      matchesPractitionerFromPath(
        '/practitioner?practitionerRoleId=role-123',
        'role-123'
      )
    ).toBe(true);
  });

  it('returns false when practitionerRoleId differs', () => {
    expect(
      matchesPractitionerFromPath(
        '/practitioner?practitionerRoleId=role-456',
        'role-123'
      )
    ).toBe(false);
  });

  it('returns false when path has no practitionerRoleId param', () => {
    expect(
      matchesPractitionerFromPath('/practitioner?other=1', 'role-123')
    ).toBe(false);
  });

  it('returns false when path is empty', () => {
    expect(matchesPractitionerFromPath('', 'role-123')).toBe(false);
  });

  it('handles paths with additional query params', () => {
    expect(
      matchesPractitionerFromPath(
        '/practitioner?practitionerRoleId=role-789&isOpen=true',
        'role-789'
      )
    ).toBe(true);
  });

  it('handles relative paths without origin', () => {
    expect(
      matchesPractitionerFromPath(
        '/practitioner?practitionerRoleId=role-abc',
        'role-abc'
      )
    ).toBe(true);
  });

  it('returns false for malformed paths gracefully', () => {
    expect(matchesPractitionerFromPath('not-a-url', 'role-123')).toBe(false);
  });
});

describe('getSlotMinutesText', () => {
  it('returns empty string for null/undefined', () => {
    expect(getSlotMinutesText(null)).toBe('');
    // skipcq: JS-W1042 - explicit undefined to match function signature
    expect(getSlotMinutesText(undefined)).toBe(''); // eslint-disable-line unicorn/no-useless-undefined
  });

  it('returns empty string for non-object', () => {
    expect(getSlotMinutesText('string')).toBe('');
    expect(getSlotMinutesText(123)).toBe('');
  });

  it('returns empty string when comment is not a string', () => {
    expect(getSlotMinutesText({ comment: 123 })).toBe('');
  });

  it('returns formatted text for valid slotMinutes', () => {
    expect(
      getSlotMinutesText({ comment: JSON.stringify({ slotMinutes: 30 }) })
    ).toBe(' 30 Menit');
  });

  it('returns empty string for zero slotMinutes', () => {
    expect(
      getSlotMinutesText({ comment: JSON.stringify({ slotMinutes: 0 }) })
    ).toBe('');
  });

  it('returns empty string for invalid JSON comment', () => {
    expect(getSlotMinutesText({ comment: '{invalid' })).toBe('');
  });
});

describe('getAvailableDays', () => {
  it('returns mondays and wednesdays in the given month', () => {
    // May 2026: month 4 (0-indexed)
    const may2026 = new Date(2026, 4, 1);
    const availableTime = [{ daysOfWeek: ['mon' as const, 'wed' as const] }];
    const days = getAvailableDays(availableTime, may2026);

    expect(days.length).toBeGreaterThan(0);
    for (const d of days) {
      expect([1, 3]).toContain(d.getDay()); // Monday=1, Wednesday=3
    }
  });

  it('returns empty array for empty availableTime', () => {
    const days = getAvailableDays([], new Date(2026, 4, 1));
    expect(days).toEqual([]);
  });
});

describe('getTimeSlots', () => {
  it('returns 30-minute interval slots', () => {
    const slots = getTimeSlots('08:00:00', '09:00:00');
    expect(slots).toEqual(['08:00', '08:30', '09:00']);
  });

  it('returns single slot when start equals end', () => {
    const slots = getTimeSlots('14:00:00', '14:00:00');
    expect(slots).toEqual(['14:00']);
  });
});

describe('isAppointmentPayload', () => {
  it('returns true for a valid AppointmentPayload object', () => {
    const valid = {
      path: '/practitioner?practitionerRoleId=role-1',
      slot: { date: '2026-06-15', startTime: '09:00', slotId: 'slot-1' },
      formData: { session_type: 'offline', problem_brief: 'test issue' }
    };
    expect(isAppointmentPayload(valid)).toBe(true);
  });

  it('returns false for null', () => {
    expect(isAppointmentPayload(null)).toBe(false);
  });

  it('returns false for non-object values', () => {
    expect(isAppointmentPayload('string')).toBe(false);
    expect(isAppointmentPayload(42)).toBe(false);
  });

  it('returns false when path is missing or empty', () => {
    expect(isAppointmentPayload({ slot: {}, formData: {} })).toBe(false);
    expect(isAppointmentPayload({ path: '', slot: {}, formData: {} })).toBe(
      false
    );
  });

  it('returns false when slot is missing or not an object', () => {
    expect(
      isAppointmentPayload({ path: '/test', slot: null, formData: {} })
    ).toBe(false);
    expect(
      isAppointmentPayload({ path: '/test', slot: 'string', formData: {} })
    ).toBe(false);
  });

  it('returns false when slot.date is missing or empty', () => {
    expect(
      isAppointmentPayload({
        path: '/test',
        slot: { startTime: '09:00' },
        formData: { session_type: 'offline', problem_brief: 'test' }
      })
    ).toBe(false);
  });

  it('returns false when slot.startTime is missing or empty', () => {
    expect(
      isAppointmentPayload({
        path: '/test',
        slot: { date: '2026-06-15' },
        formData: { session_type: 'offline', problem_brief: 'test' }
      })
    ).toBe(false);
  });

  it('returns false when formData is missing or not an object', () => {
    expect(
      isAppointmentPayload({
        path: '/test',
        slot: { date: '2026-06-15', startTime: '09:00' },
        formData: null
      })
    ).toBe(false);
  });

  it('returns false when formData.session_type is missing', () => {
    expect(
      isAppointmentPayload({
        path: '/test',
        slot: { date: '2026-06-15', startTime: '09:00' },
        formData: { problem_brief: 'test' }
      })
    ).toBe(false);
  });

  it('returns false when formData.problem_brief is missing', () => {
    expect(
      isAppointmentPayload({
        path: '/test',
        slot: { date: '2026-06-15', startTime: '09:00' },
        formData: { session_type: 'offline' }
      })
    ).toBe(false);
  });

  it('allows missing slotId (accessed conditionally)', () => {
    const withoutSlotId = {
      path: '/practitioner?practitionerRoleId=role-1',
      slot: { date: '2026-06-15', startTime: '09:00' },
      formData: { session_type: 'offline', problem_brief: 'test' }
    };
    expect(isAppointmentPayload(withoutSlotId)).toBe(true);
  });
});
