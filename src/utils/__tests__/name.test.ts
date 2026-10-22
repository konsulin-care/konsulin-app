import { describe, expect, it } from 'vitest';
import { getInitials } from '../name';

describe('getInitials', () => {
  it('returns first and last initials for multi-word names', () => {
    expect(getInitials('John Doe')).toBe('JD');
  });

  it('skips dr. honorific', () => {
    expect(getInitials('dr. John Doe')).toBe('JD');
  });

  it('skips Dr. honorific', () => {
    expect(getInitials('Dr. John Doe')).toBe('JD');
  });

  it('returns first two characters for single-word names', () => {
    expect(getInitials('John')).toBe('JO');
  });

  it('returns first two characters for empty name', () => {
    expect(getInitials('')).toBe('');
  });

  it('handles names with multiple spaces', () => {
    expect(getInitials('John  Michael  Doe')).toBe('JD');
  });

  it('handles three-word names', () => {
    expect(getInitials('John Michael Doe')).toBe('JD');
  });

  it('returns first two characters when only dr. is present', () => {
    expect(getInitials('dr.')).toBe('DR');
  });
});
