import type { MergedAppointment } from '@/types/appointment';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render } from '@testing-library/react';
import { addDays, format } from 'date-fns';
import { describe, expect, it, vi } from 'vitest';
import PageHeader from '../page-header';
import {
  AdminClinicCard,
  AuthArea,
  canShowResearchHeader,
  isSessionCardAvailable,
  isSessionWithinWindow,
  shouldShowSeeAll
} from '../page-header-sections';

const { mockUseAuth, mockPathname } = vi.hoisted(() => ({
  mockUseAuth: vi.fn(() => ({
    isLoading: false,
    state: { isAuthenticated: false, userInfo: {} }
  })),
  mockPathname: { current: '/' }
}));

vi.mock('@/i18n', () => ({
  useTranslations: vi.fn(() => (key: string) => key)
}));

vi.mock('@/context/auth/authContext', () => ({
  useAuth: () => mockUseAuth()
}));

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), back: vi.fn() }),
  useSearchParams: () => new URLSearchParams(),
  usePathname: () => mockPathname.current
}));

vi.mock('@/hooks/useUpcomingEvents', () => ({
  useUpcomingEvents: () => ({ appointmentData: null, sessionData: null })
}));

vi.mock('@/services/api/research', () => ({
  useResearchProgress: () => ({ data: null, isLoading: false })
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

/** Renders PageHeader inside a fresh query client. */
function renderHeader() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } }
  });
  return render(<PageHeader />, {
    wrapper: ({ children }: { children: React.ReactNode }) => (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    )
  });
}

/** Local naive ISO string offset by the given number of days from now. */
function slotOn(dayOffset: number): string {
  return format(addDays(new Date(), dayOffset), "yyyy-MM-dd'T'HH:mm:ss");
}

/** Minimal valid appointment fixture for predicate tests. */
function makeAppointment(slotStart: string | null): MergedAppointment {
  return {
    appointmentId: 'appt-1',
    slotStart,
    slotEnd: null,
    slotStatus: null,
    appointmentStatus: null,
    appointmentType: null,
    practitionerId: null,
    practitionerName: null,
    practitionerQualification: null,
    practitionerPhoto: null,
    practitionerEmail: null
  };
}

describe('isSessionWithinWindow', () => {
  it('is true for a session starting today', () => {
    expect(isSessionWithinWindow([makeAppointment(slotOn(0))])).toBe(true);
  });

  it('is true for a session starting tomorrow', () => {
    expect(isSessionWithinWindow([makeAppointment(slotOn(1))])).toBe(true);
  });

  it('is false for a session starting later than tomorrow', () => {
    expect(isSessionWithinWindow([makeAppointment(slotOn(5))])).toBe(false);
  });

  it('is false for a session that already started', () => {
    expect(isSessionWithinWindow([makeAppointment(slotOn(-1))])).toBe(false);
  });

  it('is false for null, empty, or slot-less data', () => {
    expect(isSessionWithinWindow(null)).toBe(false);
    expect(isSessionWithinWindow([])).toBe(false);
    expect(isSessionWithinWindow([makeAppointment(null)])).toBe(false);
  });
});

describe('isSessionCardAvailable', () => {
  const data = [makeAppointment('2026-08-01T09:00:00')];

  it('is true when session data exists and no gate applies', () => {
    expect(isSessionCardAvailable(data, false, false)).toBe(true);
  });

  it('is false for null, undefined, or empty data', () => {
    expect(isSessionCardAvailable(null, false, false)).toBe(false);
    expect(isSessionCardAvailable(undefined, false, false)).toBe(false);
    expect(isSessionCardAvailable([], false, false)).toBe(false);
  });

  it('is false for admins', () => {
    expect(isSessionCardAvailable(data, true, false)).toBe(false);
  });

  it('is false when the session block is hidden by the page', () => {
    expect(isSessionCardAvailable(data, false, true)).toBe(false);
  });
});

describe('shouldShowSeeAll', () => {
  it('is true when an urgent session wins over research', () => {
    expect(shouldShowSeeAll(true, true, true)).toBe(true);
  });

  it('is true when an urgent session shows for a research-ineligible role', () => {
    expect(shouldShowSeeAll(true, true, false)).toBe(true);
  });

  it('is false when research replaces a non-urgent session', () => {
    expect(shouldShowSeeAll(true, false, true)).toBe(false);
  });

  it('is true when a non-urgent session falls back for a research-ineligible role', () => {
    expect(shouldShowSeeAll(true, false, false)).toBe(true);
  });

  it('is false when there is no session card at all', () => {
    expect(shouldShowSeeAll(false, false, true)).toBe(false);
  });
});

describe('canShowResearchHeader', () => {
  const base = {
    isLoadingAuth: false,
    isAdmin: false,
    pathname: '/journal',
    isPatient: false,
    isAuthenticated: true
  };

  it('is true for an authenticated patient', () => {
    expect(
      canShowResearchHeader({ ...base, isPatient: true, isAuthenticated: true })
    ).toBe(true);
  });

  it('is true for a guest', () => {
    expect(canShowResearchHeader({ ...base, isAuthenticated: false })).toBe(
      true
    );
  });

  it('is false for a practitioner', () => {
    expect(canShowResearchHeader(base)).toBe(false);
  });

  it('is false for a clinic admin', () => {
    expect(canShowResearchHeader({ ...base, isAdmin: true })).toBe(false);
  });

  it('is false on the /research page', () => {
    expect(
      canShowResearchHeader({
        ...base,
        isPatient: true,
        pathname: '/research'
      })
    ).toBe(false);
  });

  it('is false on the research home page', () => {
    expect(
      canShowResearchHeader({ ...base, isPatient: true, pathname: '/' })
    ).toBe(false);
  });

  it('is false while auth is loading', () => {
    expect(canShowResearchHeader({ ...base, isLoadingAuth: true })).toBe(false);
  });
});

describe('PageHeader token styling', () => {
  it('uses the background token on the root band', () => {
    mockPathname.current = '/';
    const { container } = renderHeader();

    const root = container.firstElementChild;
    expect(root).not.toBeNull();
    expect(root).toHaveClass('bg-background');
    expect(root?.className).not.toContain('bg-[#efefef]');
  });

  it('renders the back chevron with a currentColor stroke', () => {
    mockPathname.current = '/clinic';
    const { container } = renderHeader();

    const svg = container.querySelector('a svg');
    expect(svg).not.toBeNull();
    expect(svg).toHaveAttribute('stroke', 'currentColor');
    expect(svg?.outerHTML).not.toContain('#2c2f35');
  });

  it('renders the admin clinic card skeleton on the muted surface', () => {
    const { container } = render(
      <AdminClinicCard isLoading clinicName={undefined} />
    );

    const card = container.firstElementChild;
    expect(card).not.toBeNull();
    expect(card).toHaveClass('bg-muted');
    expect(card?.outerHTML).not.toContain('#F9F9F9');

    const bars = container.querySelectorAll('.bg-charcoal-100');
    expect(bars.length).toBeGreaterThan(0);
    expect(card?.outerHTML).not.toContain('bg-gray-200');
  });

  it('renders the managing clinic card with token colours', () => {
    const { container } = render(
      <AdminClinicCard isLoading={false} clinicName='Klinik Sehat' />
    );

    const link = container.querySelector('a');
    expect(link).not.toBeNull();
    expect(link).toHaveClass('bg-muted');

    const clinicName = container.querySelector('.text-turquoise-deep');
    expect(clinicName).not.toBeNull();
    expect(clinicName).toHaveTextContent('Klinik Sehat');
    expect(link?.outerHTML).not.toContain('text-secondary');

    const icon = container.querySelector('svg');
    expect(icon).toHaveClass('text-foreground');
    expect(link?.outerHTML).not.toContain('text-black');
  });

  it('renders the guest identity lines with the foreground token', () => {
    const { getByText, container } = render(
      <AuthArea
        isLoading={false}
        isAuthenticated={false}
        indicator='Belum masuk'
        displayName={undefined}
        guestAvatar={{
          seed: 'guest',
          initials: 'G',
          backgroundColor: '#13c2c2'
        }}
      />
    );

    expect(getByText('Guest')).toHaveClass('text-foreground');
    expect(getByText('Belum masuk')).toHaveClass('text-foreground');
    expect(container.innerHTML).not.toContain('#2c2f35');
  });
});
