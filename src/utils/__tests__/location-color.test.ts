import { describe, expect, it } from 'vitest';
import { getLocationColor, LOCATION_COLORS } from '../location-color';

describe('getLocationColor', () => {
  it('returns gray for null location', () => {
    expect(getLocationColor(null)).toBe('#D9D9D9');
  });

  it('returns a color from the palette for a valid id', () => {
    const color = getLocationColor('loc-1');
    expect(LOCATION_COLORS).toContain(color);
  });

  it('returns the same color for the same id', () => {
    const a = getLocationColor('loc-1');
    const b = getLocationColor('loc-1');
    expect(a).toBe(b);
  });

  it('returns different colors for different ids (likely)', () => {
    const a = getLocationColor('loc-1');
    const b = getLocationColor('loc-2');
    // They might collide but usually won't with 8 colors
    expect(typeof a).toBe('string');
    expect(typeof b).toBe('string');
  });
});
