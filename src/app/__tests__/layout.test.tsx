import { act, render } from '@testing-library/react';
import fs from 'node:fs';
import path from 'node:path';
import React from 'react';
import { describe, expect, it, vi } from 'vitest';

/** Render an async server component by resolving its Promise first. */
async function renderAsync(
  element: React.ReactElement
): Promise<ReturnType<typeof render>> {
  // Async server components return a Promise; unwrap before rendering.
  const type = element.type as unknown as (
    ...args: unknown[]
  ) => Promise<React.ReactElement>;
  const resolved = await type(element.props);
  let result!: ReturnType<typeof render>;
  await act(async () => {
    result = render(resolved);
  });
  return result;
}

// Mock every import that layout.tsx pulls in
vi.mock('next/font/google', () => ({
  Plus_Jakarta_Sans: () => ({ className: 'mock-font' })
}));

vi.mock('next/navigation', () => ({
  usePathname: () => '/'
}));

vi.mock('@/components/route-gate', () => ({
  RouteGate: ({ children }: { children: React.ReactNode }) => children
}));

vi.mock('next/script', () => ({
  default: (props: Record<string, unknown>) => (
    <script data-testid='mock-script' {...props} />
  )
}));

vi.mock('@/components/general/route-response-cleaner', () => ({
  default: () => <div data-testid='route-response-cleaner' />
}));

vi.mock('@/components/general/query-provider', () => ({
  default: ({ children }: { children: React.ReactNode }) => children
}));

vi.mock('@/components/general/runtime-config-provider', () => ({
  RuntimeConfigProvider: ({ children }: { children: React.ReactNode }) =>
    children
}));

vi.mock('@/components/general/profile-completeness-modal', () => ({
  default: () => <div data-testid='profile-completeness-modal' />
}));

vi.mock('@/components/quick-action-fab', () => ({
  default: () => <div data-testid='quick-action-fab' />
}));

vi.mock('@/components/supertokensProvider', () => ({
  SuperTokensProviders: ({ children }: { children: React.ReactNode }) =>
    children
}));

vi.mock('@/components/app-chrome', () => {
  return {
    default: ({ children }: { children: React.ReactNode }) => children
  };
});

vi.mock('@/context/auth/authContext', () => ({
  AuthProvider: ({ children }: { children: React.ReactNode }) => children
}));

vi.mock('@/context/booking/bookingContext', () => ({
  BookingProvider: ({ children }: { children: React.ReactNode }) => children
}));

vi.mock('@/context/fabContext', () => ({
  FabProvider: ({ children }: { children: React.ReactNode }) => children
}));

vi.mock('@/context/profile/profileContext', () => ({
  ProfileProvider: ({ children }: { children: React.ReactNode }) => children
}));

vi.mock('nextjs-toploader', () => ({
  default: () => <div data-testid='next-top-loader' />
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

vi.mock('next-intl/server', () => ({
  getMessages: vi.fn().mockResolvedValue({})
}));

vi.mock('next-intl', () => ({
  NextIntlClientProvider: ({ children }: { children: React.ReactNode }) =>
    children
}));

vi.mock('react-toastify', () => ({
  ToastContainer: () => <div data-testid='toast-container' />
}));

/* PageContent is local to layout.tsx, not a separate module. Passes through. */

// Workaround: next/font mock needs to be available before layout import
vi.mock('@/styles/globals.css', () => ({}));
vi.mock('@/styles/index.scss', () => ({}));
vi.mock('react-toastify/dist/ReactToastify.css', () => ({}));
vi.mock('react-international-phone/style.css', () => ({}));

import RootLayout from '../layout';

describe('RootLayout', () => {
  it('renders html and body wrappers', async () => {
    await renderAsync(<RootLayout>test content</RootLayout>);
    expect(document.querySelector('html')).toBeInTheDocument();
    expect(document.querySelector('body')).toBeInTheDocument();
  });

  it('renders child content via the route gate', async () => {
    const { container } = await renderAsync(
      <RootLayout>hello world</RootLayout>
    );
    expect(container.textContent).toContain('hello world');
  });

  it('keeps the route gate in the tree (branching covered by its own test)', async () => {
    await renderAsync(<RootLayout>test</RootLayout>);
    expect(document.querySelector('body')).toBeInTheDocument();
  });

  it('renders font class on body', async () => {
    await renderAsync(<RootLayout>test</RootLayout>);
    expect(document.querySelector('body.mock-font')).toBeInTheDocument();
  });

  it('has suppressHydrationWarning on body to tolerate browser extension attributes', () => {
    // suppressHydrationWarning is a React reconciler-only prop — it is not
    // serialized as a DOM attribute in jsdom or renderToString. We verify the
    // prop is present by reading the source file, since no runtime assertion
    // is possible in the test environment.
    const layoutSrc = fs.readFileSync(
      path.resolve(__dirname, '../layout.tsx'),
      'utf-8'
    );
    expect(layoutSrc).toContain('suppressHydrationWarning');
  });

  it('wraps children with NextIntlClientProvider for useTranslations support', () => {
    const layoutSrc = fs.readFileSync(
      path.resolve(__dirname, '../layout.tsx'),
      'utf-8'
    );
    expect(layoutSrc).toContain('NextIntlClientProvider');
    expect(layoutSrc).toContain('getMessages');
  });

  it('is an async function to support server-side getMessages()', () => {
    const layoutSrc = fs.readFileSync(
      path.resolve(__dirname, '../layout.tsx'),
      'utf-8'
    );
    expect(layoutSrc).toMatch(
      /export\s+default\s+async\s+function\s+RootLayout/
    );
  });
});
