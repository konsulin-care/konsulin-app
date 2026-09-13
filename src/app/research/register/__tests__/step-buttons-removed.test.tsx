import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import { useSearchParams } from 'next/navigation';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import ResearchForm from '../research-form';

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
  usePathname: () => '/research/register',
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

describe('Step buttons removed', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    vi.mocked(useSearchParams).mockReturnValue(
      new URLSearchParams() as unknown as ReturnType<typeof useSearchParams>
    );
  });

  it('Step1 has no Back, Next, or Submit buttons', () => {
    renderWithQuery(<ResearchForm />);
    expect(
      screen.queryByRole('button', { name: /back/i })
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: /next/i })
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: /submit/i })
    ).not.toBeInTheDocument();
  });

  it('Step1 is not a form element', () => {
    renderWithQuery(<ResearchForm />);
    expect(screen.queryByRole('form')).not.toBeInTheDocument();
  });

  it('Step1 still renders title and description fields', () => {
    renderWithQuery(<ResearchForm />);
    expect(screen.getByLabelText(/title/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/description/i)).toBeInTheDocument();
  });

  it('Step2 has no Back or Next buttons', () => {
    // Render with ?page=questionnaire and valid title in localStorage
    localStorage.setItem(
      'research-form-test-practitioner-id',
      JSON.stringify({
        title: 'Test',
        description: '',
        batches: [],
        page: 'questionnaire'
      })
    );
    vi.mocked(useSearchParams).mockReturnValue(
      new URLSearchParams('page=questionnaire') as unknown as ReturnType<
        typeof useSearchParams
      >
    );
    renderWithQuery(<ResearchForm />);
    expect(
      screen.queryByRole('button', { name: /back/i })
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: /next/i })
    ).not.toBeInTheDocument();
  });
});
