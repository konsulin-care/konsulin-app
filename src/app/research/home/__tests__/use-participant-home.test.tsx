import { useAuth } from '@/context/auth/authContext';
import type { QuestionnaireInfo } from '@/services/api/questionnaire-info';
import type { ResearchProgress, StudyProgress } from '@/utils/fhir/research';
import { renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useParticipantHome } from '../use-participant-home';

const KONSULIN_ORG = 'konsulin-org';

const mockProgress = vi.fn<() => unknown>();
const mockWaiting = vi.fn<() => readonly unknown[]>();
const mockTitles =
  vi.fn<() => { data: ReadonlyMap<string, QuestionnaireInfo> }>();

vi.mock('@/services/api/research', () => ({
  useResearchProgress: () => mockProgress()
}));

vi.mock('@/hooks/useWaitingSubmissions', () => ({
  useWaitingSubmissions: () => mockWaiting()
}));

vi.mock('@/services/api/questionnaire-info', () => ({
  EMPTY_QUESTIONNAIRE_INFO_MAP: new Map(),
  useQuestionnaireTitles: () => ({ ...mockTitles(), isPending: false })
}));

vi.mock('@/components/general/runtime-config-provider', () => ({
  useRuntimeConfig: () => ({ konsulinOrganizationId: 'konsulin-org' })
}));

vi.mock('@/context/auth/authContext', () => ({
  useAuth: vi.fn()
}));

/** Builds a study progress fixture with one wide-open batch. */
function makeProgress(
  id: string,
  title: string,
  options: {
    end: string;
    questionnaires: string[];
    sponsor?: { display: string; reference: string };
    notes?: { text: string; time: string }[];
  }
): StudyProgress {
  const batch = {
    id: `${id}-batch-1`,
    start: '2000-01-01',
    end: options.end,
    questionnaireIds: options.questionnaires
  };
  return {
    study: {
      resourceType: 'ResearchStudy',
      id,
      status: 'active',
      title,
      ...(options.sponsor ? { sponsor: options.sponsor } : {}),
      ...(options.notes
        ? { note: options.notes.map(note => ({ ...note })) }
        : {})
    },
    batches: [batch],
    currentBatch: batch,
    completedCount: 0,
    totalCount: options.questionnaires.length,
    isComplete: false,
    firstUncompletedQuestionnaireId: options.questionnaires[0] ?? null,
    completedQuestionnaireIds: [],
    history: []
  };
}

/** Builds the progress payload the hook consumes. */
function makeResearchProgress(
  studies: StudyProgress[],
  completedQuestionnaireIds: string[],
  consentedStudyIds: string[]
): ResearchProgress {
  return {
    studies,
    cumulativeResponses: completedQuestionnaireIds.length,
    completedQuestionnaireIds,
    consentedStudyIds
  };
}

/** Sets the mocked progress query result. */
function setProgress(data: ResearchProgress | undefined): void {
  mockProgress.mockReturnValue({
    data,
    isLoading: false,
    isError: false
  });
}

describe('useParticipantHome', () => {
  beforeEach(() => {
    vi.mocked(useAuth).mockReturnValue({
      state: { userInfo: { fhirId: 'p1', role_name: 'Patient' } },
      isLoading: false
    } as ReturnType<typeof useAuth>);
    mockWaiting.mockReturnValue([]);
    mockTitles.mockReturnValue({
      data: new Map<string, QuestionnaireInfo>([
        ['phq2', { title: 'PHQ-2', durationMinutes: 5 }],
        ['gad7', { title: 'GAD-7', durationMinutes: 7 }]
      ])
    });
  });

  it('queues and totals only joined studies', () => {
    const joined = makeProgress('joined', 'Joined study', {
      end: '2999-12-31',
      questionnaires: ['phq2']
    });
    const other = makeProgress('other', 'Other study', {
      end: '2999-12-31',
      questionnaires: ['gad7']
    });
    setProgress(
      makeResearchProgress([joined, other], ['phq2', 'gad7'], ['joined'])
    );

    const { result } = renderHook(() => useParticipantHome());

    expect(result.current.scopedStudies).toEqual([joined]);
    expect(result.current.queue.map(item => item.questionnaireId)).toEqual([
      'phq2'
    ]);
    expect(result.current.totals).toEqual({
      questionnairesShared: 1,
      minutes: 5,
      studies: 1
    });
  });

  it('keeps shelves in catalogue order and drops joined studies', () => {
    const joined = makeProgress('joined', 'Joined study', {
      end: '2026-01-01',
      questionnaires: ['phq2'],
      sponsor: {
        display: 'Konsulin',
        reference: `Organization/${KONSULIN_ORG}`
      }
    });
    const konsulin = makeProgress('konsulin', 'Konsulin study', {
      end: '2026-12-31',
      questionnaires: ['phq2'],
      sponsor: {
        display: 'Konsulin',
        reference: `Organization/${KONSULIN_ORG}`
      }
    });
    const otherLate = makeProgress('other-late', 'Other late', {
      end: '2026-12-31',
      questionnaires: ['gad7'],
      sponsor: { display: 'University Lab', reference: 'Organization/uni' }
    });
    const otherEarly = makeProgress('other-early', 'Other early', {
      end: '2026-01-31',
      questionnaires: ['gad7'],
      sponsor: { display: 'University Lab', reference: 'Organization/uni' }
    });
    setProgress(
      makeResearchProgress(
        [otherLate, joined, konsulin, otherEarly],
        [],
        ['joined']
      )
    );

    const { result } = renderHook(() => useParticipantHome());

    expect(
      result.current.shelves.konsulin.map(study => study.study.title)
    ).toEqual(['Konsulin study']);
    expect(
      result.current.shelves.others.map(study => study.study.title)
    ).toEqual(['Other early', 'Other late']);
  });

  it('puts findings of joined studies first', () => {
    const joined = makeProgress('joined', 'Joined study', {
      end: '2999-12-31',
      questionnaires: ['phq2'],
      notes: [{ text: 'Older joined finding', time: '2024-01-01T00:00:00Z' }]
    });
    const other = makeProgress('other', 'Other study', {
      end: '2999-12-31',
      questionnaires: ['gad7'],
      notes: [{ text: 'Newer other finding', time: '2024-06-01T00:00:00Z' }]
    });
    setProgress(makeResearchProgress([other, joined], [], ['joined']));

    const { result } = renderHook(() => useParticipantHome());

    expect(result.current.findings.map(item => item.studyId)).toEqual([
      'joined',
      'other'
    ]);
  });
});
