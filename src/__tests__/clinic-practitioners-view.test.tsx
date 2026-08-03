/* eslint-disable max-lines */
/* reason: comprehensive integration test for ClinicPractitionersView */
import ClinicPractitionersView from '@/components/clinic/clinic-practitioners-view';
import { FhirExtensionUrls } from '@/utils/fhir/extensions';
import { fireEvent, render, screen } from '@testing-library/react';
import { type BundleEntry } from 'fhir/r4';
import { beforeEach, describe, expect, it, vi } from 'vitest';
vi.mock('next/navigation', () => ({ useRouter: () => ({ push: vi.fn() }) }));
vi.mock('next/image', () => ({
  default: (props: React.ComponentPropsWithoutRef<'img'>) => (
    // eslint-disable-next-line @next/next/no-img-element, jsx-a11y/alt-text
    <img data-testid='mock-image' {...props} />
  )
}));
vi.mock('@/components/practitioner/practitioner-card', () => ({
  PractitionerCard: ({
    practitionerName,
    practitionerRoleId
  }: {
    practitionerName: string;
    practitionerRoleId: string;
  }) => (
    <div data-testid='mock-practitioner-card' data-role-id={practitionerRoleId}>
      {practitionerName}
    </div>
  )
}));
vi.mock('@/components/ui/input-with-icon', () => ({
  InputWithIcon: ({
    value,
    onChange,
    placeholder
  }: {
    value: string;
    onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
    placeholder: string;
  }) => (
    <div data-testid='mock-input-with-icon'>
      <input
        data-testid='mock-search-input'
        value={value}
        onChange={onChange}
        placeholder={placeholder}
      />
    </div>
  )
}));
vi.mock('@/components/general/empty-state', () => ({
  default: ({ title, subtitle }: { title: string; subtitle: string }) => (
    <div data-testid='mock-empty-state'>
      <div>{title}</div>
      <div>{subtitle}</div>
    </div>
  )
}));
vi.mock('@/components/general/card-loader', () => ({
  default: () => <div data-testid='mock-card-loader'>Loading...</div>
}));
vi.mock('lucide-react', () => ({
  Building: () => <svg data-testid='mock-building-icon' />,
  MapPin: () => <svg data-testid='mock-map-pin-icon' />,
  SearchIcon: () => <svg data-testid='mock-search-icon' />
}));
vi.mock('@/lib/indexeddb', () => ({
  STORES: { uiPreferences: 'ui_preferences' },
  dbSet: vi.fn().mockResolvedValue(null)
}));

function locEntry(overrides: Record<string, unknown> = {}) {
  return {
    resource: {
      resourceType: 'Location',
      id: 'loc-1',
      name: 'Konsulin Test Clinic',
      address: {
        line: ['Jl. Sudirman No. 123'],
        city: 'Jakarta',
        state: 'DKI Jakarta',
        postalCode: '12940'
      },
      hoursOfOperation: [
        {
          daysOfWeek: ['mon', 'tue', 'wed', 'thu', 'fri'],
          openingTime: '09:00:00',
          closingTime: '17:00:00'
        },
        {
          daysOfWeek: ['sat'],
          openingTime: '09:00:00',
          closingTime: '14:00:00'
        }
      ],
      ...overrides
    }
  } as unknown as BundleEntry;
}
function orgEntry() {
  return {
    resource: {
      resourceType: 'Organization',
      id: 'org-1',
      name: 'Konsulin Test Clinic'
    }
  } as unknown as BundleEntry;
}
function roleEntry(id: string, pid: string, svcs: string[] = []) {
  return {
    resource: {
      resourceType: 'PractitionerRole',
      id,
      practitioner: { reference: `Practitioner/${pid}` },
      specialty: [{ text: 'Cardiology' }],
      healthcareService: svcs.map(s => ({
        reference: `HealthcareService/${s}`
      }))
    }
  } as unknown as BundleEntry;
}
function pracEntry(id: string, given: string, family: string) {
  return {
    resource: {
      resourceType: 'Practitioner',
      id,
      name: [{ given: [given], family }],
      photo: [{ url: `https://example.com/${id}.jpg` }]
    }
  } as unknown as BundleEntry;
}
function hsEntry(id: string, name: string) {
  return {
    resource: { resourceType: 'HealthcareService', id, name }
  } as unknown as BundleEntry;
}
const mockWriteText = vi
  .fn<(text: string) => Promise<void>>()
  .mockResolvedValue();
const mockShare = vi
  .fn<(data: { url: string }) => Promise<void>>()
  .mockResolvedValue();

beforeEach(() => {
  vi.clearAllMocks();
  Object.defineProperty(navigator, 'clipboard', {
    value: { writeText: mockWriteText },
    writable: true,
    configurable: true
  });
  Object.defineProperty(navigator, 'share', {
    value: mockShare,
    writable: true,
    configurable: true
  });
});

const baseEntries = [locEntry(), orgEntry()];
function renderView(entries: BundleEntry[] = baseEntries, loading = false) {
  return render(
    <ClinicPractitionersView
      entries={entries}
      isFetching={loading}
      isLoading={loading}
    />
  );
}
describe('ClinicPractitionersView', () => {
  it('renders hero image with full frost overlay', () => {
    renderView();
    const imgs = screen.getAllByTestId('mock-image');
    const hero = imgs.find(
      i =>
        i.getAttribute('src') === '/images/clinic.jpg' &&
        i.getAttribute('alt') === 'Konsulin Test Clinic'
    );
    expect(hero).toBeDefined();
    expect(
      hero?.closest('.relative')?.querySelector('.backdrop-blur-md')
    ).not.toBeNull();
  });

  it('renders custom image from locationImage extension when present', () => {
    const entries = [
      locEntry({
        extension: [
          {
            url: FhirExtensionUrls.locationImage,
            valueUrl:
              'https://res.cloudinary.com/test/image/upload/v1/clinic.webp'
          }
        ]
      }),
      orgEntry()
    ];
    renderView(entries);
    const imgs = screen.getAllByTestId('mock-image');
    const hero = imgs.find(
      i =>
        i.getAttribute('src') ===
          'https://res.cloudinary.com/test/image/upload/v1/clinic.webp' &&
        i.getAttribute('alt') === 'Konsulin Test Clinic'
    );
    expect(hero).toBeDefined();
  });

  it('shows clinic name, address and managed-by org in overlay', () => {
    renderView();
    expect(screen.getByText('Konsulin Test Clinic')).toBeDefined();
    expect(
      screen.getByText('Jl. Sudirman No. 123, Jakarta, DKI Jakarta 12940')
    ).toBeDefined();
    expect(screen.getByText(/Managed by/)).toBeDefined();
    expect(screen.getByText(/Managed by/).textContent).toContain(
      'Konsulin Test Clinic'
    );
  });

  it('shows per-day hours Monday-first', () => {
    renderView();
    expect(screen.getByText(/Mon:\s*09:00-17:00/)).toBeDefined();
    expect(screen.getByText(/Tue:\s*09:00-17:00/)).toBeDefined();
    expect(screen.getByText(/Wed:\s*09:00-17:00/)).toBeDefined();
    expect(screen.getByText(/Thu:\s*09:00-17:00/)).toBeDefined();
    expect(screen.getByText(/Fri:\s*09:00-17:00/)).toBeDefined();
    expect(screen.getByText(/Sat:\s*09:00-14:00/)).toBeDefined();
    expect(screen.queryByText(/Sun:/)).toBeNull();
  });

  it('shows Building icon alongside organisation name', () => {
    renderView();
    expect(screen.getByTestId('mock-building-icon')).toBeDefined();
  });

  it('removes old clinic information section', () => {
    renderView();
    expect(screen.queryByText('Clinic Information')).toBeNull();
    expect(screen.queryByText('Affiliation')).toBeNull();
  });

  it('triggers address copy on Enter key press', () => {
    renderView();
    const hero = document.querySelector<HTMLElement>(
      '[class*="cursor-pointer"]'
    );
    expect(hero).not.toBeNull();
    hero.focus();
    fireEvent.keyDown(hero, { key: 'Enter', code: 'Enter' });
    expect(mockWriteText).toHaveBeenCalledWith(
      'Jl. Sudirman No. 123, Jakarta, DKI Jakarta 12940'
    );
  });

  it('copies address on left click', () => {
    renderView();
    const overlay = document.querySelector('.backdrop-blur-md');
    expect(overlay).not.toBeNull();
    fireEvent.click(overlay);
    expect(mockWriteText).toHaveBeenCalledWith(
      'Jl. Sudirman No. 123, Jakarta, DKI Jakarta 12940'
    );
  });

  it('shares URL on right click', () => {
    const testUrl = 'http://localhost:3000/clinic?id=loc-1';
    Object.defineProperty(window, 'location', {
      value: { href: testUrl },
      writable: true,
      configurable: true
    });
    renderView();
    fireEvent.contextMenu(document.querySelector('.backdrop-blur-md'));
    expect(mockShare).toHaveBeenCalledWith({ url: testUrl });
  });

  it('falls back to clipboard when share unavailable', () => {
    Object.defineProperty(navigator, 'share', {
      value: undefined,
      writable: true,
      configurable: true
    });
    const testUrl = 'http://localhost:3000/clinic?id=loc-1';
    Object.defineProperty(window, 'location', {
      value: { href: testUrl },
      writable: true,
      configurable: true
    });
    renderView();
    fireEvent.contextMenu(document.querySelector('.backdrop-blur-md'));
    expect(mockWriteText).toHaveBeenCalledWith(testUrl);
  });

  it('renders PractitionerCard for each practitioner', () => {
    const entries = [
      locEntry(),
      orgEntry(),
      roleEntry('role-1', 'prac-1', ['hs-1']),
      pracEntry('prac-1', 'John', 'Doe'),
      hsEntry('hs-1', 'General Consultation')
    ];
    renderView(entries);
    const cards = screen.getAllByTestId('mock-practitioner-card');
    expect(cards).toHaveLength(1);
    expect(cards[0]).toHaveTextContent('John Doe');
    expect(cards[0]).toHaveAttribute('data-role-id', 'role-1');
  });

  it('shows empty state when no practitioners', () => {
    renderView([locEntry(), orgEntry()]);
    expect(screen.getByTestId('mock-empty-state')).toBeDefined();
    expect(screen.getByText('No Practitioners Found')).toBeDefined();
  });

  it('shows card loader when loading', () => {
    renderView(undefined, true);
    expect(screen.getByTestId('mock-card-loader')).toBeDefined();
  });

  it('prefers location name over organization name', () => {
    renderView([locEntry({ name: 'Location Name' }), orgEntry()]);
    expect(screen.getByText('Location Name')).toBeDefined();
    expect(screen.queryByText('Konsulin Test Clinic')).toBeNull();
  });

  it('handles location without hours', () => {
    renderView([locEntry({ hoursOfOperation: undefined })]);
    expect(screen.queryByText(/Mon:/)).toBeNull();
    expect(screen.getByText('Konsulin Test Clinic')).toBeDefined();
  });

  it('has padding on overlay edges', () => {
    renderView();
    expect(document.querySelector('.backdrop-blur-md')?.className).toContain(
      'p-4'
    );
  });
});
