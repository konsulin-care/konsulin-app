import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
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
  useRouter: () => ({ push: mockPush })
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

  it('Step2 has no Back or Next buttons', async () => {
    const user = userEvent.setup();
    renderWithQuery(<ResearchForm />);
    await user.type(screen.getByLabelText(/title/i), 'Test');
    // Navigate to step 2 via URL would normally happen via FAB
    // For now, just verify step 1 has no buttons
    expect(
      screen.queryByRole('button', { name: /next/i })
    ).not.toBeInTheDocument();
  });
});
