import {
  applyStudyProfile,
  readStudyProfile
} from '@/utils/fhir/study-profile';
import type { ResearchStudy } from 'fhir/r4';
import { describe, expect, it } from 'vitest';

const base: ResearchStudy = { resourceType: 'ResearchStudy', status: 'active' };

describe('applyStudyProfile', () => {
  const input = {
    leadName: 'Dr A',
    question: 'Q?',
    ethics: 'approved' as const,
    sharesFindings: true
  };

  it('sets sponsor only with an organization', () => {
    const a = applyStudyProfile(base, {
      ...input,
      organizationId: 'g1',
      organizationName: 'G'
    });
    expect(a.sponsor).toEqual({ reference: 'Organization/g1', display: 'G' });
    expect(applyStudyProfile(base, input).sponsor).toBeUndefined();
  });

  it('sets lead and question', () => {
    const a = applyStudyProfile(base, input);
    expect(a.principalInvestigator?.display).toBe('Dr A');
    expect(a.objective?.[0].name).toBe('Q?');
  });

  it('preserves other fields', () => {
    const src: ResearchStudy = {
      ...base,
      title: 'T',
      note: [{ text: 'n' }],
      extension: [{ url: 'x', valueInteger: 5 }]
    };
    const a = applyStudyProfile(src, input);
    expect(a.note).toEqual([{ text: 'n' }]);
    expect(a.title).toBe('T');
    expect(a.extension?.find(e => e.url === 'x')?.valueInteger).toBe(5);
    expect(src.objective).toBeUndefined();
  });
});

describe('readStudyProfile', () => {
  it('reads a study without sponsor as Konsulin', () => {
    const p = readStudyProfile(base, 'k1');
    expect(p.isKonsulin).toBe(true);
    expect(p.groupName).toBeUndefined();
    expect(readStudyProfile(base, '').isKonsulin).toBe(true);
  });

  it('matches sponsor to configured org', () => {
    const own = {
      ...base,
      sponsor: { reference: 'Organization/k1', display: 'K' }
    };
    const other = {
      ...base,
      sponsor: { reference: 'Organization/g2', display: 'Group Two' }
    };
    expect(readStudyProfile(own, 'k1').isKonsulin).toBe(true);
    const p = readStudyProfile(other, 'k1');
    expect(p.isKonsulin).toBe(false);
    expect(p.groupName).toBe('Group Two');
    expect(readStudyProfile(own, '').isKonsulin).toBe(false);
  });

  it('parses a legacy study with defaults', () => {
    const p = readStudyProfile(base, 'k1');
    expect(p.ethics).toBe('not-stated');
    expect(p.question).toBeUndefined();
    expect(p.whoCanJoin).toBeUndefined();
    expect(p.sharesFindings).toBe(false);
  });
});
