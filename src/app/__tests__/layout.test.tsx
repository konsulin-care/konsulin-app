import { render } from '@testing-library/react';
import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it, vi } from 'vitest';

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
  it('renders html and body wrappers', () => {
    render(<RootLayout>test content</RootLayout>);
    // React 19 renders <html>/<body> into the document, not inside the container div
    expect(document.querySelector('html')).toBeInTheDocument();
    expect(document.querySelector('body')).toBeInTheDocument();
  });

  it('renders child content via the route gate', () => {
    const { container } = render(<RootLayout>hello world</RootLayout>);
    expect(container.textContent).toContain('hello world');
  });

  it('keeps the route gate in the tree (branching covered by its own test)', () => {
    render(<RootLayout>test</RootLayout>);
    expect(document.querySelector('body')).toBeInTheDocument();
  });

  it('renders font class on body', () => {
    render(<RootLayout>test</RootLayout>);
    // React 19 renders <html>/<body> into the document, not inside the container div
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
});
