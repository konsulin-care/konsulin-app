import { describe, expect, it } from 'vitest';
import { generateTimeRangeId } from '../availability';

describe('generateTimeRangeId', () => {
  it('returns a string starting with "time-"', () => {
    const id = generateTimeRangeId();
    expect(id).toMatch(/^time-/);
  });

  it('returns a unique ID on each call', () => {
    const id1 = generateTimeRangeId();
    const id2 = generateTimeRangeId();
    expect(id1).not.toBe(id2);
  });

  it('returns a non-empty ID after the prefix', () => {
    const id = generateTimeRangeId();
    const suffix = id.slice(5);
    expect(suffix.length).toBeGreaterThan(0);
  });
});
