import type { ResearchStudy } from 'fhir/r4';
import { describe, expect, it } from 'vitest';
import {
  computeStudyProgress,
  nextAssessmentInStudy,
  resolveStudyIdForQuestionnaire,
  type ResearchBatch,
  type ResearchResponse
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

function progressFor(
  studyId: string,
  questionnaireIds: string[],
  completed: string[] = []
) {
  const batch: ResearchBatch = {
    id: 'batch-x',
    start: '2026-08-01',
    end: '2026-08-31',
    questionnaireIds
  };
  const responses: ResearchResponse[] = completed.map((questionnaire, i) => ({
    id: `resp-${i}`,
    questionnaire: `Questionnaire/${questionnaire}`,
    authored: '2026-08-10T10:00:00Z'
  }));
  return computeStudyProgress(makeStudy(studyId), [batch], responses, TODAY);
}

describe('nextAssessmentInStudy', () => {
  it('returns null when the questionnaire is not part of any current batch', () => {
    const studyA = progressFor('study-a', ['phq2']);
    expect(nextAssessmentInStudy([studyA], 'gad7')).toBeNull();
  });

  it('returns the next uncompleted questionnaire, excluding the submitted one', () => {
    const studyA = progressFor(
      'study-a',
      ['phq2', 'big-five-inventory', 'gad7'],
      ['phq2']
    );
    expect(nextAssessmentInStudy([studyA], 'big-five-inventory')).toEqual({
      studyId: 'study-a',
      nextQuestionnaireId: 'gad7'
    });
  });

  it('returns a null next when the submitted questionnaire is the last in the batch', () => {
    const studyA = progressFor(
      'study-a',
      ['phq2', 'big-five-inventory'],
      ['phq2']
    );
    expect(nextAssessmentInStudy([studyA], 'big-five-inventory')).toEqual({
      studyId: 'study-a',
      nextQuestionnaireId: null
    });
  });

  it('picks the study with the fewest remaining among overlapping batches', () => {
    const short = progressFor('study-short', ['phq2', 'gad7'], ['phq2']);
    const long = progressFor(
      'study-long',
      ['phq2', 'gad7', 'who5', 'pss4'],
      ['phq2']
    );
    expect(nextAssessmentInStudy([long, short], 'phq2')).toEqual({
      studyId: 'study-short',
      nextQuestionnaireId: 'gad7'
    });
  });

  it('continues past a re-submitted, already-completed questionnaire', () => {
    const studyA = progressFor(
      'study-a',
      ['phq2', 'big-five-inventory', 'gad7'],
      ['phq2', 'big-five-inventory']
    );
    expect(nextAssessmentInStudy([studyA], 'phq2')).toEqual({
      studyId: 'study-a',
      nextQuestionnaireId: 'gad7'
    });
  });

  it('prefers the requested study over the shortest-path alternative', () => {
    const short = progressFor('study-short', ['phq2', 'gad7'], ['phq2']);
    const long = progressFor(
      'study-long',
      ['phq2', 'gad7', 'who5', 'pss4'],
      ['phq2']
    );
    expect(nextAssessmentInStudy([long, short], 'phq2', 'study-long')).toEqual({
      studyId: 'study-long',
      nextQuestionnaireId: 'gad7'
    });
  });

  it('falls back to the shortest-path study when the preferred study is unknown', () => {
    const short = progressFor('study-short', ['phq2', 'gad7'], ['phq2']);
    const long = progressFor(
      'study-long',
      ['phq2', 'gad7', 'who5', 'pss4'],
      ['phq2']
    );
    expect(
      nextAssessmentInStudy([long, short], 'phq2', 'unknown-study')
    ).toEqual({
      studyId: 'study-short',
      nextQuestionnaireId: 'gad7'
    });
  });

  it('excludes chain-done questionnaires even when the progress cache is stale', () => {
    // The cache still lists phq2 as uncompleted; the done chain records it.
    const studyA = progressFor('study-a', [
      'phq2',
      'big-five-inventory',
      'gad7'
    ]);
    expect(
      nextAssessmentInStudy([studyA], 'big-five-inventory', 'study-a', ['phq2'])
    ).toEqual({
      studyId: 'study-a',
      nextQuestionnaireId: 'gad7'
    });
  });
});

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
