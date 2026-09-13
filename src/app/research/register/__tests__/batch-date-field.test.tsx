import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
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

const mockPush = vi.fn();
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockPush }),
  useSearchParams: () => new URLSearchParams(),
  usePathname: () => '/research/register'
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

/** Navigate through step 1 and 2 to reach batch configuration (step 3). */
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

describe('BatchDateField - date picker button', () => {
  it('renders date picker buttons instead of native date inputs', async () => {
    const user = userEvent.setup();
    await navigateToStep3(user);

    // Should have buttons with placeholder text, not date inputs
    const startDateButtons = screen.getAllByRole('button', {
      name: /select start date/i
    });
    const endDateButtons = screen.getAllByRole('button', {
      name: /select end date/i
    });
    expect(startDateButtons.length).toBeGreaterThanOrEqual(1);
    expect(endDateButtons.length).toBeGreaterThanOrEqual(1);
  });

  it('does not render native date inputs', async () => {
    const user = userEvent.setup();
    await navigateToStep3(user);

    // Native date inputs render as spinbuttons in jsdom
    const dateInputs = screen.queryAllByRole('spinbutton');
    expect(dateInputs).toHaveLength(0);
  });

  it('opens drawer with calendar when date picker button is clicked', async () => {
    const user = userEvent.setup();
    await navigateToStep3(user);

    const startDateButton = screen.getByRole('button', {
      name: /select start date/i
    });
    await user.click(startDateButton);

    await waitFor(() => {
      expect(screen.getByText('Select Date')).toBeInTheDocument();
    });
  });
});
