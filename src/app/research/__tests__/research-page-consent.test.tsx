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
  mockUseAuth,
  mockUseResearchProgress,
  mockUseConsentToStudy,
  mockPush,
  mockReplace,
  mockFabDispatch,
  mockSearchParams,
  mockRouter
} = vi.hoisted(() => {
  const push = vi.fn();
  const replace = vi.fn();
  return {
    mockUseAuth: vi.fn<
      () => {
        state: { userInfo: { fhirId?: string } };
        isLoading: boolean;
      }
    >(),
    mockUseResearchProgress: vi.fn(),
    mockUseConsentToStudy: vi.fn(),
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
  useConsentToStudy: mockUseConsentToStudy
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

/** Mutation mock whose mutate resolves with the given outcome. */
function consentMutationMock(
  opts: {
    onSuccess?: () => void;
    onError?: () => void;
  } = {}
) {
  return {
    mutate: vi.fn(
      (
        _args: unknown,
        callbacks?: { onSuccess?: () => void; onError?: () => void }
      ) => {
        if (opts.onError) {
          opts.onError();
          return;
        }
        callbacks?.onSuccess?.();
      }
    )
  };
}

beforeEach(() => {
  window.localStorage.clear();
  mockUseAuth.mockReset();
  mockUseAuth.mockReturnValue({ state: { userInfo: {} }, isLoading: false });
  mockUseConsentToStudy.mockReset();
  mockUseConsentToStudy.mockReturnValue(consentMutationMock());
  mockPush.mockReset();
  mockReplace.mockReset();
  mockFabDispatch.mockReset();
  dispatchedActions = [];
  mockFabDispatch.mockImplementation((action: FabAction) => {
    dispatchedActions.push(action);
  });
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

describe('ResearchPage consent flow', () => {
  it('opens the consent drawer from the Participate FAB when not consented', async () => {
    mockUseResearchProgress.mockReturnValue({
      data: makeProgress(),
      isLoading: false
    });

    render(<ResearchPage />, { wrapper: createWrapper() });

    invokeParticipate();

    expect(
      await screen.findByRole('button', { name: 'Agree to Participate' })
    ).toBeTruthy();
    expect(mockPush).not.toHaveBeenCalled();
  });

  it('records guest consent in localStorage and navigates on agree', async () => {
    mockUseResearchProgress.mockReturnValue({
      data: makeProgress(),
      isLoading: false
    });

    render(<ResearchPage />, { wrapper: createWrapper() });

    invokeParticipate();
    fireEvent.click(
      await screen.findByRole('button', { name: 'Agree to Participate' })
    );

    expect(mockPush).toHaveBeenCalledWith('/assessments?id=big-five-inventory');
    expect(window.localStorage.getItem('konsulin_consent_research')).toBe('1');
  });

  it('skips the consent drawer for an already consented patient study', () => {
    mockUseAuth.mockReturnValue({
      state: { userInfo: { fhirId: 'PAT-1' } },
      isLoading: false
    });
    mockUseResearchProgress.mockReturnValue({
      data: makeProgress({ consentedStudyIds: ['research'] }),
      isLoading: false
    });

    render(<ResearchPage />, { wrapper: createWrapper() });

    invokeParticipate();

    expect(mockPush).toHaveBeenCalledWith('/assessments?id=big-five-inventory');
    expect(
      screen.queryByRole('button', { name: 'Agree to Participate' })
    ).toBeNull();
  });

  it('records FHIR consent and navigates for patients on agree', async () => {
    mockUseAuth.mockReturnValue({
      state: { userInfo: { fhirId: 'PAT-1' } },
      isLoading: false
    });
    const consentMock = consentMutationMock();
    mockUseConsentToStudy.mockReturnValue(consentMock);
    mockUseResearchProgress.mockReturnValue({
      data: makeProgress(),
      isLoading: false
    });

    render(<ResearchPage />, { wrapper: createWrapper() });

    invokeParticipate();
    fireEvent.click(
      await screen.findByRole('button', { name: 'Agree to Participate' })
    );

    expect(consentMock.mutate).toHaveBeenCalledTimes(1);
    expect(mockPush).toHaveBeenCalledWith('/assessments?id=big-five-inventory');
  });

  it('shows a toast and stays put when consent creation fails', async () => {
    mockUseAuth.mockReturnValue({
      state: { userInfo: { fhirId: 'PAT-1' } },
      isLoading: false
    });
    const onError = vi.fn();
    mockUseConsentToStudy.mockReturnValue(consentMutationMock({ onError }));
    mockUseResearchProgress.mockReturnValue({
      data: makeProgress(),
      isLoading: false
    });

    render(<ResearchPage />, { wrapper: createWrapper() });

    invokeParticipate();
    fireEvent.click(
      await screen.findByRole('button', { name: 'Agree to Participate' })
    );

    expect(onError).toHaveBeenCalled();
    expect(mockPush).not.toHaveBeenCalled();
  });

  it('navigates to the deep-linked study questionnaire after agreeing', async () => {
    mockSearchParams.set('id', 'study-b');
    mockUseResearchProgress.mockReturnValue({
      data: makeProgress({ studies: [makeStudyProgress(), makeStudyB()] }),
      isLoading: false
    });

    render(<ResearchPage />, { wrapper: createWrapper() });

    invokeParticipate();
    fireEvent.click(
      await screen.findByRole('button', { name: 'Agree to Participate' })
    );

    expect(mockPush).toHaveBeenCalledWith('/assessments?id=phq2');
  });

  it('retargets the consent drawer to the newly active slide', async () => {
    mockUseResearchProgress.mockReturnValue({
      data: makeProgress({ studies: [makeStudyProgress(), makeStudyB()] }),
      isLoading: false
    });

    render(<ResearchPage />, { wrapper: createWrapper() });

    fireEvent.click(screen.getByRole('button', { name: 'Go to slide 2' }));
    invokeParticipate();
    fireEvent.click(
      await screen.findByRole('button', { name: 'Agree to Participate' })
    );

    expect(mockPush).toHaveBeenCalledWith('/assessments?id=phq2');
  });

  it('routes questionnaire clicks through the consent drawer when not consented', () => {
    mockUseResearchProgress.mockReturnValue({
      data: makeProgress(),
      isLoading: false
    });

    render(<ResearchPage />, { wrapper: createWrapper() });

    fireEvent.click(screen.getByRole('button', { name: 'PHQ2' }));
    fireEvent.click(
      screen.getByRole('button', { name: 'Agree to Participate' })
    );

    expect(mockPush).toHaveBeenCalledWith('/assessments?id=phq2');
  });

  it('navigates directly from questionnaire clicks when consented', () => {
    mockUseAuth.mockReturnValue({
      state: { userInfo: { fhirId: 'PAT-1' } },
      isLoading: false
    });
    mockUseResearchProgress.mockReturnValue({
      data: makeProgress({ consentedStudyIds: ['research'] }),
      isLoading: false
    });

    render(<ResearchPage />, { wrapper: createWrapper() });

    fireEvent.click(screen.getByRole('button', { name: 'PHQ2' }));

    expect(mockPush).toHaveBeenCalledWith('/assessments?id=phq2');
    expect(
      screen.queryByRole('button', { name: 'Agree to Participate' })
    ).toBeNull();
  });

  it('does not render the how-it-works explainer anymore', () => {
    mockUseResearchProgress.mockReturnValue({
      data: makeProgress(),
      isLoading: false
    });

    render(<ResearchPage />, { wrapper: createWrapper() });

    expect(screen.queryByText('How it works')).toBeNull();
  });
});
