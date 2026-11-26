import type { StudyProgress } from '@/utils/fhir/research';
import { describe, expect, it } from 'vitest';
import { mergeResearcherStudies } from '../use-research-page-data';
import { makeProgress, makeResearcherDashboardData } from './research-fixtures';

describe('mergeResearcherStudies', () => {
  it('returns progress studies unchanged for non-researchers', () => {
    const studies = makeProgress().studies;
    const dashboard = makeResearcherDashboardData({
      questionnaireIds: ['phq2']
    });

    expect(mergeResearcherStudies(studies, dashboard.studies, false)).toBe(
      studies
    );
  });

  it('appends researcher studies not already in progress', () => {
    const studies: StudyProgress[] = [];
    const dashboard = makeResearcherDashboardData({
      questionnaireIds: ['phq2']
    });

    const merged = mergeResearcherStudies(studies, dashboard.studies, true);

    expect(merged.map(s => s.study.id)).toEqual(['study-1']);
  });

  it('skips researcher studies already in progress', () => {
    const studies = makeProgress().studies;
    const dashboard = makeResearcherDashboardData({
      questionnaireIds: ['phq2']
    });
    const dup = {
      ...dashboard.studies[0],
      study: { ...dashboard.studies[0].study, id: studies[0].study.id }
    };

    expect(mergeResearcherStudies(studies, [dup], true)).toHaveLength(
      studies.length
    );
  });
});
