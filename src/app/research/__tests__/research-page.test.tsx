/* eslint-disable max-lines */

vi.mock('@/i18n', async () => {
  const { createUseTranslationsMock } =
    await import('@/i18n/__tests__/test-messages');
  return { useTranslations: createUseTranslationsMock() };
});

import { wrapper } from '@/__tests__/react-test-utils';
import type { ParticipantHomeData } from '@/app/research/home/use-participant-home';
import type { FabAction } from '@/context/fabContext';
import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import ResearchPage from '../research-page';
import {
  makeProgress,
  makeResearcherDashboardData,
  makeStudyProgress,
  TITLE_MAP
} from './research-fixtures';

/** Auth hook state shape consumed by the research page. */
interface AuthState {
  state: { userInfo: { fhirId?: string; role_name?: string } };
  isLoading: boolean;
}

const homeState = vi.hoisted(() => ({ current: {} as unknown }));

vi.mock('../home/use-participant-home', () => ({
  useParticipantHome: () => homeState.current
}));

const {
  mockUseAuth,
  mockUseResearchProgress,
  mockUseConsentToStudy,
  mockUseQuestionnaireTitles,
  mockUseResearcherDashboard,
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
    mockUseResearcherDashboard: vi.fn(),
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

vi.mock('@/services/api/research-counts', async importOriginal => {
  const actual =
    await importOriginal<typeof import('@/services/api/research-counts')>();
  return {
    ...actual,
    useStudyParticipantCount: () => ({ data: undefined })
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

const STUDY = makeStudyProgress();

/**
 * Builds the participant home data returned by the mocked hook.
 *
 * @param overrides - Home data overrides.
 * @returns The home data fixture.
 */
function makeHome(
  overrides: Partial<ParticipantHomeData> = {}
): ParticipantHomeData {
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
    isGuest: false,
    konsulinOrganizationId: '',
    today: '2026-08-15',
    ...overrides
  };
}

beforeEach(() => {
  window.localStorage.clear();
  homeState.current = makeHome();
  mockUseAuth.mockReset();
  mockUseAuth.mockReturnValue({ state: { userInfo: {} }, isLoading: false });
  mockUseConsentToStudy.mockReset();
  mockUseConsentToStudy.mockReturnValue({ mutate: vi.fn() });
  mockUseQuestionnaireTitles.mockReset();
  mockUseQuestionnaireTitles.mockReturnValue({
    data: TITLE_MAP,
    isPending: false
  });
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
  it('shows a skeleton instead of the home while progress is pending', () => {
    mockUseResearchProgress.mockReturnValue({
      data: undefined,
      isLoading: true
    });
    render(<ResearchPage />, { wrapper });

    expect(screen.getByTestId('research-skeleton')).toBeTruthy();
    expect(screen.getByRole('status')).toBe(
      screen.getByTestId('research-skeleton')
    );
    expect(screen.queryByTestId('participant-home')).toBeNull();
  });

  it('renders the participant home with one h1', () => {
    mockUseResearchProgress.mockReturnValue({
      data: makeProgress(),
      isLoading: false
    });

    render(<ResearchPage />, { wrapper });

    expect(screen.getByTestId('participant-home')).toBeInTheDocument();
    expect(screen.getAllByRole('heading', { level: 1 })).toHaveLength(1);
    expect(screen.getByTestId('your-studies')).toBeInTheDocument();
    expect(screen.queryByTestId('research-carousel')).toBeNull();
  });

  it('starts the up-next lead study through participate', () => {
    mockUseAuth.mockReturnValue({
      state: { userInfo: { fhirId: 'patient-123', role_name: 'Patient' } },
      isLoading: false
    });
    mockUseResearchProgress.mockReturnValue({
      data: makeProgress({ consentedStudyIds: ['research'] }),
      isLoading: false
    });

    render(<ResearchPage />, { wrapper });
    fireEvent.click(screen.getByTestId('up-next-start-phq2'));

    expect(mockPush).toHaveBeenCalledWith(
      '/assessments?id=phq2&study=research'
    );
  });

  it('redirects a legacy id URL to the study page', () => {
    mockSearchParams.set('id', 'study-b');
    mockUseResearchProgress.mockReturnValue({
      data: makeProgress(),
      isLoading: false
    });

    render(<ResearchPage />, { wrapper });

    expect(mockReplace).toHaveBeenCalledWith('/study?id=study-b');
  });

  it('redirects a legacy view URL to the study page and keeps ref', () => {
    mockSearchParams.set('view', 'study-b');
    mockSearchParams.set('ref', 'p_ABC123');
    mockUseResearchProgress.mockReturnValue({
      data: makeProgress(),
      isLoading: false
    });

    render(<ResearchPage />, { wrapper });

    expect(mockReplace).toHaveBeenCalledWith('/study?id=study-b&ref=p_ABC123');
  });

  it('dispatches no FAB action for a patient home', () => {
    mockUseResearchProgress.mockReturnValue({
      data: makeProgress(),
      isLoading: false
    });

    render(<ResearchPage />, { wrapper });

    expect(
      dispatchedActions.filter(
        action => action.type === 'SET_ACTION' && action.config !== null
      )
    ).toHaveLength(0);
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

  it('clears the researcher FAB action on unmount', () => {
    setupResearcher();
    mockUseResearcherDashboard.mockReturnValue({
      data: { studies: [], totalParticipants: 0 },
      isLoading: false
    });

    const { unmount } = render(<ResearchPage />, { wrapper });
    unmount();

    expect(dispatchedActions.at(-1)).toEqual({
      type: 'SET_ACTION',
      config: null
    });
  });
});
