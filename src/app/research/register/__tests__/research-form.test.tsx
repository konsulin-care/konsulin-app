import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import ResearchForm from '../research-form';

afterEach(() => {
  localStorage.clear();
});

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

const mockGet = vi.fn().mockResolvedValue({
  data: {
    entry: [
      { resource: { id: 'phq2', title: 'PHQ-2', status: 'active' } },
      { resource: { id: 'gad7', title: 'GAD-7', status: 'active' } }
    ]
  }
});
const mockPost = vi.fn().mockResolvedValue({ data: { id: 'new-id' } });
vi.mock('@/services/api', () => ({
  getAPI: () =>
    Promise.resolve({
      get: mockGet,
      post: mockPost
    })
}));

const mockPush = vi.fn();
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockPush })
}));

function createQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: { retry: false }
    }
  });
}

function renderWithQuery(ui: React.ReactElement) {
  const queryClient = createQueryClient();
  return render(
    <QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>
  );
}

async function navigateToStep3(user: ReturnType<typeof userEvent.setup>) {
  renderWithQuery(<ResearchForm />);
  await user.type(screen.getByLabelText(/title/i), 'My Research Study');
  await user.click(screen.getByRole('button', { name: /next/i }));
  await waitFor(() => {
    expect(screen.getByText(/from library/i)).toBeInTheDocument();
  });
  await user.click(screen.getByText(/from library/i));
  await waitFor(() => {
    expect(screen.getByRole('combobox')).toBeInTheDocument();
  });
  await user.click(screen.getByRole('combobox'));
  await waitFor(() => {
    expect(screen.getByText('PHQ-2')).toBeInTheDocument();
  });
  await user.click(screen.getByText('PHQ-2'));
  await user.click(screen.getByRole('button', { name: /next/i }));
  await waitFor(() => {
    expect(screen.getByText(/batch configuration/i)).toBeInTheDocument();
  });
}

/** Pre-fill localStorage with valid batch data and render directly to step 3. */
function renderWithPrefilledData() {
  localStorage.setItem(
    'research-form-test-practitioner-id',
    JSON.stringify({
      title: 'My Research Study',
      description: '',
      batches: [
        {
          startDate: '2026-01-01',
          endDate: '2026-12-31',
          questionnaireIds: ['phq2']
        }
      ],
      step: 3
    })
  );
  renderWithQuery(<ResearchForm />);
}

describe('ResearchForm - Basic Steps', () => {
  it('renders title input, description textarea, and next button', () => {
    renderWithQuery(<ResearchForm />);

    expect(screen.getByLabelText(/title/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/description/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /next/i })).toBeInTheDocument();
  });

  it('shows validation error when title is empty and next is clicked', async () => {
    const user = userEvent.setup();
    renderWithQuery(<ResearchForm />);

    await user.click(screen.getByRole('button', { name: /next/i }));

    await waitFor(() => {
      expect(screen.getByText('Title is required')).toBeInTheDocument();
    });
  });

  it('advances to step 2 when title is provided', async () => {
    const user = userEvent.setup();
    renderWithQuery(<ResearchForm />);

    await user.type(screen.getByLabelText(/title/i), 'My Research Study');
    await user.type(screen.getByLabelText(/description/i), 'A test study');
    await user.click(screen.getByRole('button', { name: /next/i }));

    await waitFor(() => {
      expect(screen.getByText(/questionnaire selection/i)).toBeInTheDocument();
    });
  });

  it('shows accordion with From Library and Upload Custom sections on step 2', async () => {
    const user = userEvent.setup();
    renderWithQuery(<ResearchForm />);

    await user.type(screen.getByLabelText(/title/i), 'My Research Study');
    await user.click(screen.getByRole('button', { name: /next/i }));

    await waitFor(() => {
      expect(screen.getByText(/from library/i)).toBeInTheDocument();
      expect(screen.getByText(/upload custom/i)).toBeInTheDocument();
    });
  });

  it('has combobox in library section for questionnaire selection', async () => {
    const user = userEvent.setup();
    renderWithQuery(<ResearchForm />);

    await user.type(screen.getByLabelText(/title/i), 'My Research Study');
    await user.click(screen.getByRole('button', { name: /next/i }));

    await waitFor(() => {
      expect(screen.getByText(/from library/i)).toBeInTheDocument();
    });

    await user.click(screen.getByText(/from library/i));

    await waitFor(() => {
      const combobox = screen.getByRole('combobox');
      expect(combobox).toBeInTheDocument();
      expect(combobox).toHaveTextContent(/select questionnaires/i);
    });
  });
});

describe('ResearchForm - Batch Configuration', () => {
  it('renders batch configuration step with add batch button', async () => {
    const user = userEvent.setup();
    await navigateToStep3(user);
    expect(screen.getByText(/batch configuration/i)).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: /add batch/i })
    ).toBeInTheDocument();
  });

  it('renders one batch by default with date picker buttons', async () => {
    const user = userEvent.setup();
    await navigateToStep3(user);
    // DatePickerButton renders buttons with placeholder text
    expect(
      screen.getByRole('button', { name: /select start date/i })
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: /select end date/i })
    ).toBeInTheDocument();
  });

  it('can add a new batch', async () => {
    const user = userEvent.setup();
    await navigateToStep3(user);
    await user.click(screen.getByRole('button', { name: /add batch/i }));
    const startDates = screen.getAllByRole('button', {
      name: /select start date/i
    });
    expect(startDates).toHaveLength(2);
  });

  it('can remove a batch except the first one', async () => {
    const user = userEvent.setup();
    await navigateToStep3(user);
    await user.click(screen.getByRole('button', { name: /add batch/i }));
    const removeButtons = screen.getAllByRole('button', { name: /remove/i });
    expect(removeButtons).toHaveLength(1);
    await user.click(removeButtons[0]);
    const startDates = screen.getAllByRole('button', {
      name: /select start date/i
    });
    expect(startDates).toHaveLength(1);
  });

  it('first batch does not have remove button', async () => {
    const user = userEvent.setup();
    await navigateToStep3(user);
    expect(
      screen.queryByRole('button', { name: /remove/i })
    ).not.toBeInTheDocument();
  });

  it('persists form data to localStorage', async () => {
    const user = userEvent.setup();
    renderWithQuery(<ResearchForm />);
    await user.type(screen.getByLabelText(/title/i), 'Persisted Study');
    await waitFor(() => {
      const stored = localStorage.getItem('research-form-test-practitioner-id');
      expect(stored).toBeTruthy();
    });
  });

  it('restores form data from localStorage on mount', async () => {
    localStorage.setItem(
      'research-form-test-practitioner-id',
      JSON.stringify({ title: 'Restored Study', description: '', step: 1 })
    );
    renderWithQuery(<ResearchForm />);
    await waitFor(() => {
      expect(screen.getByLabelText(/title/i)).toHaveValue('Restored Study');
    });
  });

  it('clears localStorage after successful submission', async () => {
    const user = userEvent.setup();
    renderWithPrefilledData();
    await waitFor(() => {
      expect(screen.getByText(/batch configuration/i)).toBeInTheDocument();
    });
    await user.click(screen.getByRole('button', { name: /submit/i }));
    await waitFor(() => {
      expect(
        localStorage.getItem('research-form-test-practitioner-id')
      ).toBeNull();
    });
  });
});

describe('ResearchForm - Submission', () => {
  it('creates PlanDefinition and ResearchStudy on submit', async () => {
    const user = userEvent.setup();
    renderWithPrefilledData();
    await waitFor(() => {
      expect(screen.getByText(/batch configuration/i)).toBeInTheDocument();
    });
    await user.click(screen.getByRole('button', { name: /submit/i }));
    await waitFor(() => {
      expect(mockPost).toHaveBeenCalled();
    });
  });

  it('navigates to / on successful submission', async () => {
    const user = userEvent.setup();
    renderWithPrefilledData();
    await waitFor(() => {
      expect(screen.getByText(/batch configuration/i)).toBeInTheDocument();
    });
    await user.click(screen.getByRole('button', { name: /submit/i }));
    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith('/');
    });
  });
});
