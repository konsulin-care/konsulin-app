/* eslint-disable max-lines */

vi.mock('@/i18n', async () => {
  const { createUseTranslationsMock } =
    await import('@/i18n/__tests__/test-messages');
  return { useTranslations: createUseTranslationsMock() };
});

import { createQueryClient } from '@/__tests__/test-utils';
import type { ParticipantHomeData } from '@/app/research/home/use-participant-home';
import { QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen } from '@testing-library/react';
import { createElement } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import ResearchPage from '../research-page';
import {
  makeProgress,
  makeStudyProgress,
  TITLE_MAP
} from './research-fixtures';

const homeState = vi.hoisted(() => ({ current: {} as unknown }));

vi.mock('../home/use-participant-home', () => ({
  useParticipantHome: () => homeState.current
}));

function createWrapper() {
  return function Wrapper({ children }: { children: React.ReactNode }) {
    return createElement(
      QueryClientProvider,
      { client: createQueryClient() },
      children
    );
  };
}

const {
  mockUseAuth,
  mockUseResearchProgress,
  mockUseConsentToStudy,
  mockUseQuestionnaireTitles,
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
    mockUseQuestionnaireTitles: vi.fn(),
    mockPush: push,
    mockReplace: replace,
    mockFabDispatch: vi.fn(),
    mockSearchParams: new URLSearchParams(),
    mockRouter: { push, replace }
  };
});

vi.mock('@/services/api/research', () => ({
  useResearchProgress: mockUseResearchProgress,
  useConsentToStudy: mockUseConsentToStudy,
  useClaimLocalConsents: vi.fn()
}));

vi.mock('@/services/api/questionnaire-info', () => ({
  useQuestionnaireTitles: mockUseQuestionnaireTitles
}));

vi.mock('@/context/auth/authContext', () => ({
  useAuth: () => mockUseAuth()
}));

vi.mock('@/hooks/useWaitingSubmissions', () => ({
  useWaitingSubmissions: () => []
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

vi.mock('@/services/api/research-counts', async importOriginal => {
  const actual =
    await importOriginal<typeof import('@/services/api/research-counts')>();
  return {
    ...actual,
    useStudyParticipantCount: () => ({ data: undefined })
  };
});

const STUDY = makeStudyProgress({
  study: {
    resourceType: 'ResearchStudy',
    id: 'research',
    status: 'active',
    title: 'Konsulin Mental Health Survey',
    sponsor: { display: 'Konsulin Research Lab' },
    principalInvestigator: { display: 'Dr. Ada' }
  }
});

/**
 * Builds the participant home data returned by the mocked hook.
 *
 * @returns The home data fixture.
 */
function makeHome(): ParticipantHomeData {
  return {
    scopedStudies: [STUDY],
    joinedIds: ['research'],
    catalogue: [STUDY],
    shelves: { konsulin: [], others: [], total: 0 },
    queue: [
      {
        questionnaireId: 'phq2',
        studies: [STUDY],
        leadStudy: STUDY,
        closesOn: '2026-08-31'
      }
    ],
    totals: { questionnairesShared: 1, minutes: 8, studies: 1 },
    statuses: new Map([['research', { status: 'needs-you' }]]),
    findings: [],
    guestBanner: null,
    titleMap: TITLE_MAP,
    isLoading: false,
    titlesPending: false,
    isError: false,
    isGuest: true,
    konsulinOrganizationId: '',
    today: '2026-08-15'
  };
}

/** Mutation mock whose mutate resolves with the given outcome. */
function consentMutationMock(
  opts: {
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
  homeState.current = makeHome();
  mockUseAuth.mockReset();
  mockUseAuth.mockReturnValue({ state: { userInfo: {} }, isLoading: false });
  mockUseConsentToStudy.mockReset();
  mockUseConsentToStudy.mockReturnValue(consentMutationMock());
  mockUseQuestionnaireTitles.mockReset();
  mockUseQuestionnaireTitles.mockReturnValue({
    data: TITLE_MAP,
    isPending: false
  });
  mockPush.mockReset();
  mockReplace.mockReset();
  mockFabDispatch.mockReset();
  mockSearchParams.delete('id');
  mockSearchParams.delete('view');
  mockSearchParams.delete('ref');
});

/** Opens the consent drawer by clicking Start on the up-next item. */
function tapStart(): void {
  fireEvent.click(screen.getByTestId('up-next-start-phq2'));
}

describe('ResearchPage consent flow', () => {
  it('opens the consent drawer from Start when not consented', async () => {
    mockUseResearchProgress.mockReturnValue({
      data: makeProgress(),
      isLoading: false
    });

    render(<ResearchPage />, { wrapper: createWrapper() });

    tapStart();

    expect(
      await screen.findByRole('button', { name: 'Agree to Participate' })
    ).toBeTruthy();
    expect(mockPush).not.toHaveBeenCalled();
  });

  it('passes the pending study profile to the consent drawer', async () => {
    mockUseResearchProgress.mockReturnValue({
      data: makeProgress({ studies: [STUDY] }),
      isLoading: false
    });

    render(<ResearchPage />, { wrapper: createWrapper() });
    tapStart();

    expect(
      await screen.findByText(
        'Konsulin Mental Health Survey is run by Konsulin Research Lab and led by Dr. Ada.'
      )
    ).toBeInTheDocument();
  });

  it('records guest consent in localStorage and navigates on agree', async () => {
    mockUseResearchProgress.mockReturnValue({
      data: makeProgress(),
      isLoading: false
    });

    render(<ResearchPage />, { wrapper: createWrapper() });

    tapStart();
    fireEvent.click(
      await screen.findByRole('button', { name: 'Agree to Participate' })
    );

    expect(mockPush).toHaveBeenCalledWith(
      '/assessments?id=phq2&study=research'
    );
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

    tapStart();

    expect(mockPush).toHaveBeenCalledWith(
      '/assessments?id=phq2&study=research'
    );
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

    tapStart();
    fireEvent.click(
      await screen.findByRole('button', { name: 'Agree to Participate' })
    );

    expect(consentMock.mutate).toHaveBeenCalledTimes(1);
    expect(mockPush).toHaveBeenCalledWith(
      '/assessments?id=phq2&study=research'
    );
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

    tapStart();
    fireEvent.click(
      await screen.findByRole('button', { name: 'Agree to Participate' })
    );

    expect(onError).toHaveBeenCalled();
    expect(mockPush).not.toHaveBeenCalled();
  });

  it('redirects a legacy deep link to the study page', () => {
    mockSearchParams.set('id', 'study-b');
    mockSearchParams.set('ref', 'p_ABC123');
    mockUseResearchProgress.mockReturnValue({
      data: makeProgress(),
      isLoading: false
    });

    render(<ResearchPage />, { wrapper: createWrapper() });

    expect(mockReplace).toHaveBeenCalledWith('/study?id=study-b&ref=p_ABC123');
  });
});
