import { afterEach, describe, expect, it } from 'vitest';
import { localDateOf } from '../local-date';

describe('localDateOf', () => {
  const originalTz = process.env.TZ;

  afterEach(() => {
    if (originalTz === undefined) {
      delete process.env.TZ;
      return;
    }
    process.env.TZ = originalTz;
  });

  it('returns the calendar date in the given time zone', () => {
    expect(localDateOf('2026-11-12T17:30:00Z', 'Asia/Jakarta')).toBe(
      '2026-11-13'
    );
  });

  it('returns a date-only input unchanged', () => {
    expect(localDateOf('2026-11-13')).toBe('2026-11-13');
  });

  it('uses the process time zone when no time zone is given', () => {
    process.env.TZ = 'Asia/Jakarta';

    expect(localDateOf('2026-11-12T17:30:00Z')).toBe('2026-11-13');
  });
});
