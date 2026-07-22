import { describe, expect, it } from 'vitest';
import { isLoincSystem } from '../fhir';

describe('isLoincSystem', () => {
  it('returns true for https://loinc.org', () => {
    expect(isLoincSystem('https://loinc.org')).toBe(true);
  });

  it('returns true for https://loinc.org', () => {
    expect(isLoincSystem('https://loinc.org')).toBe(true);
  });

  it('returns true for uppercase HTTP://LOINC.ORG', () => {
    expect(isLoincSystem('HTTP://LOINC.ORG')).toBe(true);
  });

  it('returns false for https://snomed.info/sct', () => {
    expect(isLoincSystem('https://snomed.info/sct')).toBe(false);
  });

  it('returns false for undefined', () => {
    expect(isLoincSystem(undefined)).toBe(false);
  });

  it('returns false for null', () => {
    expect(isLoincSystem(null)).toBe(false);
  });

  it('returns false for empty string', () => {
    expect(isLoincSystem('')).toBe(false);
  });
});
