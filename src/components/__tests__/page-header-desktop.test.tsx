import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import type { Bundle } from 'fhir/r4';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import PageHeader from '../page-header';

vi.mock('@/i18n', () => ({
  useTranslations: vi.fn(() => (key: string) => {
    const translations: Record<string, string> = {
      dashboard: 'Welcome to Konsulin',
      book_session: 'Schedule a Session',
      assessment_center: 'Assessment Center',
      user_profile: 'User Profile',
      recommended: 'Recommendations for You',
      research: 'Research'
    };
    return translations[key] ?? key;
  })
}));

const { mockUseAuth, mockUseResearchProgress, mockUseUpcomingEvents } =
  vi.hoisted(() => ({
    mockUseAuth: vi.fn<
      () => {
        isLoading: boolean;
        state: {
          isAuthenticated: boolean;
          userInfo: { role_name?: string; fhirId?: string; fullname?: string };
        };
      }
    >(),
    mockUseResearchProgress: vi.fn(),
    mockUseUpcomingEvents: vi.fn<
      () => {
        appointmentData: Bundle | null;
        sessionData: Bundle | null;
      }
    >()
  }));
const mockPathname = vi.hoisted(() => ({ current: '/' }));

vi.mock('@/context/auth/authContext', () => ({
  useAuth: () => mockUseAuth()
}));

vi.mock('@/components/general/avatar', () => ({
  default: () => <div data-testid='avatar' />
}));

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), back: vi.fn() }),
  useSearchParams: () => new URLSearchParams(),
  usePathname: () => mockPathname.current
}));

vi.mock('@/hooks/useUpcomingEvents', () => ({
  useUpcomingEvents: () => mockUseUpcomingEvents()
}));

vi.mock('@/services/api/research', () => ({
  useResearchProgress: mockUseResearchProgress
}));

vi.mock('@/components/role-avatar-popup', () => ({
  default: () => <div data-testid='role-avatar' />
}));

vi.mock('@/lib/indexeddb', () => ({
  STORES: { uiPreferences: 'ui' },
  dbGet: vi.fn().mockResolvedValue(null)
}));

vi.mock('@/services/api', () => ({
  getAPI: vi.fn()
}));

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } }
  });
  return function Wrapper({ children }: { children: React.ReactNode }) {
    return (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );
  };
}

/** Mocks the auth context for the given role with a full name. */
function mockAuth(role_name: string, fhirId: string, fullname: string) {
  mockUseAuth.mockReturnValue({
    isLoading: false,
    state: {
      isAuthenticated: true,
      userInfo: { role_name, fhirId, fullname }
    }
  });
}

beforeEach(() => {
  mockPathname.current = '/';
  mockUseResearchProgress.mockReturnValue({
    data: undefined,
    isLoading: true
  });
  mockUseUpcomingEvents.mockReturnValue({
    appointmentData: null,
    sessionData: null
  });
});

describe('PageHeader desktop layout', () => {
  it('hides the auth area on md and up', () => {
    mockAuth('Patient', 'pat-1', 'Pat Smith');

    render(<PageHeader />, { wrapper: createWrapper() });

    const authArea = screen.getByTestId('role-avatar');
    expect(authArea.parentElement).toHaveClass('md:hidden');
  });

  it('renders the page indicator in an md-only element', () => {
    mockAuth('Patient', 'pat-1', 'Pat Smith');

    render(<PageHeader />, { wrapper: createWrapper() });

    const indicator = screen.getByText('Welcome to Konsulin');
    expect(indicator).toHaveClass('hidden');
    expect(indicator).toHaveClass('md:block');
  });

  it('keeps the back button visible', () => {
    mockPathname.current = '/profile';
    mockAuth('Patient', 'pat-1', 'Pat Smith');

    render(<PageHeader />, { wrapper: createWrapper() });

    expect(screen.getByLabelText('go_back')).toBeTruthy();
  });
});
