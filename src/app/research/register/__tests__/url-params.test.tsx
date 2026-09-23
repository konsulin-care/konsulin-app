import { renderWithQuery } from '@/app/research/__tests__/research-test-utils';
import { screen, waitFor } from '@testing-library/react';
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

describe('ResearchForm - URL param navigation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
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

    expect(vi.mocked(useSearchParams)).toHaveBeenCalled();
  });

  it('canonicalizes invalid ?page value to ?page=title', () => {
    vi.mocked(useSearchParams).mockReturnValue(
      new URLSearchParams('page=invalid') as unknown as ReturnType<
        typeof useSearchParams
      >
    );
    renderWithQuery(<ResearchForm />);

    expect(vi.mocked(useSearchParams)).toHaveBeenCalled();
  });

  it('does not canonicalize when ?page=title is present', () => {
    vi.mocked(useSearchParams).mockReturnValue(
      new URLSearchParams('page=title') as unknown as ReturnType<
        typeof useSearchParams
      >
    );
    renderWithQuery(<ResearchForm />);

    expect(vi.mocked(useSearchParams)).toHaveBeenCalled();
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

    expect(vi.mocked(useSearchParams)).toHaveBeenCalled();
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

  it('does not show questionnaire combobox when no questionnaires were selected', async () => {
    localStorage.setItem(
      'research-form-test-practitioner-id',
      JSON.stringify({
        title: 'Test Study',
        description: 'A test',
        batches: [
          {
            startDate: '2026-01-01',
            endDate: '2026-12-31',
            questionnaireIds: []
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

    await new Promise(resolve => setTimeout(resolve, 100));
    const comboboxes = screen.queryAllByRole('combobox');
    expect(comboboxes).toHaveLength(0);
  });

  it('fetches library questionnaires even when starting on title page', async () => {
    vi.mocked(useSearchParams).mockReturnValue(
      new URLSearchParams('page=title') as unknown as ReturnType<
        typeof useSearchParams
      >
    );
    renderWithQuery(<ResearchForm />);

    await waitFor(() => {
      expect(screen.getByLabelText(/title/i)).toBeInTheDocument();
    });
  });
});
