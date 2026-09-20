import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor } from '@testing-library/react';
import type { PlanDefinition, ResearchStudy } from 'fhir/r4';
import { useSearchParams } from 'next/navigation';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import EditResearchForm from '../research-form';
import { submitEditStudy } from '../submit-helpers';

const mockPush = vi.fn();
const mockReplace = vi.fn();

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
            { resource: { id: 'phq9', title: 'PHQ-9', status: 'active' } },
            { resource: { id: 'gad7', title: 'GAD-7', status: 'active' } }
          ]
        }
      }),
      post: vi.fn().mockResolvedValue({ data: { id: 'new-id' } })
    })
}));

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockPush, replace: mockReplace }),
  usePathname: () => '/research/edit',
  useSearchParams: vi.fn()
}));

function createQueryClient() {
  return new QueryClient({
    defaultOptions: { queries: { retry: false } }
  });
}

function renderWithQuery(ui: React.ReactElement) {
  return render(
    <QueryClientProvider client={createQueryClient()}>{ui}</QueryClientProvider>
  );
}

const mockStudy: ResearchStudy = {
  resourceType: 'ResearchStudy',
  id: 'study-1',
  title: 'Test Study',
  description: 'A test study',
  status: 'active',
  principalInvestigator: { reference: 'Practitioner/test-practitioner-id' },
  protocol: [{ reference: 'PlanDefinition/plan-1' }]
};

const mockPlanDefinitions: PlanDefinition[] = [
  {
    resourceType: 'PlanDefinition',
    id: 'plan-1',
    title: 'Batch 1',
    status: 'active',
    effectivePeriod: { start: '2026-01-01', end: '2026-12-31' },
    action: [
      { definitionCanonical: 'Questionnaire/phq9' },
      { definitionCanonical: 'Questionnaire/gad7' }
    ]
  }
];

describe('Edit form - questionnaire persistence', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    vi.mocked(useSearchParams).mockReturnValue(
      new URLSearchParams(
        'id=study-1&page=questionnaire'
      ) as unknown as ReturnType<typeof useSearchParams>
    );
  });

  it('selectedIds derives from existing plan definitions on initial load', async () => {
    renderWithQuery(
      <EditResearchForm
        study={mockStudy}
        planDefinitions={mockPlanDefinitions}
      />
    );

    // Wait for component to render
    await waitFor(() => {
      // PHQ-9 appears in both combobox and chip
      expect(screen.getAllByText('PHQ-9').length).toBeGreaterThanOrEqual(1);
    });

    // The selected items from existing plan should be visible
    // This would fail with old code if selectedIds wasn't derived from form state
    expect(screen.getByText('Selected (2)')).toBeInTheDocument();
    expect(screen.getAllByText('PHQ-9').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('GAD-7').length).toBeGreaterThanOrEqual(1);
  });

  it('invalidates researcher-dashboard cache after successful submission', async () => {
    const mockInvalidateQueries = vi.fn().mockResolvedValue(undefined);
    const mockQueryClient = {
      invalidateQueries: mockInvalidateQueries
    } as unknown as import('@tanstack/react-query').QueryClient;

    const mockFormData = {
      title: 'Updated Study',
      description: 'Updated description',
      batches: [
        {
          startDate: '2026-01-01',
          endDate: '2026-12-31',
          questionnaireIds: ['phq9', 'gad7']
        }
      ]
    };

    await submitEditStudy({
      study: mockStudy,
      planIds: ['plan-1'],
      lockedBatchIndices: [],
      planDefinitions: mockPlanDefinitions,
      data: mockFormData,
      router: { push: mockPush, replace: mockReplace } as unknown as ReturnType<
        typeof import('next/navigation').useRouter
      >,
      queryClient: mockQueryClient
    });

    // Verify cache was invalidated
    expect(mockInvalidateQueries).toHaveBeenCalledWith({
      queryKey: ['researcher-dashboard']
    });
    // Verify navigation happened
    expect(mockPush).toHaveBeenCalledWith('/research');
  });
});
