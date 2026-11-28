import type { ResearchStudy } from 'fhir/r4';
import { describe, expect, it } from 'vitest';
import { researcherStudyStatus } from '../researcher-study-status';

const batch = (id: string, start: string, end: string) => ({
  id,
  start,
  end,
  questionnaireIds: ['q']
});

function mk(notes: { text: string; time: string }[] = []): ResearchStudy {
  return {
    resourceType: 'ResearchStudy',
    status: 'active',
    note: notes
  } as ResearchStudy;
}

describe('researcherStudyStatus', () => {
  it('ended batch without later finding yields finding-due with its index', () => {
    const batches = [
      batch('a', '2025-01-01', '2025-01-05'),
      batch('b', '2025-01-08', '2025-01-20')
    ];
    expect(researcherStudyStatus(mk(), batches, '2025-01-10')).toEqual({
      kind: 'finding-due',
      batchIndex: 0
    });
  });

  it('open when a batch spans today and every closed batch has a later finding', () => {
    const batches = [
      batch('a', '2025-01-01', '2025-01-05'),
      batch('b', '2025-01-08', '2025-01-20')
    ];
    const study = mk([{ text: 'x', time: '2025-01-06T00:00:00Z' }]);
    expect(researcherStudyStatus(study, batches, '2025-01-10')).toEqual({
      kind: 'open',
      closesOn: '2025-01-20'
    });
  });

  it('open picks the earliest closing batch', () => {
    const batches = [
      batch('a', '2025-01-01', '2025-01-30'),
      batch('b', '2025-01-05', '2025-01-20')
    ];
    const study = mk([{ text: 'x', time: '2025-01-06T00:00:00Z' }]);
    expect(researcherStudyStatus(study, batches, '2025-01-10')).toEqual({
      kind: 'open',
      closesOn: '2025-01-20'
    });
  });

  it('upcoming with the earliest opening batch', () => {
    const batches = [
      batch('a', '2025-02-05', '2025-02-20'),
      batch('b', '2025-02-01', '2025-02-20')
    ];
    expect(researcherStudyStatus(mk(), batches, '2025-01-10')).toEqual({
      kind: 'upcoming',
      opensOn: '2025-02-01'
    });
  });

  it('finished when all batches closed with findings posted', () => {
    const batches = [
      batch('a', '2025-01-01', '2025-01-05'),
      batch('b', '2025-01-08', '2025-01-20')
    ];
    const study = mk([{ text: 'x', time: '2025-01-21T00:00:00Z' }]);
    expect(researcherStudyStatus(study, batches, '2025-02-10')).toEqual({
      kind: 'finished'
    });
  });

  it('finished without batches', () => {
    expect(researcherStudyStatus(mk(), [], '2025-01-10')).toEqual({
      kind: 'finished'
    });
  });
});
