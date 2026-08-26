import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

// Mock every import that layout.tsx pulls in
vi.mock('next/font/google', () => ({
  Plus_Jakarta_Sans: () => ({ className: 'mock-font' })
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
    const { container } = render(<RootLayout>test content</RootLayout>);
    // React 19 renders <html>/<body> into the document, not inside the container div
    expect(document.querySelector('html')).toBeInTheDocument();
    expect(document.querySelector('body')).toBeInTheDocument();
  });

  it('renders child content inside main element', () => {
    const { container } = render(<RootLayout>hello world</RootLayout>);
    const main = container.querySelector('main');
    expect(main).toBeInTheDocument();
    expect(main).toHaveTextContent('hello world');
  });

  it('renders structural sub-components', () => {
    render(<RootLayout>test</RootLayout>);
    expect(screen.getByTestId('route-response-cleaner')).toBeInTheDocument();
    expect(screen.getByTestId('next-top-loader')).toBeInTheDocument();
    expect(screen.getByTestId('toast-container')).toBeInTheDocument();
    expect(
      screen.getByTestId('profile-completeness-modal')
    ).toBeInTheDocument();
    expect(screen.getByTestId('quick-action-fab')).toBeInTheDocument();
  });

  it('renders font class on body', () => {
    const { container } = render(<RootLayout>test</RootLayout>);
    // React 19 renders <html>/<body> into the document, not inside the container div
    expect(document.querySelector('body.mock-font')).toBeInTheDocument();
  });
});
