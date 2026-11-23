import { describe, expect, it } from 'vitest';
import { canAdvanceOnTitlePage } from '../can-advance';

describe('canAdvanceOnTitlePage', () => {
  it('returns false when both title and description are empty', () => {
    expect(canAdvanceOnTitlePage('', '', 10)).toBe(false);
  });

  it('returns false when only title is provided', () => {
    expect(canAdvanceOnTitlePage('My Study', '', 10)).toBe(false);
  });

  it('returns false when only description is provided', () => {
    expect(canAdvanceOnTitlePage('', 'A description', 10)).toBe(false);
  });

  it('returns true when title, description and target are provided', () => {
    expect(canAdvanceOnTitlePage('My Study', 'A description', 10)).toBe(true);
  });

  it('returns false when title is whitespace only', () => {
    expect(canAdvanceOnTitlePage('   ', 'A description', 10)).toBe(false);
  });

  it('returns false when description is whitespace only', () => {
    expect(canAdvanceOnTitlePage('My Study', '   ', 10)).toBe(false);
  });

  it('returns false when both are whitespace only', () => {
    expect(canAdvanceOnTitlePage('   ', '   ', 10)).toBe(false);
  });

  it('returns false when description is undefined (optional field)', () => {
    expect(canAdvanceOnTitlePage('My Study', undefined, 10)).toBe(false);
  });

  it('returns false when target is undefined', () => {
    expect(canAdvanceOnTitlePage('My Study', 'A description', undefined)).toBe(
      false
    );
  });

  it('returns false when target is zero', () => {
    expect(canAdvanceOnTitlePage('My Study', 'A description', 0)).toBe(false);
  });

  it('returns false when target is negative', () => {
    expect(canAdvanceOnTitlePage('My Study', 'A description', -5)).toBe(false);
  });

  it('returns false when target is fractional', () => {
    expect(canAdvanceOnTitlePage('My Study', 'A description', 2.5)).toBe(false);
  });
});
