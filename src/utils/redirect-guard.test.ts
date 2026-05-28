import { describe, expect, it } from 'vitest';
import { extractSafeRedirectPath } from './redirect-guard';

describe('extractSafeRedirectPath', () => {
  it('returns internal path when valid', () => {
    expect(
      extractSafeRedirectPath('?redirectToPath=%2Fjournal%3Ftab%3D1')
    ).toBe('/journal?tab=1');
  });

  it('returns internal path when valid2', () => {
    expect(
      extractSafeRedirectPath(
        '?redirectToPath=%2Fassessments%3FisDrawerOpen%3Dtrue%26assessmentId%3Dsomeidhere'
      )
    ).toBe('/assessments?isDrawerOpen=true&assessmentId=someidhere');
  });

  it('rejects protocol-relative payload', () => {
    expect(
      extractSafeRedirectPath('?redirectToPath=%2F%2Fevil.com')
    ).toBeNull();
  });

  it('rejects backslash payload', () => {
    expect(
      extractSafeRedirectPath('?redirectToPath=%2F%5Cevil.com')
    ).toBeNull();
  });

  it('rejects control whitespace payload', () => {
    expect(
      extractSafeRedirectPath('?redirectToPath=%2F%0D%0A%2F%2Fevil.com')
    ).toBeNull();
  });

  it('rejects encoded double-slash path payload', () => {
    expect(
      extractSafeRedirectPath('?redirectToPath=%2F%252F%252Fevil.com')
    ).toBeNull();
  });
});
