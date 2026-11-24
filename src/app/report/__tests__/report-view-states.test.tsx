import { render, screen } from '@testing-library/react';
import type { QuestionnaireResponse } from 'fhir/r4';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/i18n', async () => {
  const { createUseTranslationsMock } =
    await import('@/i18n/__tests__/test-messages');
  return { useTranslations: createUseTranslationsMock() };
});

import type { ResearchProgress, StudyProgress } from '@/utils/fhir/research';

type ProgressHookResult = {
  data?: ResearchProgress;
  isLoading: boolean;
};
type ResponsesHookResult = {
  data?: QuestionnaireResponse[];
  isLoading: boolean;
};

const {
  mockSearchParams,
  mockUseAuth,
  mockUseResearchProgress,
  mockUseQuestionnaireTitles,
  mockUseReportResponses
} = vi.hoisted(() => ({
  mockSearchParams: new URLSearchParams(),
  mockUseAuth: vi.fn(),
  mockUseResearchProgress: vi.fn<() => ProgressHookResult>(),
  mockUseQuestionnaireTitles: vi.fn(),
  mockUseReportResponses: vi.fn<() => ResponsesHookResult>()
}));

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn() }),
  useSearchParams: () => mockSearchParams
}));

vi.mock('@/context/auth/authContext', () => ({
  useAuth: () => mockUseAuth()
}));

vi.mock('@/context/fabContext', () => ({
  useFab: () => ({ state: {}, dispatch: vi.fn() })
}));

vi.mock('@/services/api/circle', () => ({
  useCircleStats: () => ({ data: { converted: 0, joined: 0 } })
}));

vi.mock('@/services/api/research', () => ({
  useResearchProgress: () => mockUseResearchProgress()
}));

vi.mock('@/services/api/questionnaire-info', () => ({
  EMPTY_QUESTIONNAIRE_INFO_MAP: new Map(),
  useQuestionnaireTitles: () => mockUseQuestionnaireTitles()
}));

vi.mock('@/services/api/report', () => ({
  useReportResponses: () => mockUseReportResponses()
}));

vi.mock('@/components/page-header', () => ({
  default: () => <div data-testid='page-header' />
}));

import ReportView from '../report-view';

const STUDY: StudyProgress = {
  study: {
    resourceType: 'ResearchStudy',
    id: 'research',
    status: 'active',
    title: 'Mental Health Survey',
    description: 'A longitudinal survey.'
  },
  batches: [
    {
      id: 'b1',
      start: '2026-08-01',
      end: '2026-08-31',
      questionnaireIds: ['phq2']
    }
  ],
  currentBatch: {
    id: 'b1',
    start: '2026-08-01',
    end: '2026-08-31',
    questionnaireIds: ['phq2']
  },
  completedCount: 0,
  totalCount: 1,
  isComplete: false,
  firstUncompletedQuestionnaireId: 'phq2',
  completedQuestionnaireIds: [],
  history: [
    {
      batchId: 'b1',
      start: '2026-08-01',
      end: '2026-08-31',
      participated: false
    }
  ],
  consecutiveBatches: 0
};

const EMPTY_PROGRESS: ResearchProgress = {
  studies: [],
  cumulativeResponses: 0,
  questionnaireResponses: [],
  questionnaireXp: 0,
  completedQuestionnaireIds: [],
  consentedStudyIds: []
};

/** Seeds a signed-in patient with no responses yet. */
function seedPatientStudy() {
  mockSearchParams.set('id', 'research');
  mockUseAuth.mockReturnValue({
    state: { isAuthenticated: true, userInfo: { fhirId: 'pat-1' } },
    isLoading: false
  });
  mockUseResearchProgress.mockReturnValue({
    data: { ...EMPTY_PROGRESS, studies: [STUDY] },
    isLoading: false
  });
  mockUseQuestionnaireTitles.mockReturnValue({
    data: new Map([['phq2', { title: 'PHQ-2', durationMinutes: 8 }]]),
    isPending: false
  });
  mockUseReportResponses.mockReturnValue({ data: [], isLoading: false });
}

describe('ReportView loading and empty states', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSearchParams.delete('id');
    mockSearchParams.delete('completed');
    seedPatientStudy();
  });

  it('renders the skeleton while progress is loading', () => {
    mockUseResearchProgress.mockReturnValue({
      data: undefined,
      isLoading: true
    });

    render(<ReportView />);

    expect(screen.getByTestId('page-header')).toBeInTheDocument();
    expect(screen.getByTestId('report-skeleton')).toBeInTheDocument();
    expect(
      screen.queryByTestId('report-empty-not-found')
    ).not.toBeInTheDocument();
  });

  it('renders the skeleton while responses are loading', () => {
    mockUseReportResponses.mockReturnValue({
      data: undefined,
      isLoading: true
    });

    render(<ReportView />);

    expect(screen.getByTestId('report-skeleton')).toBeInTheDocument();
    expect(
      screen.queryByTestId('report-empty-no-assessments')
    ).not.toBeInTheDocument();
  });

  it('renders the not-found empty state for an unknown study', () => {
    mockUseResearchProgress.mockReturnValue({
      data: EMPTY_PROGRESS,
      isLoading: false
    });

    render(<ReportView />);

    expect(screen.getByTestId('report-empty-not-found')).toBeInTheDocument();
    expect(screen.getByText('Report not found')).toBeInTheDocument();
    expect(screen.queryByTestId('report-skeleton')).not.toBeInTheDocument();
  });

  it('renders the no-assessments empty state for a study without responses', () => {
    render(<ReportView />);

    expect(
      screen.getByTestId('report-empty-no-assessments')
    ).toBeInTheDocument();
    expect(
      screen.getByText('No completed assessments yet')
    ).toBeInTheDocument();
    expect(screen.queryByTestId('report-skeleton')).not.toBeInTheDocument();
  });
});
