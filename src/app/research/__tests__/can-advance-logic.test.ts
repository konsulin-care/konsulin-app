import { describe, expect, it } from 'vitest';
import { canAdvanceOnTitlePage } from '../can-advance';

describe('canAdvanceOnTitlePage', () => {
  it('returns false when both title and description are empty', () => {
    expect(canAdvanceOnTitlePage('', '')).toBe(false);
  });

  it('returns false when only title is provided', () => {
    expect(canAdvanceOnTitlePage('My Study', '')).toBe(false);
  });

  it('returns false when only description is provided', () => {
    expect(canAdvanceOnTitlePage('', 'A description')).toBe(false);
  });

  it('returns true when both title and description are provided', () => {
    expect(canAdvanceOnTitlePage('My Study', 'A description')).toBe(true);
  });

  it('returns false when title is whitespace only', () => {
    expect(canAdvanceOnTitlePage('   ', 'A description')).toBe(false);
  });

  it('returns false when description is whitespace only', () => {
    expect(canAdvanceOnTitlePage('My Study', '   ')).toBe(false);
  });

  it('returns false when both are whitespace only', () => {
    expect(canAdvanceOnTitlePage('   ', '   ')).toBe(false);
  });

  it('returns false when description is undefined (optional field)', () => {
    expect(canAdvanceOnTitlePage('My Study', undefined)).toBe(false);
  });
});
