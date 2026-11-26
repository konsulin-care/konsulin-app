import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, within } from '@testing-library/react';
import type { ReactNode } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import AppSidebar from '../app-sidebar';

type MockAuthState = {
  state: {
    isAuthenticated: boolean;
    userInfo: { role_name?: string };
  };
};

const { mockUseAuth, mockPush, mockUsePathname } = vi.hoisted(() => ({
  mockUseAuth: vi.fn<() => MockAuthState>(),
  mockPush: vi.fn(),
  mockUsePathname: vi.fn<() => string>()
}));

vi.mock('@/context/auth/authContext', () => ({
  useAuth: () => mockUseAuth()
}));

vi.mock('next/navigation', () => ({
  usePathname: () => mockUsePathname(),
  useRouter: () => ({ push: mockPush })
}));

vi.mock('next/image', () => ({
  default: ({ src, alt, ...props }: Record<string, unknown>) => {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img src={src as string} alt={alt as string} {...props} />
    );
  }
}));

vi.mock('@/i18n', async () => {
  const { createUseTranslationsMock } =
    await import('@/i18n/__tests__/test-messages');
  return { useTranslations: createUseTranslationsMock() };
});

vi.mock('@/context/recommendationContext', () => ({
  useRecommendationResult: () => ({ setResult: vi.fn() })
}));

vi.mock('../register-practitioner-drawer', () => ({ default: () => null }));
vi.mock('../add-location-drawer', () => ({ default: () => null }));
vi.mock('../add-assessment-drawer', () => ({ default: () => null }));
vi.mock('../screening-drawer', () => ({
  default: ({ open }: { open: boolean }) =>
    open ? <div data-testid='screening-drawer' /> : null
}));

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: false } }
});

/** Provides the query client required by the pill actions hook. */
function Wrapper({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
}

/** Renders the sidebar inside its required providers. */
function renderSidebar(role: string, pathname = '/') {
  mockUseAuth.mockReturnValue({
    state: { isAuthenticated: true, userInfo: { role_name: role } }
  });
  mockUsePathname.mockReturnValue(pathname);
  return render(<AppSidebar />, { wrapper: Wrapper });
}

/** Returns the navigation landmark. */
function getNav(): HTMLElement {
  return screen.getByRole('navigation', { name: 'Main navigation' });
}

describe('AppSidebar', () => {
  beforeEach(() => {
    mockPush.mockReset();
    document.cookie = 'redirect_intent=; Max-Age=0; Path=/';
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('renders Home and the patient pills inside the navigation landmark', () => {
    renderSidebar('Patient');
    const nav = getNav();

    const home = within(nav).getByRole('link', { name: 'Home' });
    expect(home).toHaveAttribute('href', '/');

    const links = within(nav).getAllByRole('link');
    expect(links.map(link => link.textContent)).toEqual([
      'Konsulin',
      'Home',
      'Self Checkup',
      'Write Journal',
      'View Schedule',
      'Browse studies'
    ]);
    expect(
      within(nav).queryByRole('button', { name: 'Get Recommendation' })
    ).not.toBeInTheDocument();
  });

  it('renders the practitioner pills', () => {
    renderSidebar('Practitioner');
    const nav = getNav();

    expect(
      within(nav).getByRole('link', { name: 'Set Availability' })
    ).toBeInTheDocument();
    expect(
      within(nav).getByRole('link', { name: 'Health Screening' })
    ).toBeInTheDocument();
    expect(
      within(nav).getByRole('link', { name: 'S.O.A.P.' })
    ).toBeInTheDocument();
  });

  it('renders the researcher navigation without sidebar-hidden pills', () => {
    renderSidebar('Researcher');
    const nav = getNav();

    expect(within(nav).getByRole('link', { name: 'Home' })).toHaveAttribute(
      'href',
      '/'
    );
    expect(
      within(nav).queryByRole('button', { name: 'Register Survey' })
    ).not.toBeInTheDocument();
    expect(
      within(nav).queryByRole('link', { name: 'My Survey' })
    ).not.toBeInTheDocument();
  });

  it('marks Home current only on exactly /', () => {
    renderSidebar('Patient', '/');
    const nav = getNav();
    expect(within(nav).getByRole('link', { name: 'Home' })).toHaveAttribute(
      'aria-current',
      'page'
    );
    expect(
      within(nav).getByRole('link', { name: 'Write Journal' })
    ).not.toHaveAttribute('aria-current');
  });

  it('marks Home current on /research and its nested paths', () => {
    renderSidebar('Researcher', '/research');
    const nav = getNav();
    expect(within(nav).getByRole('link', { name: 'Home' })).toHaveAttribute(
      'aria-current',
      'page'
    );
  });

  it('ignores the query string and keeps Home inactive off /', () => {
    renderSidebar('Patient', '/journal?tab=recent');
    const nav = getNav();
    expect(within(nav).getByRole('link', { name: 'Home' })).not.toHaveAttribute(
      'aria-current'
    );
    expect(
      within(nav).getByRole('link', { name: 'Write Journal' })
    ).toHaveAttribute('aria-current', 'page');
  });

  it('matches nested paths but not partial segments', () => {
    renderSidebar('Patient', '/journal/entry-1');
    const nav = getNav();
    expect(
      within(nav).getByRole('link', { name: 'Write Journal' })
    ).toHaveAttribute('aria-current', 'page');
    expect(
      within(nav).getByRole('link', { name: 'View Schedule' })
    ).not.toHaveAttribute('aria-current');
  });

  it('keeps every nav item flex-aligned without line clamping', () => {
    renderSidebar('Patient');
    const nav = getNav();

    const links = within(nav).getAllByRole('link');
    expect(links.length).toBeGreaterThan(0);
    links.forEach(link => {
      expect(link).toHaveClass('flex', 'items-center');
      expect(link.className).not.toContain('line-clamp');
    });
  });

  it('visually hides the label below lg but keeps the accessible name', () => {
    renderSidebar('Patient');
    const nav = getNav();

    const home = within(nav).getByRole('link', { name: 'Home' });
    const label = home.querySelector('span');
    expect(label).not.toBeNull();
    expect(label).toHaveClass('md:sr-only', 'lg:not-sr-only');
    expect(home).toHaveAccessibleName('Home');
  });

  it('opens a tooltip with the label on focus', async () => {
    renderSidebar('Patient');
    const nav = getNav();

    const journal = within(nav).getByRole('link', { name: 'Write Journal' });
    fireEvent.focus(journal);

    const tooltip = await screen.findByRole('tooltip');
    expect(tooltip).toHaveTextContent('Write Journal');
  });

  it('routes a guest pill outside /assessments through the pill action', () => {
    renderSidebar('Guest');
    const journalButton = screen.getByRole('button', {
      name: 'Write Journal'
    });
    expect(
      screen.queryByRole('link', { name: 'Write Journal' })
    ).not.toBeInTheDocument();

    fireEvent.click(journalButton);
    expect(mockPush).toHaveBeenCalledWith('/auth');
  });

  it('marks Browse studies current on /studies and keeps Home inactive', () => {
    renderSidebar('Patient', '/studies');
    const nav = getNav();

    expect(
      within(nav).getByRole('link', { name: 'Browse studies' })
    ).toHaveAttribute('aria-current', 'page');
    expect(within(nav).getByRole('link', { name: 'Home' })).not.toHaveAttribute(
      'aria-current'
    );
  });

  it('marks Browse studies current on /study with a query string', () => {
    renderSidebar('Patient', '/study?id=study-1');
    const nav = getNav();

    expect(
      within(nav).getByRole('link', { name: 'Browse studies' })
    ).toHaveAttribute('aria-current', 'page');
    expect(within(nav).getByRole('link', { name: 'Home' })).not.toHaveAttribute(
      'aria-current'
    );
  });

  it('keeps the guest browse studies pill as a plain link', () => {
    renderSidebar('Guest');
    expect(
      screen.getByRole('link', { name: 'Browse studies' })
    ).toHaveAttribute('href', '/studies');
  });

  it('keeps the guest assessments pill as a plain link', () => {
    renderSidebar('Guest');
    expect(screen.getByRole('link', { name: 'Self Checkup' })).toHaveAttribute(
      'href',
      '/assessments'
    );
  });
});
