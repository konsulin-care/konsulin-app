import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import EditPage from '../page';

vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: vi.fn()
  }),
  useSearchParams: () => ({
    get: vi.fn().mockReturnValue('study-1')
  })
}));

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

vi.mock('@/components/page-header', () => ({
  default: () => <div data-testid='page-header'>PageHeader</div>
}));

vi.mock('@/components/general/content-wraper', () => ({
  default: ({ children }: { children: React.ReactNode }) => (
    <div data-testid='content-wrapper'>{children}</div>
  )
}));

vi.mock('../research-form', () => ({
  default: () => <div data-testid='edit-research-form'>EditResearchForm</div>
}));

vi.mock('@/services/api', () => ({
  getAPI: () =>
    Promise.resolve({
      get: vi.fn().mockResolvedValue({
        data: {
          resourceType: 'ResearchStudy',
          id: 'study-1',
          title: 'Test Study',
          description: 'A test study',
          status: 'active',
          protocol: [{ reference: 'PlanDefinition/plan-1' }]
        }
      })
    })
}));

function createQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        retry: false
      }
    }
  });
}

function renderWithQuery(ui: React.ReactElement) {
  const queryClient = createQueryClient();
  return render(
    <QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>
  );
}

describe('Edit Page', () => {
  it('renders page header and edit form for researcher', async () => {
    renderWithQuery(<EditPage />);

    await screen.findByTestId('edit-research-form');

    // FAB ownership moved to form via ResearchFormFabBridge
    // Page should only render PageHeader and EditResearchForm
    expect(screen.getByTestId('page-header')).toBeInTheDocument();
    expect(screen.getByTestId('edit-research-form')).toBeInTheDocument();
  });
});
