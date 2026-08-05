import type { ResearchStudy } from 'fhir/r4';
import { describe, expect, it } from 'vitest';
import {
  computeStudyProgress,
  resolveStudyIdForQuestionnaire,
  type ResearchBatch
} from '../research';

const TODAY = '2026-08-15';

function makeStudy(id: string): ResearchStudy {
  return {
    resourceType: 'ResearchStudy',
    id,
    status: 'active',
    title: `Study ${id}`,
    period: { start: '2026-08-01', end: '2027-07-31' },
    protocol: [{ reference: 'PlanDefinition/batch-x' }]
  };
}

function progressFor(studyId: string, questionnaireIds: string[]) {
  const batch: ResearchBatch = {
    id: 'batch-x',
    start: '2026-08-01',
    end: '2026-08-31',
    questionnaireIds
  };
  return computeStudyProgress(makeStudy(studyId), [batch], [], TODAY);
}

describe('resolveStudyIdForQuestionnaire', () => {
  it('returns the study whose current batch deploys the questionnaire', () => {
    const studyA = progressFor('study-a', ['phq2']);
    const studyB = progressFor('study-b', ['gad7']);

    expect(resolveStudyIdForQuestionnaire([studyA, studyB], 'gad7')).toBe(
      'study-b'
    );
    expect(resolveStudyIdForQuestionnaire([studyA, studyB], 'phq2')).toBe(
      'study-a'
    );
  });

  it('falls back to the first study when none deploys the questionnaire', () => {
    const studyA = progressFor('study-a', ['phq2']);
    const studyB = progressFor('study-b', ['gad7']);

    expect(resolveStudyIdForQuestionnaire([studyA, studyB], 'unknown-q')).toBe(
      'study-a'
    );
  });

  it('returns undefined when there are no studies', () => {
    expect(resolveStudyIdForQuestionnaire([], 'phq2')).toBeUndefined();
  });
});
