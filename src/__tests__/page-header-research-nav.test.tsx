import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render } from '@testing-library/react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import PageHeader from '../components/page-header';

vi.mock('next/navigation', () => ({
  usePathname: vi.fn().mockReturnValue('/'),
  useSearchParams: vi.fn().mockReturnValue(new URLSearchParams()),
  useRouter: vi.fn().mockReturnValue({ push: vi.fn(), back: vi.fn() })
}));

vi.mock('@/context/auth/authContext', () => ({
  useAuth: vi.fn().mockReturnValue({
    isLoading: false,
    state: {
      isAuthenticated: true,
      userInfo: { role_name: 'Patient', fhirId: 'patient-1' }
    }
  })
}));

vi.mock('@/hooks/useUpcomingEvents', () => ({
  useUpcomingEvents: vi.fn().mockReturnValue({
    appointmentData: null,
    sessionData: null
  })
}));

vi.mock('@/lib/indexeddb', () => ({
  STORES: { uiPreferences: 'ui_preferences' },
  dbGet: vi.fn().mockResolvedValue(null)
}));

vi.mock('@/services/api', () => ({
  getAPI: vi.fn()
}));

vi.mock('@/components/general/avatar', () => ({
  default: () => <div>Avatar</div>
}));

describe('PageHeader - research form page navigation', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } }
    });
    vi.clearAllMocks();
    vi.mocked(usePathname).mockReturnValue('/research/register');
    vi.mocked(useSearchParams).mockReturnValue(
      new URLSearchParams() as unknown as ReturnType<typeof useSearchParams>
    );
  });

  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );

  function setupMockRouter() {
    const router = {
      push: vi.fn(),
      back: vi.fn(),
      forward: vi.fn(),
      refresh: vi.fn(),
      replace: vi.fn(),
      prefetch: vi.fn()
    };
    vi.mocked(useRouter).mockReturnValue(router as never);
    return router;
  }

  it('navigates from ?page=batch to ?page=questionnaire via anchor href', () => {
    setupMockRouter();
    vi.mocked(useSearchParams).mockReturnValue(
      new URLSearchParams('page=batch') as unknown as ReturnType<
        typeof useSearchParams
      >
    );

    render(<PageHeader />, { wrapper });

    const link = document.querySelector('a[aria-label="Go back"]');
    expect(link).toHaveAttribute(
      'href',
      '/research/register?page=questionnaire'
    );
  });

  it('navigates from ?page=questionnaire to ?page=title via anchor href', () => {
    setupMockRouter();
    vi.mocked(useSearchParams).mockReturnValue(
      new URLSearchParams('page=questionnaire') as unknown as ReturnType<
        typeof useSearchParams
      >
    );

    render(<PageHeader />, { wrapper });

    const link = document.querySelector('a[aria-label="Go back"]');
    expect(link).toHaveAttribute('href', '/research/register?page=title');
  });

  it('navigates from ?page=title to /research via anchor href', () => {
    setupMockRouter();
    vi.mocked(useSearchParams).mockReturnValue(
      new URLSearchParams('page=title') as unknown as ReturnType<
        typeof useSearchParams
      >
    );

    render(<PageHeader />, { wrapper });

    const link = document.querySelector('a[aria-label="Go back"]');
    expect(link).toHaveAttribute('href', '/research');
  });

  it('preserves id param in edit form via anchor href', () => {
    setupMockRouter();
    vi.mocked(usePathname).mockReturnValue('/research/edit');
    vi.mocked(useSearchParams).mockReturnValue(
      new URLSearchParams('id=study-123&page=batch') as unknown as ReturnType<
        typeof useSearchParams
      >
    );

    render(<PageHeader />, { wrapper });

    const link = document.querySelector('a[aria-label="Go back"]');
    expect(link).toHaveAttribute(
      'href',
      '/research/edit?id=study-123&page=questionnaire'
    );
  });

  // --- Semantic navigation tests ---

  it('renders an anchor with href for resolved backAction', () => {
    setupMockRouter();
    vi.mocked(useSearchParams).mockReturnValue(
      new URLSearchParams('page=title') as unknown as ReturnType<
        typeof useSearchParams
      >
    );

    render(<PageHeader />, { wrapper });

    const link = document.querySelector('a[aria-label="Go back"]');
    expect(link).not.toBeNull();
    expect(link).toHaveAttribute('href', '/research');
  });

  it('renders anchor targeting questionnaire when batch', () => {
    setupMockRouter();
    vi.mocked(useSearchParams).mockReturnValue(
      new URLSearchParams('page=batch') as unknown as ReturnType<
        typeof useSearchParams
      >
    );

    render(<PageHeader />, { wrapper });

    const link = document.querySelector('a[aria-label="Go back"]');
    expect(link).toHaveAttribute(
      'href',
      '/research/register?page=questionnaire'
    );
  });

  it('renders anchor targeting title when questionnaire', () => {
    setupMockRouter();
    vi.mocked(useSearchParams).mockReturnValue(
      new URLSearchParams('page=questionnaire') as unknown as ReturnType<
        typeof useSearchParams
      >
    );

    render(<PageHeader />, { wrapper });

    const link = document.querySelector('a[aria-label="Go back"]');
    expect(link).toHaveAttribute('href', '/research/register?page=title');
  });

  it('renders anchor preserving id for edit batch step', () => {
    setupMockRouter();
    vi.mocked(usePathname).mockReturnValue('/research/edit');
    vi.mocked(useSearchParams).mockReturnValue(
      new URLSearchParams('id=study-123&page=batch') as unknown as ReturnType<
        typeof useSearchParams
      >
    );

    render(<PageHeader />, { wrapper });

    const link = document.querySelector('a[aria-label="Go back"]');
    expect(link).toHaveAttribute(
      'href',
      '/research/edit?id=study-123&page=questionnaire'
    );
  });

  it('renders anchor preserving id for edit questionnaire step', () => {
    setupMockRouter();
    vi.mocked(usePathname).mockReturnValue('/research/edit');
    vi.mocked(useSearchParams).mockReturnValue(
      new URLSearchParams(
        'id=study-456&page=questionnaire'
      ) as unknown as ReturnType<typeof useSearchParams>
    );

    render(<PageHeader />, { wrapper });

    const link = document.querySelector('a[aria-label="Go back"]');
    expect(link).toHaveAttribute(
      'href',
      '/research/edit?id=study-456&page=title'
    );
  });

  it('falls back to router.back button for unknown routes', () => {
    const router = setupMockRouter();
    vi.mocked(usePathname).mockReturnValue('/some-unknown-page');

    render(<PageHeader />, { wrapper });

    // No anchor should exist for unknown routes
    const link = document.querySelector('a[aria-label="Go back"]');
    expect(link).toBeNull();

    // Button should exist and call router.back
    const button = document.querySelector('button[aria-label="Go back"]');
    expect(button).not.toBeNull();
    fireEvent.click(button!);
    expect(router.back).toHaveBeenCalledTimes(1);
  });

  it('chevron icon is hidden from assistive technology', () => {
    setupMockRouter();
    vi.mocked(useSearchParams).mockReturnValue(
      new URLSearchParams('page=title') as unknown as ReturnType<
        typeof useSearchParams
      >
    );

    render(<PageHeader />, { wrapper });

    const icon = document.querySelector('.lucide-chevron-left');
    expect(icon).toHaveAttribute('aria-hidden', 'true');
  });
});
