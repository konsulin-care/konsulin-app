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
            { resource: { id: 'phq9', title: 'PHQ-9', status: 'active' } },
            { resource: { id: 'gad7', title: 'GAD-7', status: 'active' } },
            {
              resource: { id: 'whodas', title: 'WHODAS 2.0', status: 'active' }
            }
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

describe('Batch step - availableQuestionnaires filtered by selectedIds', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  it('does not render questionnaire combobox when no questionnaires were selected', async () => {
    // Navigate directly to batch page with no prior selections.
    // selectedIds is [] in the register form (not persisted to localStorage).
    // After the fix: availableQuestionnaires is filtered by selectedIds → empty → no combobox.
    // Before the fix: availableQuestionnaires contains ALL library questionnaires → combobox appears.
    localStorage.setItem(
      'research-form-test-practitioner-id',
      JSON.stringify({
        title: 'Test Study',
        description: '',
        batches: [{ startDate: '', endDate: '', questionnaireIds: [] }],
        page: 'batch'
      })
    );
    vi.mocked(useSearchParams).mockReturnValue(
      new URLSearchParams('page=batch') as unknown as ReturnType<
        typeof useSearchParams
      >
    );

    renderWithQuery(<ResearchForm />);

    // Wait for batch page to render
    await waitFor(() => {
      expect(screen.getByText(/batch configuration/i)).toBeInTheDocument();
    });

    // Wait for library query to load (the page needs to settle)
    // We use a small delay to let the query complete
    await new Promise(resolve => setTimeout(resolve, 100));

    // After fix: no combobox (empty filtered list).
    // Before fix: combobox is present (all library items unfiltered).
    const comboboxes = screen.queryAllByRole('combobox');
    expect(comboboxes).toHaveLength(0);
  });
});
