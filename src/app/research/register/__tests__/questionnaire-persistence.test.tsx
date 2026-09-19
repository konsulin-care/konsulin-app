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
            { resource: { id: 'gad7', title: 'GAD-7', status: 'active' } }
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

const VALID_FORM_DATA = {
  title: 'Test Study',
  description: 'A test study',
  batches: [
    {
      startDate: '',
      endDate: '',
      questionnaireIds: [] as string[]
    }
  ]
};

describe('Questionnaire persistence - dual state bug', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  it('selectedIds derives from batches[].questionnaireIds on initial load', async () => {
    // Pre-populate localStorage with form data that has selected questionnaires
    localStorage.setItem(
      'research-form-test-practitioner-id',
      JSON.stringify({
        ...VALID_FORM_DATA,
        batches: [
          { ...VALID_FORM_DATA.batches[0], questionnaireIds: ['phq9', 'gad7'] }
        ],
        page: 'questionnaire'
      })
    );

    vi.mocked(useSearchParams).mockReturnValue(
      new URLSearchParams('page=questionnaire') as unknown as ReturnType<
        typeof useSearchParams
      >
    );

    renderWithQuery(<ResearchForm />);

    // Wait for library questionnaires to load and component to render
    await waitFor(() => {
      expect(screen.getByText('PHQ-9')).toBeInTheDocument();
    });

    // The selected items should be visible
    // This fails with old code because selectedIds is initialized as []
    // instead of being derived from batches[0].questionnaireIds
    expect(screen.getByText('Selected (2)')).toBeInTheDocument();
    expect(screen.getByText('PHQ-9')).toBeInTheDocument();
    expect(screen.getByText('GAD-7')).toBeInTheDocument();
  });

  it('selections persist across component remount (navigation simulation)', async () => {
    // First visit: populate localStorage with selections
    localStorage.setItem(
      'research-form-test-practitioner-id',
      JSON.stringify({
        ...VALID_FORM_DATA,
        batches: [
          { ...VALID_FORM_DATA.batches[0], questionnaireIds: ['phq9'] }
        ],
        page: 'questionnaire'
      })
    );

    vi.mocked(useSearchParams).mockReturnValue(
      new URLSearchParams('page=questionnaire') as unknown as ReturnType<
        typeof useSearchParams
      >
    );

    const { unmount } = renderWithQuery(<ResearchForm />);

    await waitFor(() => {
      // PHQ-9 appears in both combobox and chip
      expect(screen.getAllByText('PHQ-9').length).toBeGreaterThanOrEqual(1);
    });

    // Verify selection is present
    expect(screen.getByText('Selected (1)')).toBeInTheDocument();

    // Simulate navigation: unmount and remount (same component, same localStorage)
    unmount();

    // Second visit: same localStorage data
    renderWithQuery(<ResearchForm />);

    await waitFor(() => {
      // PHQ-9 appears in both combobox and chip
      expect(screen.getAllByText('PHQ-9').length).toBeGreaterThanOrEqual(1);
    });

    // Selections should still be present after remount
    // This fails with old code because selectedIds is reset to []
    expect(screen.getByText('Selected (1)')).toBeInTheDocument();
  });
});
