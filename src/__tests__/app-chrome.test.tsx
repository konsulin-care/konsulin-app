import AppChrome from '@/components/app-chrome';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/context/auth/authContext', () => ({
  useAuth: vi.fn()
}));

vi.mock('next/navigation', () => ({
  useRouter: vi.fn(),
  usePathname: vi.fn(),
  useSearchParams: vi.fn()
}));

import { useAuth } from '@/context/auth/authContext';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';

function renderWithProviders(ui: React.ReactElement) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(<QueryClientProvider client={qc}>{ui}</QueryClientProvider>);
}

describe('AppChrome', () => {
  beforeEach(() => {
    vi.mocked(useAuth).mockReturnValue({
      isLoading: false,
      dispatch: vi.fn(),
      state: {
        isAuthenticated: false,
        userInfo: {}
      }
    });
    vi.mocked(useRouter).mockReturnValue({
      push: vi.fn(),
      replace: vi.fn(),
      prefetch: vi.fn(),
      back: vi.fn(),
      forward: vi.fn(),
      refresh: vi.fn()
    } as unknown as ReturnType<typeof useRouter>);
    vi.mocked(usePathname).mockReturnValue('/');
    vi.mocked(useSearchParams).mockReturnValue(
      new URLSearchParams() as unknown as ReturnType<typeof useSearchParams>
    );
  });

  it('renders children inside the layout', () => {
    renderWithProviders(
      <AppChrome>
        <p data-testid='child'>Hello</p>
      </AppChrome>
    );

    expect(screen.getByTestId('child')).toHaveTextContent('Hello');
  });

  it('renders without crashing', () => {
    expect(() =>
      renderWithProviders(
        <AppChrome>
          <span>test</span>
        </AppChrome>
      )
    ).not.toThrow();
  });
});
