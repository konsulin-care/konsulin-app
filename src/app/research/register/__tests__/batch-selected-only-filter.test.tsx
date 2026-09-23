import { renderWithQuery } from '@/__tests__/react-test-utils';
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
  useRouter: () => ({ push: vi.fn(), replace: vi.fn() }),
  usePathname: () => '/research/register',
  useSearchParams: vi.fn()
}));

describe('Batch step - availableQuestionnaires filtered by selectedIds', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  it('does not render questionnaire combobox when no questionnaires were selected', async () => {
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

    await waitFor(() => {
      expect(screen.getByText(/batch configuration/i)).toBeInTheDocument();
    });

    await new Promise(resolve => setTimeout(resolve, 100));

    const comboboxes = screen.queryAllByRole('combobox');
    expect(comboboxes).toHaveLength(0);
  });
});
