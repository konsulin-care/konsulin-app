import AppChrome from '@/components/app-chrome';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/context/auth/authContext', () => ({
  useAuth: vi.fn()
}));

vi.mock('@/lib/submission-queue', () => ({
  pendingCount: vi.fn<() => Promise<number>>().mockResolvedValue(0),
  replayPendingSubmissions: vi.fn<() => Promise<void>>().mockResolvedValue(),
  listenForSyncReplay: vi.fn(() => vi.fn())
}));

vi.mock('@/lib/submission-replay', () => ({
  registerSubmissionReplayHandlers: vi.fn()
}));

vi.mock('@/lib/pwa-install', () => ({
  canInstall: vi.fn(() => false),
  installPwa: vi.fn(),
  setupInstallPrompt: vi.fn(() => vi.fn())
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
    });
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

  it('centers the page column to the full viewport so the drawer aligns with it', () => {
    renderWithProviders(
      <AppChrome>
        <span>test</span>
      </AppChrome>
    );

    // `main` is the mobile-first page column (mx-auto max-w-screen-sm). The
    // fixed-position drawer centers in the full viewport, while the column
    // centers in the content area (viewport minus the classic scrollbar).
    // `relative` + `left-[calc(50vw_-_50%)]` shift the column by half the
    // scrollbar width to true screen center, aligning both. The offset
    // evaluates to 0 on mobile and on overlay-scrollbar platforms.
    const main = screen.getByRole('main');
    expect(main).toHaveClass('relative');
    expect(main).toHaveClass('left-[calc(50vw_-_50%)]');
  });
});
