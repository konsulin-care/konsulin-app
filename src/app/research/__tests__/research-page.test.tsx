/* eslint-disable max-lines */
import { wrapper } from '@/__tests__/react-test-utils';
import type { FabAction } from '@/context/fabContext';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import ResearchPage from '../research-page';
import {
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

vi.mock('@/services/api/questionnaire-info', () => ({
  useQuestionnaireTitles: mockUseQuestionnaireTitles
}));

vi.mock('@/services/api/circle', () => ({
  useCircleStats: mockUseCircleStats
}));

vi.mock('@/services/api/research-counts', () => ({
  usePerQuestionnaireCounts: mockUsePerQuestionnaireCounts,
  useStudyParticipantCount: mockUseStudyParticipantCount,
  COMPLETION_COUNT_FLOOR: 5
}));

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

describe('ResearchPage', () => {
  it('shows a skeleton instead of the empty state while the progress query is pending', () => {
    mockUseResearchProgress.mockReturnValue({
      data: undefined,
      isLoading: true
    });
    render(<ResearchPage />, { wrapper });

    expect(screen.queryByText('No ongoing research')).toBeNull();
    expect(screen.getByTestId('research-skeleton')).toBeTruthy();
    expect(screen.getByTestId('research-skeleton').tagName).toBe('OUTPUT');
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
    expect(
      screen.getByText(/A longitudinal survey of mental health/)
    ).toBeTruthy();
    expect(screen.getByText(/Closes in \d+ days/i)).toBeTruthy();
    expect(screen.getAllByText('1/2 questionnaires').length).toBeGreaterThan(0);
    expect(screen.getByTestId('batch-chip-batch-1')).toBeTruthy();
  });

  it('selects the deep-linked study as the active slide', () => {
    mockSearchParams.set('id', 'study-b');
    mockUseResearchProgress.mockReturnValue({
      data: makeProgress({ studies: [makeStudyProgress(), makeStudyB()] }),
      isLoading: false
    });

    render(<ResearchPage />, { wrapper });

    expect(screen.getByTestId('research-slide-study-b')).toHaveAttribute(
      'data-active',
      'true'
    );
    expect(screen.getByTestId('research-slide-research')).toHaveAttribute(
      'data-active',
      'false'
    );
    // Valid deep link: no URL cleanup needed.
    expect(mockReplace).not.toHaveBeenCalled();
  });

  it('falls back to the first study and cleans the URL for an unknown id', () => {
    mockSearchParams.set('id', 'unknown-study');
    mockUseResearchProgress.mockReturnValue({
      data: makeProgress({ studies: [makeStudyProgress(), makeStudyB()] }),
      isLoading: false
    });

    render(<ResearchPage />, { wrapper });

    expect(screen.getByTestId('research-slide-research')).toHaveAttribute(
      'data-active',
      'true'
    );
    expect(mockReplace).toHaveBeenCalledWith('/research');
  });

  it('preserves the referral ref when cleaning an unknown id', () => {
    mockSearchParams.set('id', 'unknown-study');
    mockSearchParams.set('ref', 'p_ABC123');
    mockUseResearchProgress.mockReturnValue({
      data: makeProgress({ studies: [makeStudyProgress(), makeStudyB()] }),
      isLoading: false
    });

    render(<ResearchPage />, { wrapper });

    expect(mockReplace).toHaveBeenCalledWith('/research?ref=p_ABC123');
  });

  it('opens the study detail drawer and focuses its card for a valid view param', async () => {
    mockSearchParams.set('view', 'study-b');
    mockUseResearchProgress.mockReturnValue({
      data: makeProgress({ studies: [makeStudyProgress(), makeStudyB()] }),
      isLoading: false
    });

    render(<ResearchPage />, { wrapper });

    expect(screen.getByTestId('research-slide-study-b')).toHaveAttribute(
      'data-active',
      'true'
    );
    expect(
      await screen.findByRole('button', { name: 'Participate' })
    ).toBeTruthy();
  });

  it('canonicalizes a legacy id+view URL to the view param and follows its focus', async () => {
    mockSearchParams.set('id', 'research');
    mockSearchParams.set('view', 'study-b');
    mockUseResearchProgress.mockReturnValue({
      data: makeProgress({ studies: [makeStudyProgress(), makeStudyB()] }),
      isLoading: false
    });

    render(<ResearchPage />, { wrapper });

    // id and view are mutually exclusive: view wins and subsumes focus.
    expect(mockReplace).toHaveBeenCalledWith('/research?view=study-b');
    expect(screen.getByTestId('research-slide-study-b')).toHaveAttribute(
      'data-active',
      'true'
    );
    expect(screen.getByTestId('research-slide-research')).toHaveAttribute(
      'data-active',
      'false'
    );
    // The view param also opens the drawer.
    expect(
      await screen.findByRole('button', { name: 'Participate' })
    ).toBeTruthy();
  });

  it('cleans an unknown view param and preserves the referral ref', () => {
    mockSearchParams.set('view', 'unknown-study');
    mockSearchParams.set('ref', 'p_ABC123');
    mockUseResearchProgress.mockReturnValue({
      data: makeProgress({ studies: [makeStudyProgress(), makeStudyB()] }),
      isLoading: false
    });

    render(<ResearchPage />, { wrapper });

    expect(mockReplace).toHaveBeenCalledWith('/research?ref=p_ABC123');
  });

  it('cleans an unknown view param without a ref', () => {
    mockSearchParams.set('view', 'unknown-study');
    mockUseResearchProgress.mockReturnValue({
      data: makeProgress({ studies: [makeStudyProgress(), makeStudyB()] }),
      isLoading: false
    });

    render(<ResearchPage />, { wrapper });

    expect(mockReplace).toHaveBeenCalledWith('/research');
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
    expect(screen.queryByRole('button', { name: 'Participate' })).toBeNull();
    expect(mockReplace).not.toHaveBeenCalled();
  });

  it('opens the drawer with a See Report CTA for a completed study deep-linked via view', async () => {
    mockSearchParams.set('view', 'research');
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

    const seeReport = await screen.findByRole('button', {
      name: 'See Report'
    });
    expect(screen.queryByRole('button', { name: 'Participate' })).toBeNull();

    fireEvent.click(seeReport);

    expect(mockPush).toHaveBeenCalledWith('/report?id=research');
  });

  it('drops the view param for an id param when the drawer is dismissed', async () => {
    mockSearchParams.set('view', 'study-b');
    mockUseResearchProgress.mockReturnValue({
      data: makeProgress({ studies: [makeStudyProgress(), makeStudyB()] }),
      isLoading: false
    });

    render(<ResearchPage />, { wrapper });

    await screen.findByRole('button', { name: 'Participate' });
    fireEvent.keyDown(document, { key: 'Escape' });

    // Focus survives the close as a deep-linkable ?id= param.
    await waitFor(() => {
      expect(mockReplace).toHaveBeenCalledWith('/research?id=study-b');
    });
    // One dismissal: the drawer closes and stays closed (no reopen flicker).
    expect(document.querySelector('[data-open="true"]')).toBeNull();
  });

  it('closes the drawer and writes the id param when the slide changes while the drawer is open', async () => {
    mockSearchParams.set('view', 'study-b');
    mockUseResearchProgress.mockReturnValue({
      data: makeProgress({ studies: [makeStudyProgress(), makeStudyB()] }),
      isLoading: false
    });

    render(<ResearchPage />, { wrapper });

    await screen.findByRole('button', { name: 'Participate' });
    // The open drawer makes carousel controls inert, so reach the pagination
    // button directly to simulate a swipe while the drawer stays open.
    const slideButton = document.querySelector<HTMLElement>(
      '[aria-label="Go to slide 1"]'
    );
    expect(slideButton).not.toBeNull();
    if (slideButton) {
      fireEvent.click(slideButton);
    }

    // A focus change cannot coexist with an open drawer: view is dropped.
    expect(mockReplace).toHaveBeenCalledWith('/research?id=research');
    expect(document.querySelector('[data-open="true"]')).toBeNull();
  });

  it('keeps the drawer open when the slide changes to the study shown in detail', async () => {
    mockSearchParams.set('view', 'research');
    mockUseResearchProgress.mockReturnValue({
      data: makeProgress({ studies: [makeStudyProgress(), makeStudyB()] }),
      isLoading: false
    });

    render(<ResearchPage />, { wrapper });

    await screen.findByRole('button', { name: 'Participate' });
    // Click the same card that is already shown in detail (research is the
    // active slide). handleSlideChange fires for the same studyId that is
    // already in detailStudyId — the drawer must not close.
    const cardButton = document.querySelector<HTMLElement>(
      '[aria-label="Open study Konsulin Mental Health Survey"]'
    );
    expect(cardButton).not.toBeNull();
    if (cardButton) {
      fireEvent.click(cardButton);
    }

    // Drawer stays open.
    expect(screen.getByRole('button', { name: 'Participate' })).toBeTruthy();
    // URL was not rewritten to drop the view param.
    expect(mockReplace).not.toHaveBeenCalledWith('/research?id=research');
  });

  it('replaces the id param with the view param when a focused slide is tapped', async () => {
    mockSearchParams.set('id', 'research');
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
    expect(
      await screen.findByRole('button', { name: 'Participate' })
    ).toBeTruthy();
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

  it('preserves the referral ref when the drawer dismisses to an id param', async () => {
    mockSearchParams.set('view', 'study-b');
    mockSearchParams.set('ref', 'p_ABC123');
    mockUseResearchProgress.mockReturnValue({
      data: makeProgress({ studies: [makeStudyProgress(), makeStudyB()] }),
      isLoading: false
    });

    render(<ResearchPage />, { wrapper });

    await screen.findByRole('button', { name: 'Participate' });
    fireEvent.keyDown(document, { key: 'Escape' });

    await waitFor(() => {
      expect(mockReplace).toHaveBeenCalledWith(
        '/research?id=study-b&ref=p_ABC123'
      );
    });
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
    // Click-to-share must not navigate; it hands off to the share handler.
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

    expect(screen.getByText(/Batch 1 completed/)).toBeTruthy();
    expect(screen.queryByText(/Next batch opens soon/)).toBeNull();
    expect(
      dispatchedActions.findLast(
        action =>
          action.type === 'SET_ACTION' && action.config?.label === 'Participate'
      )
    ).toBeUndefined();
  });

  it('shows an empty state when there are no active studies', () => {
    const data = makeProgress({ studies: [] });
    mockUseResearchProgress.mockReturnValue({ data, isLoading: false });

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
    const data = makeProgress();
    mockUseResearchProgress.mockReturnValue({ data, isLoading: false });

    render(<ResearchPage />, { wrapper });

    fireEvent.click(
      screen.getByRole('button', {
        name: 'Open study Konsulin Mental Health Survey'
      })
    );

    expect(screen.getByRole('button', { name: 'Participate' })).toBeTruthy();
  });

  it('drives the contribution dashboard ring from the active study', () => {
    mockUseResearchProgress.mockReturnValue({
      data: makeProgress({ studies: [makeStudyProgress(), makeStudyB()] }),
      isLoading: false
    });

    render(<ResearchPage />, { wrapper });

    expect(screen.getByTestId('dashboard-batch-count')).toHaveTextContent(
      '1/2 questionnaires'
    );

    fireEvent.click(screen.getByRole('button', { name: 'Go to slide 2' }));

    expect(screen.getByTestId('dashboard-batch-count')).toHaveTextContent(
      '0/2 questionnaires'
    );
  });

  it('renders the research carousel above the contribution dashboard and drops the circle panel', () => {
    mockUseResearchProgress.mockReturnValue({
      data: makeProgress(),
      isLoading: false
    });

    render(<ResearchPage />, { wrapper });

    const dashboard = screen.getByTestId('contribution-dashboard');
    const carousel = screen.getByTestId('research-slide-research');
    expect(
      carousel.compareDocumentPosition(dashboard) &
        Node.DOCUMENT_POSITION_FOLLOWING
    ).toBeTruthy();
    expect(screen.queryByTestId('circle-panel')).not.toBeInTheDocument();
    expect(screen.queryByTestId('circle-upsell')).not.toBeInTheDocument();
  });

  it('does not show XP value on carousel questionnaire rows', () => {
    mockUseResearchProgress.mockReturnValue({
      data: makeProgress(),
      isLoading: false
    });

    render(<ResearchPage />, { wrapper });

    // Questionnaire rows should not show XP (dashboard may still show XP)
    const questionnaireButtons = screen.getAllByRole('button', {
      name: /PHQ-2|Big Five Inventory/
    });
    for (const button of questionnaireButtons) {
      const row = button.closest('li');
      expect(row?.textContent).not.toMatch(/\+\d+ XP/);
    }
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
    expect(screen.getAllByText('Big Five Inventory').length).toBeGreaterThan(0);
    expect(screen.queryByText(/Also counts toward/)).toBeNull();
  });

  it('passes completion counts to StudyDetailView for researcher', async () => {
    mockUseAuth.mockReturnValue({
      state: { userInfo: { role_name: 'Researcher' } },
      isLoading: false
    });
    mockUseResearchProgress.mockReturnValue({
      data: makeProgress(),
      isLoading: false
    });
    mockUseResearcherDashboard.mockReturnValue({
      data: makeResearcherDashboardData({
        questionnaireIds: ['phq2', 'big-five-inventory']
      }),
      isLoading: false
    });
    mockUsePerQuestionnaireCounts.mockReturnValue({
      data: new Map([
        ['phq2', 12],
        ['big-five-inventory', 3]
      ])
    });

    render(<ResearchPage />, { wrapper });

    // Open the detail drawer
    fireEvent.click(
      screen.getByRole('button', {
        name: 'Open study Mental Health Survey'
      })
    );

    // Verify total participants is displayed (max of 12, 3 = 12)
    expect(
      await screen.findByText('Total participants: 12')
    ).toBeInTheDocument();
  });

  it('does not fetch completion counts for patient role', () => {
    mockUseAuth.mockReturnValue({
      state: { userInfo: { fhirId: 'patient-123', role_name: 'Patient' } },
      isLoading: false
    });
    mockUseResearchProgress.mockReturnValue({
      data: makeProgress(),
      isLoading: false
    });

    render(<ResearchPage />, { wrapper });

    // Open the detail drawer
    fireEvent.click(
      screen.getByRole('button', {
        name: 'Open study Konsulin Mental Health Survey'
      })
    );

    // Counts should not be fetched
    expect(mockUsePerQuestionnaireCounts).toHaveBeenCalledWith([]);
  });

  it('renders researcher carousel for researcher role', () => {
    mockUseAuth.mockReturnValue({
      state: {
        userInfo: {
          fhirId: 'practitioner-1',
          role_name: 'Researcher'
        }
      },
      isLoading: false
    });
    mockUseResearchProgress.mockReturnValue({
      data: undefined,
      isLoading: false
    });
    mockUseResearcherDashboard.mockReturnValue({
      data: makeResearcherDashboardData({
        questionnaireIds: ['phq2']
      }),
      isLoading: false
    });

    render(<ResearchPage />, { wrapper });

    expect(screen.getByText('Mental Health Survey')).toBeInTheDocument();
  });

  it('dispatches Register Survey FAB action for researcher', () => {
    mockUseAuth.mockReturnValue({
      state: {
        userInfo: {
          fhirId: 'practitioner-1',
          role_name: 'Researcher'
        }
      },
      isLoading: false
    });
    mockUseResearchProgress.mockReturnValue({
      data: undefined,
      isLoading: false
    });
    mockUseResearcherDashboard.mockReturnValue({
      data: { studies: [], totalParticipants: 0 },
      isLoading: false
    });

    render(<ResearchPage />, { wrapper });

    const registerAction = dispatchedActions.find(
      (action): action is Extract<FabAction, { type: 'SET_ACTION' }> =>
        action.type === 'SET_ACTION' &&
        action.config?.label === 'Register Survey'
    );
    expect(registerAction).toBeDefined();
  });

  it('opens StudyDetailView when researcher card is clicked', () => {
    mockUseAuth.mockReturnValue({
      state: {
        userInfo: {
          fhirId: 'practitioner-1',
          role_name: 'Researcher'
        }
      },
      isLoading: false
    });
    mockUseResearchProgress.mockReturnValue({
      data: undefined,
      isLoading: false
    });
    mockUseResearcherDashboard.mockReturnValue({
      data: makeResearcherDashboardData({
        questionnaireIds: ['phq2']
      }),
      isLoading: false
    });

    render(<ResearchPage />, { wrapper });

    // Click on the study card
    const button = screen.getByRole('button', {
      name: /open study mental health survey/i
    });
    fireEvent.click(button);

    // Verify URL is updated
    expect(mockReplace).toHaveBeenCalledWith(
      expect.stringContaining('view=study-1')
    );
  });

  it('does not strip ?id= for a researcher study (deep-link persistence)', () => {
    mockSearchParams.set('id', 'study-1');
    mockUseAuth.mockReturnValue({
      state: { userInfo: { role_name: 'Researcher' } },
      isLoading: false
    });
    mockUseResearchProgress.mockReturnValue({
      data: undefined,
      isLoading: false
    });
    mockUseResearcherDashboard.mockReturnValue({
      data: makeResearcherDashboardData({
        questionnaireIds: ['phq2']
      }),
      isLoading: false
    });

    render(<ResearchPage />, { wrapper });

    // Valid deep link: URL must NOT be stripped.
    expect(mockReplace).not.toHaveBeenCalled();
    expect(screen.getByText('Mental Health Survey')).toBeInTheDocument();
  });

  it('does not strip ?view= for a researcher study (deep-link persistence)', async () => {
    mockSearchParams.set('view', 'study-1');
    mockUseAuth.mockReturnValue({
      state: { userInfo: { role_name: 'Researcher' } },
      isLoading: false
    });
    mockUseResearchProgress.mockReturnValue({
      data: undefined,
      isLoading: false
    });
    mockUseResearcherDashboard.mockReturnValue({
      data: makeResearcherDashboardData({
        questionnaireIds: ['phq2']
      }),
      isLoading: false
    });

    render(<ResearchPage />, { wrapper });

    // Valid deep link: URL must NOT be stripped, drawer must open.
    expect(mockReplace).not.toHaveBeenCalled();
    expect(
      await screen.findByRole('button', { name: 'Manage Study' })
    ).toBeTruthy();
  });

  it('navigates to /research/edit when Manage Study is clicked', async () => {
    mockSearchParams.set('view', 'study-1');
    mockUseAuth.mockReturnValue({
      state: { userInfo: { role_name: 'Researcher' } },
      isLoading: false
    });
    mockUseResearchProgress.mockReturnValue({
      data: undefined,
      isLoading: false
    });
    mockUseResearcherDashboard.mockReturnValue({
      data: makeResearcherDashboardData({
        questionnaireIds: ['phq2']
      }),
      isLoading: false
    });

    render(<ResearchPage />, { wrapper });

    const manageButton = await screen.findByRole('button', {
      name: 'Manage Study'
    });
    fireEvent.click(manageButton);

    expect(mockPush).toHaveBeenCalledWith(
      '/research/edit?id=study-1&page=title'
    );
  });

  it('passes researcher study questionnaire IDs to useQuestionnaireTitles', async () => {
    mockSearchParams.set('view', 'study-1');
    mockUseAuth.mockReturnValue({
      state: { userInfo: { role_name: 'Researcher' } },
      isLoading: false
    });
    mockUseResearchProgress.mockReturnValue({
      data: undefined,
      isLoading: false
    });
    mockUseResearcherDashboard.mockReturnValue({
      data: makeResearcherDashboardData({
        questionnaireIds: ['phq2', 'big-five-inventory']
      }),
      isLoading: false
    });

    render(<ResearchPage />, { wrapper });

    await screen.findByRole('button', { name: 'Manage Study' });

    // The hook must receive questionnaire IDs from researcher studies,
    // not an empty array. An empty array means titles are never fetched.
    const lastCall = mockUseQuestionnaireTitles.mock.calls.at(
      -1
    )?.[0] as string;
    expect(lastCall).toContain('phq2');
    expect(lastCall).toContain('big-five-inventory');
  });
});
