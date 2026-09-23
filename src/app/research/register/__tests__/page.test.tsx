import { createQueryClient } from '@/__tests__/test-utils';
import { QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import RegisterPage from '../page';

vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: vi.fn()
  }),
  useSearchParams: () => ({
    get: vi.fn()
  })
}));

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

vi.mock('@/components/page-header', () => ({
  default: () => <div data-testid='page-header'>PageHeader</div>
}));

vi.mock('@/components/general/content-wraper', () => ({
  default: ({ children }: { children: React.ReactNode }) => (
    <div data-testid='content-wrapper'>{children}</div>
  )
}));

vi.mock('../research-form', () => ({
  default: () => <div data-testid='research-form'>ResearchForm</div>
}));

function renderWithQuery(ui: React.ReactElement) {
  return render(
    <QueryClientProvider client={createQueryClient()}>{ui}</QueryClientProvider>
  );
}

describe('Register Page', () => {
  it('renders the registration form for researcher role', () => {
    renderWithQuery(<RegisterPage />);

    expect(screen.getByTestId('page-header')).toBeInTheDocument();
    expect(screen.getByTestId('research-form')).toBeInTheDocument();
  });

  it('does not call useResearchFabAction at page level (moved to form)', () => {
    renderWithQuery(<RegisterPage />);

    expect(screen.getByTestId('page-header')).toBeInTheDocument();
    expect(screen.getByTestId('research-form')).toBeInTheDocument();
  });
});
