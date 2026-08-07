/* eslint-disable max-lines */
import type { FabAction } from '@/context/fabContext';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import ResearchPage from '../research-page';
import {
  createResearchWrapper as createWrapper,
  makeProgress,
  makeStudyB,
  makeStudyProgress,
  TITLE_MAP
} from './research-fixtures';

/** Auth hook state shape consumed by the research page. */
interface AuthState {
  state: { userInfo: { fhirId?: string } };
  isLoading: boolean;
}

const {
  mockUseAuth,
  mockUseResearchProgress,
  mockUseConsentToStudy,
  mockUseQuestionnaireTitles,
  mockUseCircleStats,
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

vi.mock('@/services/api/questionnaire-info', () => ({
  useQuestionnaireTitles: mockUseQuestionnaireTitles
}));

vi.mock('@/services/api/circle', () => ({
  useCircleStats: mockUseCircleStats
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
    render(<ResearchPage />, { wrapper: createWrapper() });

    expect(screen.queryByText('No ongoing research')).toBeNull();
    expect(screen.getByTestId('research-skeleton')).toBeTruthy();
  });

  it('renders the carousel with study data and batch progress', () => {
    mockUseResearchProgress.mockReturnValue({
      data: makeProgress(),
      isLoading: false
    });

    render(<ResearchPage />, { wrapper: createWrapper() });

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

    render(<ResearchPage />, { wrapper: createWrapper() });

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

    render(<ResearchPage />, { wrapper: createWrapper() });

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

    render(<ResearchPage />, { wrapper: createWrapper() });

    expect(mockReplace).toHaveBeenCalledWith('/research?ref=p_ABC123');
  });

  it('opens the study detail drawer and focuses its card for a valid view param', async () => {
    mockSearchParams.set('view', 'study-b');
    mockUseResearchProgress.mockReturnValue({
      data: makeProgress({ studies: [makeStudyProgress(), makeStudyB()] }),
      isLoading: false
    });

    render(<ResearchPage />, { wrapper: createWrapper() });

    expect(screen.getByTestId('research-slide-study-b')).toHaveAttribute(
      'data-active',
      'true'
    );
    expect(
      await screen.findByRole('button', { name: 'Participate' })
    ).toBeTruthy();
  });

  it('lets a valid id win for focus over a differing valid view, but still opens the view drawer', async () => {
    mockSearchParams.set('id', 'research');
    mockSearchParams.set('view', 'study-b');
    mockUseResearchProgress.mockReturnValue({
      data: makeProgress({ studies: [makeStudyProgress(), makeStudyB()] }),
      isLoading: false
    });

    render(<ResearchPage />, { wrapper: createWrapper() });

    expect(screen.getByTestId('research-slide-research')).toHaveAttribute(
      'data-active',
      'true'
    );
    expect(
      await screen.findByRole('button', { name: 'Participate' })
    ).toBeTruthy();
    // Focus stays on the id target: the slide for study-b is not active.
    expect(screen.getByTestId('research-slide-study-b')).toHaveAttribute(
      'data-active',
      'false'
    );
  });

  it('cleans an unknown view param and preserves the referral ref', () => {
    mockSearchParams.set('view', 'unknown-study');
    mockSearchParams.set('ref', 'p_ABC123');
    mockUseResearchProgress.mockReturnValue({
      data: makeProgress({ studies: [makeStudyProgress(), makeStudyB()] }),
      isLoading: false
    });

    render(<ResearchPage />, { wrapper: createWrapper() });

    expect(mockReplace).toHaveBeenCalledWith('/research?ref=p_ABC123');
  });

  it('cleans an unknown view param without a ref', () => {
    mockSearchParams.set('view', 'unknown-study');
    mockUseResearchProgress.mockReturnValue({
      data: makeProgress({ studies: [makeStudyProgress(), makeStudyB()] }),
      isLoading: false
    });

    render(<ResearchPage />, { wrapper: createWrapper() });

    expect(mockReplace).toHaveBeenCalledWith('/research');
  });

  it('writes the view param to the URL when a card is tapped', () => {
    mockUseResearchProgress.mockReturnValue({
      data: makeProgress(),
      isLoading: false
    });

    render(<ResearchPage />, { wrapper: createWrapper() });

    fireEvent.click(screen.getByTestId('research-slide-research'));

    expect(mockReplace).toHaveBeenCalledWith('/research?view=research');
  });

  it('removes the view param from the URL when the drawer is dismissed', async () => {
    mockSearchParams.set('view', 'study-b');
    mockUseResearchProgress.mockReturnValue({
      data: makeProgress({ studies: [makeStudyProgress(), makeStudyB()] }),
      isLoading: false
    });

    render(<ResearchPage />, { wrapper: createWrapper() });

    await screen.findByRole('button', { name: 'Participate' });
    fireEvent.keyDown(document, { key: 'Escape' });

    await waitFor(() => {
      expect(mockReplace).toHaveBeenCalledWith('/research');
    });
  });

  it('keeps the view param in the URL when the slide changes while the drawer is open', async () => {
    mockSearchParams.set('view', 'study-b');
    mockUseResearchProgress.mockReturnValue({
      data: makeProgress({ studies: [makeStudyProgress(), makeStudyB()] }),
      isLoading: false
    });

    render(<ResearchPage />, { wrapper: createWrapper() });

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

    expect(mockReplace).toHaveBeenCalledWith(
      '/research?id=research&view=study-b'
    );
    // The drawer stays open on the viewed study.
    expect(screen.getByRole('button', { name: 'Participate' })).toBeTruthy();
  });

  it('replaces the URL with the study id when the slide changes', () => {
    mockUseResearchProgress.mockReturnValue({
      data: makeProgress({ studies: [makeStudyProgress(), makeStudyB()] }),
      isLoading: false
    });

    render(<ResearchPage />, { wrapper: createWrapper() });

    fireEvent.click(screen.getByRole('button', { name: 'Go to slide 2' }));

    expect(mockReplace).toHaveBeenCalledWith('/research?id=study-b');
  });

  it('preserves the referral ref when the slide changes', () => {
    mockSearchParams.set('ref', 'p_ABC123');
    mockUseResearchProgress.mockReturnValue({
      data: makeProgress({ studies: [makeStudyProgress(), makeStudyB()] }),
      isLoading: false
    });

    render(<ResearchPage />, { wrapper: createWrapper() });

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

    render(<ResearchPage />, { wrapper: createWrapper() });

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

    render(<ResearchPage />, { wrapper: createWrapper() });

    expect(screen.getByText(/You've completed this batch/i)).toBeTruthy();
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

    render(<ResearchPage />, { wrapper: createWrapper() });

    expect(screen.getByText('No ongoing research')).toBeTruthy();
  });

  it('clears the FAB action when the component unmounts', () => {
    mockUseResearchProgress.mockReturnValue({
      data: makeProgress(),
      isLoading: false
    });

    const { unmount } = render(<ResearchPage />, { wrapper: createWrapper() });
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

    render(<ResearchPage />, { wrapper: createWrapper() });

    fireEvent.click(screen.getByTestId('research-slide-research'));

    expect(screen.getByRole('button', { name: 'Participate' })).toBeTruthy();
  });

  it('drives the contribution dashboard ring from the active study', () => {
    mockUseResearchProgress.mockReturnValue({
      data: makeProgress({ studies: [makeStudyProgress(), makeStudyB()] }),
      isLoading: false
    });

    render(<ResearchPage />, { wrapper: createWrapper() });

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

    render(<ResearchPage />, { wrapper: createWrapper() });

    const dashboard = screen.getByTestId('contribution-dashboard');
    const carousel = screen.getByTestId('research-slide-research');
    expect(
      carousel.compareDocumentPosition(dashboard) &
        Node.DOCUMENT_POSITION_FOLLOWING
    ).toBeTruthy();
    expect(screen.queryByTestId('circle-panel')).not.toBeInTheDocument();
    expect(screen.queryByTestId('circle-upsell')).not.toBeInTheDocument();
  });

  it('shows the XP value on carousel questionnaire rows from the info map', () => {
    mockUseResearchProgress.mockReturnValue({
      data: makeProgress(),
      isLoading: false
    });

    render(<ResearchPage />, { wrapper: createWrapper() });

    expect(screen.getAllByText('+40 XP').length).toBeGreaterThan(0);
    expect(screen.getAllByText('+75 XP').length).toBeGreaterThan(0);
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

    render(<ResearchPage />, { wrapper: createWrapper() });

    expect(screen.getAllByText('PHQ-2').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Big Five Inventory').length).toBeGreaterThan(0);
    expect(screen.queryByText(/Also counts toward/)).toBeNull();
  });
});
