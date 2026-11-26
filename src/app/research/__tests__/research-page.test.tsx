/* eslint-disable max-lines */

vi.mock('@/i18n', async () => {
  const { createUseTranslationsMock } =
    await import('@/i18n/__tests__/test-messages');
  return { useTranslations: createUseTranslationsMock() };
});

import { wrapper } from '@/__tests__/react-test-utils';
import type { FabAction } from '@/context/fabContext';
import { formatBatchDate } from '@/utils/format-batch-date';
import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import ResearchPage from '../research-page';
import {
  BATCH_1,
  makeProgress,
  makeResearcherDashboardData,
  makeStudyB,
  makeStudyProgress,
  TITLE_MAP
} from './research-fixtures';

/** Auth hook state shape consumed by the research page. */
interface AuthState {
  state: { userInfo: { fhirId?: string; role_name?: string } };
  isLoading: boolean;
}

const {
  mockUseAuth,
  mockUseResearchProgress,
  mockUseConsentToStudy,
  mockUseQuestionnaireTitles,
  mockUseCircleStats,
  mockUsePerQuestionnaireCounts,
  mockUseResearcherDashboard,
  mockUseStudyParticipantCount,
  mockPush,
  mockReplace,
  mockFabDispatch,
  mockSearchParams,
  mockRouter
} = vi.hoisted(() => {
  const push = vi.fn();
  const replace = vi.fn();
  return {
    mockUseAuth: vi.fn<() => AuthState>(),
    mockUseResearchProgress: vi.fn(),
    mockUseConsentToStudy: vi.fn(),
    mockUseQuestionnaireTitles: vi.fn(),
    mockUseCircleStats: vi.fn(),
    mockUsePerQuestionnaireCounts: vi.fn(),
    mockUseResearcherDashboard: vi.fn(),
    mockUseStudyParticipantCount: vi.fn(),
    mockPush: push,
    mockReplace: replace,
    mockFabDispatch: vi.fn(),
    mockSearchParams: new URLSearchParams(),
    mockRouter: { push, replace }
  };
});

/** Dispatched FAB actions captured by the mock, reset per test. */
let dispatchedActions: FabAction[] = [];

vi.mock('@/services/api/research', () => ({
  useResearchProgress: mockUseResearchProgress,
  useConsentToStudy: mockUseConsentToStudy,
  useClaimLocalConsents: vi.fn()
}));

vi.mock('@/services/api/researcher', () => ({
  useResearcherDashboard: mockUseResearcherDashboard
}));

vi.mock('@/hooks/useWaitingSubmissions', () => ({
  useWaitingSubmissions: () => []
}));

vi.mock('@/services/api/questionnaire-info', () => ({
  useQuestionnaireTitles: mockUseQuestionnaireTitles
}));

vi.mock('@/services/api/circle', () => ({
  useCircleStats: mockUseCircleStats
}));

vi.mock('@/services/api/research-counts', async importOriginal => {
  const actual =
    await importOriginal<typeof import('@/services/api/research-counts')>();
  return {
    ...actual,
    usePerQuestionnaireCounts: mockUsePerQuestionnaireCounts,
    useStudyParticipantCount: mockUseStudyParticipantCount
  };
});

vi.mock('@/context/auth/authContext', () => ({
  useAuth: () => mockUseAuth()
}));

vi.mock('next/navigation', () => ({
  useRouter: () => mockRouter,
  useSearchParams: () => mockSearchParams,
  usePathname: () => '/research'
}));

vi.mock('@/context/fabContext', () => ({
  useFab: () => ({ state: {}, dispatch: mockFabDispatch })
}));
vi.mock('react-toastify', () => ({
  toast: { error: vi.fn(), success: vi.fn() }
}));

beforeEach(() => {
  window.localStorage.clear();
  mockUseAuth.mockReset();
  mockUseAuth.mockReturnValue({ state: { userInfo: {} }, isLoading: false });
  mockUseConsentToStudy.mockReset();
  mockUseConsentToStudy.mockReturnValue({ mutate: vi.fn() });
  mockUseQuestionnaireTitles.mockReset();
  mockUseQuestionnaireTitles.mockReturnValue({
    data: TITLE_MAP,
    isPending: false
  });
  mockUseCircleStats.mockReset();
  mockUseCircleStats.mockReturnValue({ data: { converted: 0, joined: 0 } });
  mockUsePerQuestionnaireCounts.mockReset();
  mockUsePerQuestionnaireCounts.mockReturnValue({ data: new Map() });
  mockUseStudyParticipantCount.mockReset();
  mockUseStudyParticipantCount.mockReturnValue({ data: undefined });
  mockUseResearcherDashboard.mockReset();
  mockUseResearcherDashboard.mockReturnValue({
    data: undefined,
    isLoading: true
  });
  mockPush.mockReset();
  mockReplace.mockReset();
  mockFabDispatch.mockReset();
  dispatchedActions = [];
  mockFabDispatch.mockImplementation((action: FabAction) => {
    dispatchedActions.push(action);
  });
  mockSearchParams.delete('id');
  mockSearchParams.delete('view');
  mockSearchParams.delete('ref');
});

/** Signs in as a researcher with one dashboard study. */
function setupResearcher(questionnaireIds: string[] = ['phq2']): void {
  mockUseAuth.mockReturnValue({
    state: { userInfo: { fhirId: 'practitioner-1', role_name: 'Researcher' } },
    isLoading: false
  });
  mockUseResearchProgress.mockReturnValue({
    data: undefined,
    isLoading: false
  });
  mockUseResearcherDashboard.mockReturnValue({
    data: makeResearcherDashboardData({ questionnaireIds }),
    isLoading: false
  });
}

describe('ResearchPage', () => {
  it('shows a skeleton instead of the empty state while the progress query is pending', () => {
    mockUseResearchProgress.mockReturnValue({
      data: undefined,
      isLoading: true
    });
    render(<ResearchPage />, { wrapper });

    expect(screen.queryByText('No ongoing research')).toBeNull();
    expect(screen.getByTestId('research-skeleton')).toBeTruthy();
    expect(screen.getByRole('status')).toBe(
      screen.getByTestId('research-skeleton')
    );
  });

  it('renders the carousel with study data and batch progress', () => {
    mockUseResearchProgress.mockReturnValue({
      data: makeProgress(),
      isLoading: false
    });

    render(<ResearchPage />, { wrapper });

    expect(
      screen.getAllByText('Konsulin Mental Health Survey').length
    ).toBeGreaterThan(0);
    expect(screen.getByTestId('batch-line')).toHaveTextContent(
      `Batch 1 of 1 · Closes ${formatBatchDate(BATCH_1.end, 'id')}`
    );
  });

  it('redirects a legacy id URL to the study page', () => {
    mockSearchParams.set('id', 'study-b');
    mockUseResearchProgress.mockReturnValue({
      data: makeProgress({ studies: [makeStudyProgress(), makeStudyB()] }),
      isLoading: false
    });

    render(<ResearchPage />, { wrapper });

    expect(mockReplace).toHaveBeenCalledWith('/study?id=study-b');
  });

  it('redirects a legacy view URL to the study page and keeps ref', () => {
    mockSearchParams.set('view', 'study-b');
    mockSearchParams.set('ref', 'p_ABC123');
    mockUseResearchProgress.mockReturnValue({
      data: makeProgress({ studies: [makeStudyProgress(), makeStudyB()] }),
      isLoading: false
    });

    render(<ResearchPage />, { wrapper });

    expect(mockReplace).toHaveBeenCalledWith('/study?id=study-b&ref=p_ABC123');
  });

  it('writes the view param to the URL when a card is tapped', () => {
    mockUseResearchProgress.mockReturnValue({
      data: makeProgress(),
      isLoading: false
    });

    render(<ResearchPage />, { wrapper });

    fireEvent.click(
      screen.getByRole('button', {
        name: 'Open study Konsulin Mental Health Survey'
      })
    );

    expect(mockReplace).toHaveBeenCalledWith('/research?view=research');
  });

  it('redirects to the report when a completed study card is tapped', () => {
    mockUseResearchProgress.mockReturnValue({
      data: makeProgress({
        studies: [
          makeStudyProgress({
            completedCount: 2,
            isComplete: true,
            firstUncompletedQuestionnaireId: null,
            completedQuestionnaireIds: ['phq2', 'big-five-inventory']
          })
        ]
      }),
      isLoading: false
    });

    render(<ResearchPage />, { wrapper });

    fireEvent.click(
      screen.getByRole('button', {
        name: 'Open study Konsulin Mental Health Survey'
      })
    );

    expect(mockPush).toHaveBeenCalledWith('/report?id=research');
    expect(mockReplace).not.toHaveBeenCalled();
  });

  it('replaces the URL with the study id when the slide changes', () => {
    mockUseResearchProgress.mockReturnValue({
      data: makeProgress({ studies: [makeStudyProgress(), makeStudyB()] }),
      isLoading: false
    });

    render(<ResearchPage />, { wrapper });

    fireEvent.click(screen.getByRole('button', { name: 'Go to slide 2' }));

    expect(mockReplace).toHaveBeenCalledWith('/research?id=study-b');
  });

  it('preserves the referral ref when the slide changes', () => {
    mockSearchParams.set('ref', 'p_ABC123');
    mockUseResearchProgress.mockReturnValue({
      data: makeProgress({ studies: [makeStudyProgress(), makeStudyB()] }),
      isLoading: false
    });

    render(<ResearchPage />, { wrapper });

    fireEvent.click(screen.getByRole('button', { name: 'Go to slide 2' }));

    expect(mockReplace).toHaveBeenCalledWith(
      '/research?id=study-b&ref=p_ABC123'
    );
  });

  it('targets the active slide study when sharing via the share bar', () => {
    mockUseResearchProgress.mockReturnValue({
      data: makeProgress(),
      isLoading: false
    });

    render(<ResearchPage />, { wrapper });

    expect(screen.getByTestId('research-slide-research')).toHaveAttribute(
      'data-active',
      'true'
    );
    fireEvent.click(screen.getByTestId('research-share-research'));
    expect(mockPush).not.toHaveBeenCalled();
  });

  it('renders a completion state instead of a stale CTA when the batch is done', () => {
    mockUseResearchProgress.mockReturnValue({
      data: makeProgress({
        studies: [
          makeStudyProgress({
            completedCount: 2,
            isComplete: true,
            firstUncompletedQuestionnaireId: null,
            completedQuestionnaireIds: ['phq2', 'big-five-inventory']
          })
        ]
      }),
      isLoading: false
    });

    render(<ResearchPage />, { wrapper });

    expect(screen.getByTestId('batch-line')).toHaveTextContent(
      `Batch 1 of 1 completed · Closes ${formatBatchDate(BATCH_1.end, 'id')}`
    );
    expect(
      dispatchedActions.findLast(
        action =>
          action.type === 'SET_ACTION' && action.config?.label === 'Participate'
      )
    ).toBeUndefined();
  });

  it('shows an empty state when there are no active studies', () => {
    mockUseResearchProgress.mockReturnValue({
      data: makeProgress({ studies: [] }),
      isLoading: false
    });

    render(<ResearchPage />, { wrapper });

    expect(screen.getByText('No ongoing research')).toBeTruthy();
  });

  it('clears the FAB action when the component unmounts', () => {
    mockUseResearchProgress.mockReturnValue({
      data: makeProgress(),
      isLoading: false
    });

    const { unmount } = render(<ResearchPage />, { wrapper });
    unmount();

    expect(
      dispatchedActions.some(
        action => action.type === 'SET_ACTION' && action.config === null
      )
    ).toBe(true);
  });

  it('opens the full study detail view when a card is tapped', () => {
    mockUseResearchProgress.mockReturnValue({
      data: makeProgress(),
      isLoading: false
    });

    render(<ResearchPage />, { wrapper });

    fireEvent.click(
      screen.getByRole('button', {
        name: 'Open study Konsulin Mental Health Survey'
      })
    );

    expect(screen.getByRole('button', { name: 'Participate' })).toBeTruthy();
  });

  it('renders no contribution dashboard and drops the circle panel', () => {
    mockUseResearchProgress.mockReturnValue({
      data: makeProgress(),
      isLoading: false
    });

    render(<ResearchPage />, { wrapper });

    expect(screen.queryByTestId('contribution-dashboard')).toBeNull();
    expect(screen.queryByTestId('circle-panel')).not.toBeInTheDocument();
  });

  it('hides overlap hints across studies in the carousel', () => {
    mockUseResearchProgress.mockReturnValue({
      data: makeProgress({
        studies: [
          makeStudyProgress(),
          makeStudyB({
            study: {
              resourceType: 'ResearchStudy',
              id: 'study-b',
              status: 'active',
              title: 'Sleep Quality Study'
            }
          })
        ]
      }),
      isLoading: false
    });

    render(<ResearchPage />, { wrapper });

    expect(screen.getAllByText('PHQ-2').length).toBeGreaterThan(0);
    expect(screen.queryByText(/Also counts toward/)).toBeNull();
  });

  it('renders the collective goal instead of a total participants line for patients', () => {
    mockUseAuth.mockReturnValue({
      state: { userInfo: { fhirId: 'patient-123', role_name: 'Patient' } },
      isLoading: false
    });
    mockUseStudyParticipantCount.mockReturnValue({ data: 10 });
    mockUseResearchProgress.mockReturnValue({
      data: makeProgress(),
      isLoading: false
    });

    render(<ResearchPage />, { wrapper });

    expect(screen.getByText('10 people have joined.')).toBeInTheDocument();
    expect(screen.queryByText(/Total participants:/)).toBeNull();
  });

  it('renders researcher carousel for researcher role', () => {
    setupResearcher();

    render(<ResearchPage />, { wrapper });

    expect(screen.getByText('Mental Health Survey')).toBeInTheDocument();
  });

  it('dispatches Register Survey FAB action for researcher', () => {
    setupResearcher();
    mockUseResearcherDashboard.mockReturnValue({
      data: { studies: [], totalParticipants: 0 },
      isLoading: false
    });

    render(<ResearchPage />, { wrapper });

    expect(
      dispatchedActions.find(
        action =>
          action.type === 'SET_ACTION' &&
          action.config?.label === 'Register Survey'
      )
    ).toBeDefined();
  });

  it('opens StudyDetailView when researcher card is clicked', () => {
    setupResearcher();

    render(<ResearchPage />, { wrapper });

    fireEvent.click(
      screen.getByRole('button', { name: /open study mental health survey/i })
    );

    expect(mockReplace).toHaveBeenCalledWith(
      expect.stringContaining('view=study-1')
    );
  });

  it('navigates to /research/edit when Manage Study is clicked', async () => {
    setupResearcher();

    render(<ResearchPage />, { wrapper });

    fireEvent.click(
      screen.getByRole('button', { name: /open study mental health survey/i })
    );
    fireEvent.click(
      await screen.findByRole('button', { name: 'Manage Study' })
    );

    expect(mockPush).toHaveBeenCalledWith(
      '/research/edit?id=study-1&page=title'
    );
  });

  it('passes researcher study questionnaire IDs to useQuestionnaireTitles', () => {
    setupResearcher(['phq2', 'big-five-inventory']);

    render(<ResearchPage />, { wrapper });

    const lastCall = mockUseQuestionnaireTitles.mock.calls.at(
      -1
    )?.[0] as string;
    expect(lastCall).toContain('phq2');
    expect(lastCall).toContain('big-five-inventory');
  });
});
