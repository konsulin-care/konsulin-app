import { describe, expect, it } from 'vitest';
import { legacyStudyRedirect } from '../legacy-study-redirect';

describe('legacyStudyRedirect', () => {
  it('maps id and view on / and /research to /study', () => {
    expect(legacyStudyRedirect('/', new URLSearchParams('id=a'))).toBe(
      '/study?id=a'
    );
    expect(
      legacyStudyRedirect('/research', new URLSearchParams('view=b'))
    ).toBe('/study?id=b');
  });

  it('preserves ref', () => {
    expect(
      legacyStudyRedirect('/research', new URLSearchParams('id=a&ref=p_1'))
    ).toBe('/study?id=a&ref=p_1');
  });

  it('returns null without id or view', () => {
    expect(
      legacyStudyRedirect('/research', new URLSearchParams('ref=p_1'))
    ).toBeNull();
  });
});
