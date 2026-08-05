import type { FabAction } from '@/context/fabContext';
import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import ResearchPage from '../research-page';
import {
  createResearchWrapper as createWrapper,
  makeProgress,
  makeStudyB,
  makeStudyProgress
} from './research-fixtures';

const {
  mockUseResearchProgress,
  mockPush,
  mockReplace,
  mockFabDispatch,
  mockSearchParams,
  mockRouter
} = vi.hoisted(() => {
  const push = vi.fn();
  const replace = vi.fn();
  return {
    mockUseResearchProgress: vi.fn(),
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
  useResearchProgress: mockUseResearchProgress
}));

vi.mock('@/context/auth/authContext', () => ({
  useAuth: vi.fn(() => ({
    state: { userInfo: {} },
    isLoading: false
  }))
}));

vi.mock('next/navigation', () => ({
  useRouter: () => mockRouter,
  useSearchParams: () => mockSearchParams,
  usePathname: () => '/research'
}));

vi.mock('@/context/fabContext', () => ({
  useFab: () => ({ state: {}, dispatch: mockFabDispatch })
}));

beforeEach(() => {
  mockPush.mockReset();
  mockReplace.mockReset();
  mockFabDispatch.mockReset();
  dispatchedActions = [];
  mockFabDispatch.mockImplementation((action: FabAction) => {
    dispatchedActions.push(action);
  });
  // Reset the two params the research page consumes.
  mockSearchParams.delete('id');
  mockSearchParams.delete('ref');
});

/** Latest Participate FAB action, or null. */
function participateAction(): FabAction | null {
  return (
    dispatchedActions.findLast(
      action =>
        action.type === 'SET_ACTION' && action.config?.label === 'Participate'
    ) ?? null
  );
}

/** Invokes the latest Participate FAB action, asserting it exists. */
function invokeParticipate(): void {
  const action = participateAction();
  expect(action).toBeTruthy();
  if (action?.type === 'SET_ACTION' && action.config) {
    // deepsource:ignore JS-0098 — invoke action in test without awaiting
    void action.config.onAction();
  }
}

describe('ResearchPage', () => {
  it('shows a loading state while the progress query is pending', () => {
    mockUseResearchProgress.mockReturnValue({
      data: undefined,
      isLoading: true
    });

    render(<ResearchPage />, { wrapper: createWrapper() });

    expect(screen.getByTestId('research-loading')).toBeTruthy();
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

  it('dispatches a Participate FAB action for the first study by default', () => {
    mockUseResearchProgress.mockReturnValue({
      data: makeProgress(),
      isLoading: false
    });

    render(<ResearchPage />, { wrapper: createWrapper() });

    invokeParticipate();
    expect(mockPush).toHaveBeenCalledWith('/assessments?id=big-five-inventory');
  });

  it('targets the deep-linked study in the Participate FAB action', () => {
    mockSearchParams.set('id', 'study-b');
    mockUseResearchProgress.mockReturnValue({
      data: makeProgress({ studies: [makeStudyProgress(), makeStudyB()] }),
      isLoading: false
    });

    render(<ResearchPage />, { wrapper: createWrapper() });

    invokeParticipate();
    expect(mockPush).toHaveBeenCalledWith('/assessments?id=phq2');
  });

  it('retargets the Participate FAB action to the new active slide', () => {
    mockUseResearchProgress.mockReturnValue({
      data: makeProgress({ studies: [makeStudyProgress(), makeStudyB()] }),
      isLoading: false
    });

    render(<ResearchPage />, { wrapper: createWrapper() });

    fireEvent.click(screen.getByRole('button', { name: 'Go to slide 2' }));

    invokeParticipate();
    expect(mockPush).toHaveBeenCalledWith('/assessments?id=phq2');
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
    expect(participateAction()).toBeNull();
  });

  it('shows an empty state when there are no active studies', () => {
    mockUseResearchProgress.mockReturnValue({
      data: makeProgress({ studies: [] }),
      isLoading: false
    });

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

  it('renders the level card and rewards vault from cumulative responses', () => {
    mockUseResearchProgress.mockReturnValue({
      data: makeProgress(),
      isLoading: false
    });

    render(<ResearchPage />, { wrapper: createWrapper() });

    expect(screen.getByText('Level Participant')).toBeTruthy();
    expect(screen.getByText('Rewards vault')).toBeTruthy();
    expect(
      screen.getByText(/Standard result brief for every questionnaire/)
    ).toBeTruthy();
    expect(
      screen.getByText(/Personalized summary report \+ badge/)
    ).toBeTruthy();
  });

  it('shows overlap hints across studies in the carousel', () => {
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

    expect(screen.getAllByText('PHQ2').length).toBeGreaterThan(0);
    expect(screen.getAllByText('BIG FIVE INVENTORY').length).toBeGreaterThan(0);
    expect(
      screen.getAllByText(/also counts toward Sleep Quality Study/i).length
    ).toBeGreaterThan(0);
  });
});
