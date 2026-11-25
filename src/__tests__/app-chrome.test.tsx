import AppChrome from '@/components/app-chrome';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import { createElement, useEffect } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/i18n', () => ({
  useTranslations: vi.fn(() => (key: string) => key)
}));

vi.mock('@/context/auth/authContext', () => ({
  useAuth: vi.fn()
}));

vi.mock('@/lib/submission-queue', () => ({
  pendingCount: vi.fn<() => Promise<number>>().mockResolvedValue(0),
  listOwnedSubmissions: vi.fn<() => Promise<unknown[]>>().mockResolvedValue([]),
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

vi.mock('@/components/app-sidebar', () => ({
  default: ({ className }: { className?: string }) =>
    createElement('nav', {
      'aria-label': 'Main navigation',
      'data-testid': 'app-sidebar',
      className
    })
}));

import { useAuth } from '@/context/auth/authContext';
import { useFab } from '@/context/fabContext';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';

/** Seeds the FAB with an action so the content action bar becomes visible. */
function ActionSeeder() {
  const { dispatch } = useFab();

  useEffect(() => {
    dispatch({
      type: 'SET_ACTION',
      config: { label: 'Save', onAction: vi.fn() }
    });
  }, [dispatch]);

  return <p data-testid='child'>Hello</p>;
}

function renderWithProviders(ui: React.ReactElement) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(<QueryClientProvider client={qc}>{ui}</QueryClientProvider>);
}

/**
 * Collects tabbable elements in document order.
 *
 * @param root - Element or document to search
 * @returns Tabbable elements (tabIndex is not negative)
 */
function getTabbableElements(root: HTMLElement | Document): HTMLElement[] {
  const selector =
    'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]';
  return Array.from(root.querySelectorAll<HTMLElement>(selector)).filter(
    element => element.tabIndex >= 0
  );
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
      refresh: vi.fn(),
      bfcacheId: '0'
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

  it('orders the skip link before the navigation landmark and the main element', () => {
    renderWithProviders(
      <AppChrome>
        <span>test</span>
      </AppChrome>
    );

    const skipLink = screen.getByRole('link', { name: 'skip_to_content' });
    expect(skipLink).toHaveAttribute('href', '#main');

    const tabbables = getTabbableElements(document);
    expect(tabbables[0]).toBe(skipLink);

    const navigation = screen.getByRole('navigation');
    const main = screen.getByRole('main');
    expect(main).toHaveAttribute('id', 'main');
    expect(main).toHaveAttribute('tabindex', '-1');

    expect(
      skipLink.compareDocumentPosition(navigation) &
        Node.DOCUMENT_POSITION_FOLLOWING
    ).toBeTruthy();
    expect(
      navigation.compareDocumentPosition(main) &
        Node.DOCUMENT_POSITION_FOLLOWING
    ).toBeTruthy();
  });

  it('renders the md/lg grid shell wrapper and keeps the narrow page column', () => {
    renderWithProviders(
      <AppChrome>
        <span>test</span>
      </AppChrome>
    );

    const sidebar = screen.getByTestId('app-sidebar');
    const shell = sidebar.parentElement;
    expect(shell).not.toBeNull();
    expect(shell).toHaveAttribute('data-shell', 'nav');
    expect(shell).toHaveClass('md:grid');
    expect(shell).toHaveClass('md:grid-cols-[72px_minmax(0,1fr)]');
    expect(shell).toHaveClass('lg:grid-cols-[240px_minmax(0,1fr)]');

    const main = screen.getByRole('main');
    expect(main).toHaveClass('max-w-screen-sm');
    expect(main).toHaveClass('left-[calc(50vw_-_50%)]');
    expect(main).toHaveClass('md:left-0');
    expect(main).toHaveClass('md:shadow-none');
    expect(main).toHaveClass('md:border-x');
    expect(main).toHaveClass('md:border-border');
  });

  it('renders no navigation and no shell attribute on bare routes', () => {
    vi.mocked(usePathname).mockReturnValue('/auth');

    const { container } = renderWithProviders(
      <AppChrome>
        <span>test</span>
      </AppChrome>
    );

    expect(screen.queryByRole('navigation')).toBeNull();
    expect(container.querySelector('[data-shell]')).toBeNull();
    expect(screen.getByRole('main')).toHaveAttribute('id', 'main');
  });

  it('renders the content action bar inside main after the page content', () => {
    renderWithProviders(
      <AppChrome>
        <ActionSeeder />
      </AppChrome>
    );

    const main = screen.getByRole('main');
    const child = screen.getByTestId('child');
    const bar = main.querySelector('[data-slot="content-action-bar"]');

    expect(bar).not.toBeNull();
    expect(bar).toHaveAttribute('role', 'region');
    expect(
      child.compareDocumentPosition(bar as Node) &
        Node.DOCUMENT_POSITION_FOLLOWING
    ).toBeTruthy();
  });

  it('does not render a sidebar primary-action slot', () => {
    const { container } = renderWithProviders(
      <AppChrome>
        <span>test</span>
      </AppChrome>
    );

    expect(container.querySelector('[data-slot="primary-action"]')).toBeNull();
  });
});
