import { renderWithQuery } from '@/__tests__/react-test-utils';
import { screen } from '@testing-library/react';
import type { PlanDefinition, ResearchStudy } from 'fhir/r4';
import { useSearchParams } from 'next/navigation';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import EditResearchForm from '../research-form';

vi.mock('@/context/auth/authContext', () => ({
  useAuth: () => ({
    state: {
      userInfo: {
        fhirId: 'test-practitioner-id',
        role_name: 'Researcher'
      }
    },
    isLoading: false
  })
}));

vi.mock('@/services/api', () => ({
  getAPI: () =>
    Promise.resolve({
      get: vi.fn().mockResolvedValue({
        data: {
          entry: [
            { resource: { id: 'phq2', title: 'PHQ-2', status: 'active' } }
          ]
        }
      }),
      post: vi.fn().mockResolvedValue({ data: { id: 'new-id' } })
    })
}));

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn() }),
  usePathname: () => '/research/edit',
  useSearchParams: vi.fn()
}));

const mockStudy: ResearchStudy = {
  resourceType: 'ResearchStudy',
  id: 'study-1',
  title: 'Test Study',
  description: 'A test study',
  status: 'active',
  protocol: [{ reference: 'PlanDefinition/plan-1' }]
};

const mockPlanWithQs: PlanDefinition = {
  resourceType: 'PlanDefinition',
  id: 'plan-1',
  title: 'Batch 1',
  status: 'active',
  effectivePeriod: { start: '2026-01-01', end: '2026-12-31' },
  action: [
    { definitionCanonical: 'Questionnaire/phq2' },
    { definitionCanonical: 'Questionnaire/gad7' }
  ]
};

describe('EditResearchForm - URL param navigation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    vi.mocked(useSearchParams).mockReturnValue(
      new URLSearchParams() as unknown as ReturnType<typeof useSearchParams>
    );
  });

  it('deep-link guard preserves id when redirecting to title page', () => {
    vi.mocked(useSearchParams).mockReturnValue(
      new URLSearchParams('id=study-1&page=batch') as unknown as ReturnType<
        typeof useSearchParams
      >
    );

    const emptyStudy: ResearchStudy = {
      ...mockStudy,
      title: ''
    };

    renderWithQuery(
      <EditResearchForm study={emptyStudy} planDefinitions={[]} />
    );

    expect(vi.mocked(useSearchParams)).toHaveBeenCalled();
  });

  it('renders title page when no ?page= param', () => {
    renderWithQuery(
      <EditResearchForm study={mockStudy} planDefinitions={[mockPlanWithQs]} />
    );

    expect(screen.getByLabelText(/title/i)).toBeInTheDocument();
  });

  it('canonicalizes missing ?page to ?page=title preserving id', () => {
    vi.mocked(useSearchParams).mockReturnValue(
      new URLSearchParams('id=study-1') as unknown as ReturnType<
        typeof useSearchParams
      >
    );
    renderWithQuery(
      <EditResearchForm study={mockStudy} planDefinitions={[mockPlanWithQs]} />
    );

    expect(vi.mocked(useSearchParams)).toHaveBeenCalled();
  });

  it('canonicalizes invalid ?page value preserving id', () => {
    vi.mocked(useSearchParams).mockReturnValue(
      new URLSearchParams('id=study-1&page=garbage') as unknown as ReturnType<
        typeof useSearchParams
      >
    );
    renderWithQuery(
      <EditResearchForm study={mockStudy} planDefinitions={[mockPlanWithQs]} />
    );

    expect(vi.mocked(useSearchParams)).toHaveBeenCalled();
  });

  it('does not canonicalize when ?page=title is present', () => {
    vi.mocked(useSearchParams).mockReturnValue(
      new URLSearchParams('id=study-1&page=title') as unknown as ReturnType<
        typeof useSearchParams
      >
    );
    renderWithQuery(
      <EditResearchForm study={mockStudy} planDefinitions={[mockPlanWithQs]} />
    );

    expect(vi.mocked(useSearchParams)).toHaveBeenCalled();
  });

  it('pre-selects questionnaires from existing batches', () => {
    vi.mocked(useSearchParams).mockReturnValue(
      new URLSearchParams('page=questionnaire') as unknown as ReturnType<
        typeof useSearchParams
      >
    );
    renderWithQuery(
      <EditResearchForm study={mockStudy} planDefinitions={[mockPlanWithQs]} />
    );

    expect(screen.getByText('Selected (2)')).toBeInTheDocument();
  });

  it('redirects to ?page=title when ?page=batch with empty title', () => {
    vi.mocked(useSearchParams).mockReturnValue(
      new URLSearchParams('page=batch') as unknown as ReturnType<
        typeof useSearchParams
      >
    );

    const emptyStudy: ResearchStudy = {
      ...mockStudy,
      title: ''
    };

    renderWithQuery(
      <EditResearchForm study={emptyStudy} planDefinitions={[]} />
    );

    expect(vi.mocked(useSearchParams)).toHaveBeenCalled();
  });
});
