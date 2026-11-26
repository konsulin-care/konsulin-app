import type { ResearchStudy } from 'fhir/r4';
import { describe, expect, it } from 'vitest';
import { nextResearcherStep } from '../researcher-next-step';

const batch = (id: string, start: string, end: string) => ({
  id,
  start,
  end,
  questionnaireIds: ['q']
});

function mk(notes: { text: string; time: string }[] = []) {
  return {
    resourceType: 'ResearchStudy',
    status: 'active',
    note: notes
  } as ResearchStudy;
}

describe('nextResearcherStep', () => {
  it('no studies yields register', () => {
    expect(nextResearcherStep([], '2025-01-10')).toEqual({ kind: 'register' });
  });

  it('ended batch without later finding yields share; finding clears it', () => {
    const batches = [
      batch('a', '2025-01-01', '2025-01-05'),
      batch('b', '2025-01-08', '2025-01-20')
    ];
    const s = mk();
    expect(nextResearcherStep([{ study: s, batches }], '2025-01-10')).toEqual({
      kind: 'share',
      study: s,
      batchIndex: 0
    });
    const done = mk([{ text: 'x', time: '2025-01-06T00:00:00Z' }]);
    expect(
      nextResearcherStep([{ study: done, batches }], '2025-01-10').kind
    ).toBe('open');
  });

  it('open, upcoming, all-closed', () => {
    const s = mk([{ text: 'x', time: '2025-03-01T00:00:00Z' }]);
    expect(
      nextResearcherStep(
        [{ study: s, batches: [batch('a', '2025-01-01', '2025-01-20')] }],
        '2025-01-10'
      )
    ).toEqual({ kind: 'open', closesOn: '2025-01-20' });
    expect(
      nextResearcherStep(
        [{ study: s, batches: [batch('a', '2025-02-01', '2025-02-20')] }],
        '2025-01-10'
      )
    ).toEqual({ kind: 'upcoming', opensOn: '2025-02-01' });
    expect(
      nextResearcherStep(
        [{ study: s, batches: [batch('a', '2025-01-01', '2025-01-05')] }],
        '2025-01-10'
      )
    ).toEqual({ kind: 'all-closed' });
  });
});
