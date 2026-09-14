import { FabProvider, useFab } from '@/context/fabContext';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import RegisterPage from '../page';

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

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn() }),
  usePathname: vi.fn().mockReturnValue('/research/register'),
  useSearchParams: vi.fn().mockReturnValue({
    get: vi.fn().mockReturnValue('title')
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

vi.mock('@/services/api', () => ({
  getAPI: () =>
    Promise.resolve({
      get: vi.fn().mockResolvedValue({ data: { entry: [] } }),
      post: vi.fn().mockResolvedValue({ data: { id: 'new-id' } })
    })
}));

/** Reads FAB action config from context. */
function FabStateReader() {
  const { state } = useFab();
  const action = state.action;
  return (
    <div>
      <span data-testid='fab-label'>{action?.label ?? 'none'}</span>
      <span data-testid='fab-disabled'>
        {String(action?.disabled ?? false)}
      </span>
    </div>
  );
}

function createQueryClient() {
  return new QueryClient({
    defaultOptions: { queries: { retry: false } }
  });
}

function renderWithFab(ui: React.ReactElement) {
  return render(
    <QueryClientProvider client={createQueryClient()}>
      <FabProvider>
        {ui}
        <FabStateReader />
      </FabProvider>
    </QueryClientProvider>
  );
}

describe('Register page FAB canAdvance', () => {
  it('shows Next button disabled by default on title page', async () => {
    renderWithFab(<RegisterPage />);

    await waitFor(() => {
      expect(screen.getByTestId('fab-label')).toHaveTextContent('Next');
    });

    expect(screen.getByTestId('fab-disabled')).toHaveTextContent('true');
  });

  it('remains disabled when only title is filled', async () => {
    const user = userEvent.setup();
    renderWithFab(<RegisterPage />);

    await waitFor(() => {
      expect(screen.getByTestId('fab-label')).toHaveTextContent('Next');
    });

    await user.type(screen.getByLabelText(/title/i), 'My Study');

    expect(screen.getByTestId('fab-disabled')).toHaveTextContent('true');
  });

  it('becomes enabled when both title and description are filled', async () => {
    const user = userEvent.setup();
    renderWithFab(<RegisterPage />);

    await waitFor(() => {
      expect(screen.getByTestId('fab-label')).toHaveTextContent('Next');
    });

    await user.type(screen.getByLabelText(/title/i), 'My Study');
    await user.type(screen.getByLabelText(/description/i), 'A description');

    expect(screen.getByTestId('fab-disabled')).toHaveTextContent('false');
  });
});
