import { describe, expect, it } from 'vitest';
import { buildQuestionnaireResponseSearch } from '../research';

describe('buildQuestionnaireResponseSearch', () => {
  it('scopes the search to the patient author with the earliest study start', () => {
    const url = buildQuestionnaireResponseSearch(
      { kind: 'patient', id: 'PAT-1' },
      '2026-06-01'
    );
    expect(url).toContain('author=Patient/PAT-1');
    expect(url).toContain('authored=ge2026-06-01');
    expect(url).toContain(
      'status=completed&_elements=questionnaire,authored,author&_count=500'
    );
    expect(url).not.toContain('identifier=');
  });

  it('scopes the search to the guest identifier with the earliest study start', () => {
    const url = buildQuestionnaireResponseSearch(
      { kind: 'guest', id: 'GUEST-UUID' },
      '2026-06-01'
    );
    expect(url).toContain('identifier=');
    expect(url).toContain(
      encodeURIComponent('https://login.konsulin.care/guestid|GUEST-UUID')
    );
    expect(url).toContain('authored=ge2026-06-01');
    expect(url).not.toContain('author=');
  });

  it('omits the authored bound when no study declares a period start', () => {
    const url = buildQuestionnaireResponseSearch(
      { kind: 'guest', id: 'GUEST-UUID' },
      null
    );
    expect(url).toContain('identifier=');
    expect(url).not.toContain('authored=');
  });
});
