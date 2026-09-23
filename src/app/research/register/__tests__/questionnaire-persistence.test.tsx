import { createQueryClient } from '@/__tests__/test-utils';
import { QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
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

    await waitFor(() => {
      expect(screen.getByText('PHQ-9')).toBeInTheDocument();
    });

    expect(screen.getByText('Selected (2)')).toBeInTheDocument();
    expect(screen.getByText('PHQ-9')).toBeInTheDocument();
    expect(screen.getByText('GAD-7')).toBeInTheDocument();
  });

  it('selections persist across component remount (navigation simulation)', async () => {
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
      expect(screen.getAllByText('PHQ-9').length).toBeGreaterThanOrEqual(1);
    });

    expect(screen.getByText('Selected (1)')).toBeInTheDocument();

    unmount();

    renderWithQuery(<ResearchForm />);

    await waitFor(() => {
      expect(screen.getAllByText('PHQ-9').length).toBeGreaterThanOrEqual(1);
    });

    expect(screen.getByText('Selected (1)')).toBeInTheDocument();
  });

  it('clicking items updates selection immediately (multi-select append)', async () => {
    const user = userEvent.setup();

    localStorage.setItem(
      'research-form-test-practitioner-id',
      JSON.stringify({
        ...VALID_FORM_DATA,
        title: 'Test Study',
        batches: [{ ...VALID_FORM_DATA.batches[0], questionnaireIds: [] }],
        page: 'questionnaire'
      })
    );

    vi.mocked(useSearchParams).mockReturnValue(
      new URLSearchParams('page=questionnaire') as unknown as ReturnType<
        typeof useSearchParams
      >
    );

    renderWithQuery(<ResearchForm />);

    await waitFor(() => {
      expect(
        screen.getByText('Upload Custom Questionnaire')
      ).toBeInTheDocument();
    });

    const trigger = screen.getByRole('combobox');
    await user.click(trigger);

    await waitFor(() => {
      expect(screen.getByText('PHQ-9')).toBeInTheDocument();
    });
    const phq9Item = screen.getAllByText('PHQ-9').at(-1) as HTMLElement;
    await user.click(phq9Item);

    await waitFor(() => {
      expect(screen.getByText('Selected (1)')).toBeInTheDocument();
    });
  });
});
