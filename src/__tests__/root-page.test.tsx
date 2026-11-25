import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import type { ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { Roles } from '@/constants/roles';
import { useAuth } from '@/context/auth/authContext';
import App from '../app/page';

vi.mock('@/context/auth/authContext', () => ({
  useAuth: vi.fn()
}));

vi.mock('@/hooks/useRedirectIntent', () => ({
  useRedirectIntent: () => ({ isRedirecting: false })
}));

vi.mock('@/app/home-header', () => ({
  default: () => <div data-testid='mock-home-header'>HomeHeader</div>
}));

vi.mock('@/app/home-content', () => ({
  default: () => <div data-testid='mock-home-content'>HomeContent</div>
}));

vi.mock('@/app/research/research-page', () => ({
  default: () => <div data-testid='mock-research-page'>ResearchPage</div>
}));

/** Provides the query client required by the role-change effect. */
function Wrapper({ children }: Readonly<{ children: ReactNode }>) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } }
  });
  return (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
}

/** Mocks the auth state for the given role after loading completes. */
function mockLoadedRole(role: string) {
  vi.mocked(useAuth).mockReturnValue({
    isLoading: false,
    state: { isAuthenticated: true, userInfo: { role_name: role } },
    dispatch: vi.fn()
  } as unknown as ReturnType<typeof useAuth>);
}

describe('RootPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it.each([Roles.Patient, Roles.Guest, Roles.Researcher])(
    'renders the research page for the %s role',
    role => {
      mockLoadedRole(role);

      render(<App />, { wrapper: Wrapper });

      expect(screen.getByTestId('mock-research-page')).toBeDefined();
      expect(screen.queryByTestId('mock-home-header')).toBeNull();
      expect(screen.queryByTestId('mock-home-content')).toBeNull();
    }
  );

  it.each([Roles.Practitioner, Roles.ClinicAdmin])(
    'renders the home header and content for the %s role',
    role => {
      mockLoadedRole(role);

      render(<App />, { wrapper: Wrapper });

      expect(screen.getByTestId('mock-home-header')).toBeDefined();
      expect(screen.getByTestId('mock-home-content')).toBeDefined();
      expect(screen.queryByTestId('mock-research-page')).toBeNull();
    }
  );
});
