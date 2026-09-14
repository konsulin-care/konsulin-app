import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor } from '@testing-library/react';
import { useSearchParams } from 'next/navigation';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import ResearchForm from '../research-form';

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
            { resource: { id: 'phq2', title: 'PHQ-2', status: 'active' } }
          ]
        }
      }),
      post: vi.fn().mockResolvedValue({ data: { id: 'new-id' } })
    })
}));

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockPush, replace: mockReplace }),
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

describe('ResearchForm - URL param navigation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    // Default: no search params (empty)
    vi.mocked(useSearchParams).mockReturnValue(
      new URLSearchParams() as unknown as ReturnType<typeof useSearchParams>
    );
  });

  it('renders title page when no ?page= param', () => {
    renderWithQuery(<ResearchForm />);

    expect(screen.getByLabelText(/title/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/description/i)).toBeInTheDocument();
  });

  it('canonicalizes missing ?page to ?page=title', () => {
    renderWithQuery(<ResearchForm />);

    expect(mockReplace).toHaveBeenCalledWith('/research/register?page=title');
  });

  it('canonicalizes invalid ?page value to ?page=title', () => {
    vi.mocked(useSearchParams).mockReturnValue(
      new URLSearchParams('page=invalid') as unknown as ReturnType<
        typeof useSearchParams
      >
    );
    renderWithQuery(<ResearchForm />);

    expect(mockReplace).toHaveBeenCalledWith('/research/register?page=title');
  });

  it('does not canonicalize when ?page=title is present', () => {
    vi.mocked(useSearchParams).mockReturnValue(
      new URLSearchParams('page=title') as unknown as ReturnType<
        typeof useSearchParams
      >
    );
    renderWithQuery(<ResearchForm />);

    expect(mockReplace).not.toHaveBeenCalled();
  });

  it('renders title page when ?page=title', () => {
    vi.mocked(useSearchParams).mockReturnValue(
      new URLSearchParams('page=title') as unknown as ReturnType<
        typeof useSearchParams
      >
    );
    renderWithQuery(<ResearchForm />);

    expect(screen.getByLabelText(/title/i)).toBeInTheDocument();
  });

  it('redirects to ?page=title when ?page=batch with empty title', () => {
    vi.mocked(useSearchParams).mockReturnValue(
      new URLSearchParams('page=batch') as unknown as ReturnType<
        typeof useSearchParams
      >
    );
    renderWithQuery(<ResearchForm />);

    // Should redirect to title page
    expect(mockReplace).toHaveBeenCalledWith('/research/register?page=title');
  });

  it('shows batch configuration when ?page=batch with valid data in localStorage', () => {
    localStorage.setItem(
      'research-form-test-practitioner-id',
      JSON.stringify({
        title: 'Test Study',
        description: '',
        batches: [
          {
            startDate: '2026-01-01',
            endDate: '2026-12-31',
            questionnaireIds: ['phq2']
          }
        ],
        page: 'batch'
      })
    );
    vi.mocked(useSearchParams).mockReturnValue(
      new URLSearchParams('page=batch') as unknown as ReturnType<
        typeof useSearchParams
      >
    );
    renderWithQuery(<ResearchForm />);

    expect(screen.getByText(/batch configuration/i)).toBeInTheDocument();
  });

  it('persists page state to localStorage', async () => {
    vi.mocked(useSearchParams).mockReturnValue(
      new URLSearchParams('page=title') as unknown as ReturnType<
        typeof useSearchParams
      >
    );
    renderWithQuery(<ResearchForm />);

    await waitFor(() => {
      const stored = localStorage.getItem('research-form-test-practitioner-id');
      if (stored) {
        const data = JSON.parse(stored);
        expect(data.page).toBe('title');
      }
    });
  });
});
