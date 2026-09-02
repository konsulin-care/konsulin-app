import { describe, expect, it } from 'vitest';
import {
  getNextAvailableDate,
  isDateAvailable,
  pickInitialDate
} from '../booking-date-utils';

describe('isDateAvailable', () => {
  const availableDays = [
    new Date('2026-07-06'),
    new Date('2026-07-08'),
    new Date('2026-07-10')
  ];

  it('returns true when date matches an available day', () => {
    expect(isDateAvailable(new Date('2026-07-06'), availableDays)).toBe(true);
  });

  it('returns false when date does not match any available day', () => {
    expect(isDateAvailable(new Date('2026-07-07'), availableDays)).toBe(false);
  });

  it('returns false for empty available days', () => {
    expect(isDateAvailable(new Date('2026-07-06'), [])).toBe(false);
  });
});

describe('pickInitialDate', () => {
  const availableDays = [
    new Date('2026-07-06'),
    new Date('2026-07-08'),
    new Date('2026-07-10')
  ];

  it('returns today when today is available', () => {
    const today = new Date('2026-07-06');
    expect(pickInitialDate(today, availableDays).getTime()).toBe(
      today.getTime()
    );
  });

  it('returns the next available date when today is unavailable', () => {
    const today = new Date('2026-07-07');
    expect(pickInitialDate(today, availableDays).getTime()).toBe(
      new Date('2026-07-08').getTime()
    );
  });

  it('returns today unchanged when the available list is empty', () => {
    const today = new Date('2026-07-06');
    expect(pickInitialDate(today, []).getTime()).toBe(today.getTime());
  });
});

describe('getNextAvailableDate', () => {
  const availableDays = [
    new Date('2026-07-06'),
    new Date('2026-07-08'),
    new Date('2026-07-10')
  ];

  it('returns the same date when it is available', () => {
    const date = new Date('2026-07-08');
    const result = getNextAvailableDate(date, availableDays);
    expect(result.getTime()).toBe(date.getTime());
  });

  it('returns the next available date when current is not available', () => {
    const result = getNextAvailableDate(new Date('2026-07-07'), availableDays);
    expect(result.getTime()).toBe(new Date('2026-07-08').getTime());
  });

  it('returns the input date when availableDays is empty', () => {
    const date = new Date('2026-07-06');
    const result = getNextAvailableDate(date, []);
    expect(result.getTime()).toBe(date.getTime());
  });

  it('returns the input date when all available days are in the past', () => {
    const pastDays = [new Date('2025-01-01'), new Date('2025-06-15')];
    const date = new Date('2026-07-06');
    const result = getNextAvailableDate(date, pastDays);
    expect(result.getTime()).toBe(date.getTime());
  });

  it('loops forward day by day until finding an available day', () => {
    const result = getNextAvailableDate(new Date('2026-07-05'), availableDays);
    expect(result.getTime()).toBe(new Date('2026-07-06').getTime());
  });
});
