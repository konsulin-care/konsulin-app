import { describe, expect, it } from 'vitest';

import { timeToMinutes, minutesToTimeStr } from '../slots';

describe('timeToMinutes', () => {
  it('converts HH:mm to minutes from midnight', () => {
    expect(timeToMinutes('00:00')).toBe(0);
    expect(timeToMinutes('10:00')).toBe(600);
    expect(timeToMinutes('10:30')).toBe(630);
    expect(timeToMinutes('23:59')).toBe(1439);
  });
});

describe('minutesToTimeStr', () => {
  it('converts minutes from midnight to HH:mm string', () => {
    expect(minutesToTimeStr(0)).toBe('00:00');
    expect(minutesToTimeStr(600)).toBe('10:00');
    expect(minutesToTimeStr(630)).toBe('10:30');
    expect(minutesToTimeStr(1439)).toBe('23:59');
  });
});
