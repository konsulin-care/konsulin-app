import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import PageHeader from '../page-header';

vi.mock('@/i18n', () => ({
  useTranslations: vi.fn(() => (key: string) => {
    const translations: Record<string, string> = {
      go_back: 'Go back',
      study_title: 'Study',
      studies_title: 'All studies'
    };
    return translations[key] ?? key;
  })
}));

const route = vi.hoisted(() => ({ path: '/', query: '' }));

vi.mock('@/context/auth/authContext', () => ({
  useAuth: () => ({
    isLoading: false,
    state: {
      isAuthenticated: true,
      userInfo: { role_name: 'Patient', fullname: 'Pat' }
    }
  })
}));

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), back: vi.fn() }),
  useSearchParams: () => new URLSearchParams(route.query),
  usePathname: () => route.path
}));

vi.mock('@/hooks/useUpcomingEvents', () => ({
  useUpcomingEvents: () => ({ appointmentData: null, sessionData: null })
}));

vi.mock('@/services/api/research', () => ({
  useResearchProgress: () => ({ data: undefined, isLoading: true })
}));

vi.mock('@/components/role-avatar-popup', () => ({
  default: () => <div data-testid='role-avatar' />
}));

vi.mock('@/components/general/avatar', () => ({
  default: () => <div data-testid='avatar' />
}));

vi.mock('@/lib/indexeddb', () => ({
  STORES: { uiPreferences: 'ui' },
  dbGet: vi.fn().mockResolvedValue(null)
}));

vi.mock('@/services/api', () => ({ getAPI: vi.fn() }));

/** Renders the header inside a query client. */
function renderHeader() {
  const client = new QueryClient();
  render(
    <QueryClientProvider client={client}>
      <PageHeader />
    </QueryClientProvider>
  );
}

beforeEach(() => {
  route.path = '/';
  route.query = '';
});

describe('PageHeader study routes', () => {
  it('renders titles for /study and /studies', () => {
    route.path = '/study';
    renderHeader();
    expect(screen.getAllByText('Study').length).toBeGreaterThan(0);
  });

  it('renders the /studies title', () => {
    route.path = '/studies';
    renderHeader();
    expect(screen.getAllByText('All studies').length).toBeGreaterThan(0);
  });

  it('backs /study to /studies', () => {
    route.path = '/study';
    route.query = 'id=a';
    renderHeader();
    expect(screen.getByLabelText('Go back')).toHaveAttribute(
      'href',
      '/studies'
    );
  });

  it('backs /studies to /', () => {
    route.path = '/studies';
    renderHeader();
    expect(screen.getByLabelText('Go back')).toHaveAttribute('href', '/');
  });

  it('backs /report?id=X to /study?id=X', () => {
    route.path = '/report';
    route.query = 'id=X';
    renderHeader();
    expect(screen.getByLabelText('Go back')).toHaveAttribute(
      'href',
      '/study?id=X'
    );
  });
});
