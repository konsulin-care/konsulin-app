import { renderWithQuery } from '@/__tests__/react-test-utils';
import type { ResearchStudyWithBatches } from '@/services/api/researcher';
import { screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import ManagePage from '../page';

const { mockAuth, mockStudyId, mockPush, mockDashboard } = vi.hoisted(() => ({
  mockAuth: {
    current: null as null | {
      state: { userInfo?: { fhirId?: string; role_name?: string } };
      isLoading: boolean;
    }
  },
  mockStudyId: { current: 'study-1' },
  mockPush: vi.fn(),
  mockDashboard: {
    current: { data: undefined as unknown, isLoading: false }
  }
}));

vi.mock('@/context/auth/authContext', async () => {
  const { researcherAuthMock } =
    await import('@/__tests__/mocks/research-form');
  return {
    useAuth: () => mockAuth.current ?? researcherAuthMock.useAuth()
  };
});

vi.mock('next/navigation', async () => {
  const { researchRouterMock } =
    await import('@/__tests__/mocks/research-form');
  return {
    ...researchRouterMock,
    useRouter: () => ({ push: mockPush, replace: vi.fn() }),
    useSearchParams: () => ({ get: () => mockStudyId.current })
  };
});

vi.mock('@/services/api/researcher', () => ({
  useResearcherDashboard: () => mockDashboard.current
}));

vi.mock('@/components/page-header', () => ({
  default: () => <div data-testid='page-header'>PageHeader</div>
}));

vi.mock('@/components/general/content-wraper', () => ({
  default: ({ children }: { children: React.ReactNode }) => (
    <div data-testid='content-wrapper'>{children}</div>
  )
}));

vi.mock('../manage-study-view', () => ({
  default: ({ study }: { study: ResearchStudyWithBatches }) => (
    <div data-testid='manage-study-view'>{study.study.id}</div>
  )
}));

vi.mock('@/i18n', async () => {
  const { createUseTranslationsMock } =
    await import('@/i18n/__tests__/test-messages');
  return { useTranslations: createUseTranslationsMock() };
});

/**
 * Builds a dashboard study entry with the given id.
 *
 * @param id - FHIR id of the study.
 * @returns The study entry fixture.
 */
function makeEntry(id: string): ResearchStudyWithBatches {
  return {
    study: {
      resourceType: 'ResearchStudy',
      id,
      status: 'active',
      title: 'Sleep and Mood'
    },
    batches: [],
    currentBatch: null,
    daysRemaining: 0
  };
}

/** Researcher auth state with a stable fhirId. */
const RESEARCHER_AUTH = {
  state: {
    userInfo: { fhirId: 'test-practitioner-id', role_name: 'Researcher' }
  },
  isLoading: false
};

describe('Manage Page', () => {
  beforeEach(() => {
    mockAuth.current = RESEARCHER_AUTH;
    mockStudyId.current = 'study-1';
    mockPush.mockClear();
    mockDashboard.current = {
      data: { studies: [makeEntry('study-1'), makeEntry('study-2')] },
      isLoading: false
    };
  });

  it('redirects non-researchers to the home page', async () => {
    mockAuth.current = {
      state: { userInfo: { fhirId: 'p-1', role_name: 'Patient' } },
      isLoading: false
    };

    renderWithQuery(<ManagePage />);

    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith('/');
    });
  });

  it('renders ManageStudyView for the researcher study matching the id', async () => {
    mockStudyId.current = 'study-2';

    renderWithQuery(<ManagePage />);

    const view = await screen.findByTestId('manage-study-view');
    expect(view).toHaveTextContent('study-2');
  });

  it("shows 'Study not found.' when the id matches none of the researcher's studies", async () => {
    mockStudyId.current = 'missing-study';

    renderWithQuery(<ManagePage />);

    expect(await screen.findByText('Study not found.')).toBeInTheDocument();
    expect(screen.getByText('missing-study')).toBeInTheDocument();
    expect(screen.queryByTestId('manage-study-view')).toBeNull();
  });
});
