import { describe, expect, it } from 'vitest';
import {
  buildQuestionnaireResponseSearch,
  buildStudiesBundle
} from '../research';

describe('buildStudiesBundle', () => {
  it('builds a batch bundle with study and ResearchSubject searches for a patient', () => {
    const bundle = buildStudiesBundle(
      { kind: 'patient', id: 'PAT-1' },
      '2026-08-01'
    );
    const urls = bundle.entry?.map(e => e.request?.url) ?? [];
    expect(urls).toHaveLength(2);
    expect(urls[0]).toBe(
      'ResearchStudy?date=ge2026-08-01&status=active&_include=ResearchStudy:protocol'
    );
    expect(urls[1]).toBe(
      'ResearchSubject?patient=Patient/PAT-1&_elements=study,status&_count=100'
    );
  });

  it('builds a study-only bundle for guests without a patient id', () => {
    const bundle = buildStudiesBundle(
      { kind: 'guest', id: 'GUEST-UUID' },
      '2026-08-01'
    );
    const urls = bundle.entry?.map(e => e.request?.url) ?? [];
    expect(urls).toHaveLength(1);
    expect(urls[0]).toContain('ResearchStudy?date=ge2026-08-01');
    expect(urls.some(url => url.startsWith('ResearchSubject?'))).toBe(false);
  });
});

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
