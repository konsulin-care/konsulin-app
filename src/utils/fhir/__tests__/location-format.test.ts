import type { Location } from 'fhir/r4';
import { describe, expect, it } from 'vitest';
import { buildHoursList, formatAddress } from '../location-format';

describe('formatAddress', () => {
  it('formats full address with line, city, state, postalCode', () => {
    const addr: Location['address'] = {
      line: ['123 Main St'],
      city: 'Springfield',
      state: 'IL',
      postalCode: '62701'
    };
    expect(formatAddress(addr)).toBe('123 Main St, Springfield, IL 62701');
  });

  it('formats address with multiple lines', () => {
    const addr: Location['address'] = {
      line: ['123 Main St', 'Suite 100'],
      city: 'Springfield',
      state: 'IL',
      postalCode: '62701'
    };
    expect(formatAddress(addr)).toBe(
      '123 Main St, Suite 100, Springfield, IL 62701'
    );
  });

  it('formats address without postalCode', () => {
    const addr: Location['address'] = {
      line: ['123 Main St'],
      city: 'Springfield',
      state: 'IL'
    };
    expect(formatAddress(addr)).toBe('123 Main St, Springfield, IL');
  });

  it('formats address with only postalCode (no state)', () => {
    const addr: Location['address'] = {
      line: ['123 Main St'],
      city: 'Springfield',
      postalCode: '62701'
    };
    expect(formatAddress(addr)).toBe('123 Main St, Springfield, 62701');
  });

  it('formats address with only city', () => {
    const addr: Location['address'] = {
      city: 'Springfield'
    };
    expect(formatAddress(addr)).toBe('Springfield');
  });

  it('returns empty string for undefined address', () => {
    expect(formatAddress(undefined)).toBe('');
  });
});

describe('buildHoursList', () => {
  it('formats hours with opening and closing times', () => {
    const hours: Location['hoursOfOperation'] = [
      { daysOfWeek: ['mon', 'tue'], openingTime: '09:00', closingTime: '17:00' }
    ];
    const result = buildHoursList(hours);
    expect(result).toEqual(['Mon: 09:00-17:00', 'Tue: 09:00-17:00']);
  });

  it('returns empty for undefined hours', () => {
    expect(buildHoursList(undefined)).toEqual([]);
  });

  it('returns empty for empty array', () => {
    expect(buildHoursList([])).toEqual([]);
  });

  it('skips entries without daysOfWeek', () => {
    const hours: Location['hoursOfOperation'] = [
      { openingTime: '09:00', closingTime: '17:00' }
    ];
    expect(buildHoursList(hours)).toEqual([]);
  });

  it('skips entries without openingTime', () => {
    const hours: Location['hoursOfOperation'] = [
      { daysOfWeek: ['mon'], closingTime: '17:00' }
    ];
    expect(buildHoursList(hours)).toEqual([]);
  });

  it('preserves day order', () => {
    const hours: Location['hoursOfOperation'] = [
      {
        daysOfWeek: ['wed', 'mon', 'fri'],
        openingTime: '08:00',
        closingTime: '16:00'
      }
    ];
    const result = buildHoursList(hours);
    expect(result).toEqual([
      'Mon: 08:00-16:00',
      'Wed: 08:00-16:00',
      'Fri: 08:00-16:00'
    ]);
  });
});
