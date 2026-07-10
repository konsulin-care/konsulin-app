/* eslint-disable @typescript-eslint/no-empty-function, @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-return, @next/next/no-img-element, jsx-a11y/alt-text */

import ClinicPractitionersView from '@/components/clinic/clinic-practitioners-view';
import { fireEvent, render, screen } from '@testing-library/react';
import { type BundleEntry } from 'fhir/r4';
import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

beforeAll(() => {
  global.ResizeObserver = class {
    observe() {}
    unobserve() {}
    disconnect() {}
  };
});

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn() })
}));

vi.mock('next/image', () => ({
  default: (props: any) => <img data-testid='mock-image' {...props} />
}));

vi.mock('@/components/practitioner/practitioner-card', () => ({
  PractitionerCard: ({ practitionerName, practitionerRoleId }: any) => (
    <div data-testid='mock-practitioner-card' data-role-id={practitionerRoleId}>
      {practitionerName}
    </div>
  )
}));

vi.mock('@/components/ui/input-with-icon', () => ({
  InputWithIcon: ({ value, onChange, placeholder }: any) => (
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
  default: ({ title, subtitle }: any) => (
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
  SearchIcon: () => <svg data-testid='mock-search-icon' />
}));

vi.mock('@/lib/indexeddb', () => ({
  STORES: { uiPreferences: 'ui_preferences' },
  dbSet: vi.fn().mockResolvedValue(null)
}));

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

function createLocationEntry(overrides: Record<string, unknown> = {}) {
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

function createOrgEntry() {
  return {
    resource: {
      resourceType: 'Organization',
      id: 'org-1',
      name: 'Konsulin Test Clinic'
    }
  } as unknown as BundleEntry;
}

function createPractitionerRoleEntry(
  id: string,
  practitionerId: string,
  serviceRefs: string[] = []
) {
  return {
    resource: {
      resourceType: 'PractitionerRole',
      id,
      practitioner: { reference: `Practitioner/${practitionerId}` },
      specialty: [{ text: 'Cardiology' }],
      healthcareService: serviceRefs.map(s => ({
        reference: `HealthcareService/${s}`
      }))
    }
  } as unknown as BundleEntry;
}

function createPractitionerEntry(id: string, given: string, family: string) {
  return {
    resource: {
      resourceType: 'Practitioner',
      id,
      name: [{ given: [given], family }],
      photo: [{ url: `https://example.com/${id}.jpg` }]
    }
  } as unknown as BundleEntry;
}

function createHealthcareServiceEntry(id: string, name: string) {
  return {
    resource: {
      resourceType: 'HealthcareService',
      id,
      name
    }
  } as unknown as BundleEntry;
}

const mockWriteText = vi.fn().mockResolvedValue(undefined);
const mockShare = vi.fn().mockResolvedValue(undefined);

beforeEach(() => {
  vi.clearAllMocks();

  // Mock clipboard + share
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

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('ClinicPractitionersView', () => {
  it('renders hero image with full frost overlay', () => {
    const entries = [createLocationEntry()];
    render(
      <ClinicPractitionersView
        entries={entries}
        isFetching={false}
        isLoading={false}
        locationId='loc-1'
      />
    );

    // Hero image
    const images = screen.getAllByTestId('mock-image');
    const heroImage = images.find(
      img =>
        img.getAttribute('src') === '/images/clinic.jpg' &&
        img.getAttribute('alt') === 'Konsulin Test Clinic'
    );
    expect(heroImage).toBeDefined();

    // Frost overlay: backdrop-blur-md indicates the blur effect
    const overlay = heroImage?.closest('.relative')?.querySelector('.backdrop-blur-md');
    expect(overlay).not.toBeNull();
  });

  it('shows clinic name and address in overlay left (60%)', () => {
    const entries = [createLocationEntry()];
    render(
      <ClinicPractitionersView
        entries={entries}
        isFetching={false}
        isLoading={false}
        locationId='loc-1'
      />
    );

    expect(screen.getByText('Konsulin Test Clinic')).toBeDefined();
    expect(screen.getByText('Jl. Sudirman No. 123, Jakarta, DKI Jakarta 12940')).toBeDefined();
  });

  it('copies address without extra comma before postal code', () => {
    const entries = [createLocationEntry()];
    render(
      <ClinicPractitionersView
        entries={entries}
        isFetching={false}
        isLoading={false}
        locationId='loc-1'
      />
    );

    // Check no double comma before postal
    const addressEl = screen.getByText(/Jl\. Sudirman/);
    expect(addressEl.textContent).not.toContain('Jakarta, 12940');
  });

  it('shows per-day hours in overlay right (40%) sorted Monday-first', () => {
    const entries = [createLocationEntry()];
    render(
      <ClinicPractitionersView
        entries={entries}
        isFetching={false}
        isLoading={false}
        locationId='loc-1'
      />
    );

    expect(screen.getByText(/Mon:\s*09:00-17:00/)).toBeDefined();
    expect(screen.getByText(/Tue:\s*09:00-17:00/)).toBeDefined();
    expect(screen.getByText(/Wed:\s*09:00-17:00/)).toBeDefined();
    expect(screen.getByText(/Thu:\s*09:00-17:00/)).toBeDefined();
    expect(screen.getByText(/Fri:\s*09:00-17:00/)).toBeDefined();
    expect(screen.getByText(/Sat:\s*09:00-14:00/)).toBeDefined();
    // Sunday should not appear
    expect(screen.queryByText(/Sun:/)).toBeNull();
  });

  it('does not render old clinic information section', () => {
    const entries = [createLocationEntry()];
    render(
      <ClinicPractitionersView
        entries={entries}
        isFetching={false}
        isLoading={false}
        locationId='loc-1'
      />
    );

    // Old clinic info section had "Clinic Information" heading and "Affiliation" text
    expect(screen.queryByText('Clinic Information')).toBeNull();
    expect(screen.queryByText('Affiliation')).toBeNull();
  });

  it('left click on hero copies address to clipboard', () => {
    const entries = [createLocationEntry()];
    render(
      <ClinicPractitionersView
        entries={entries}
        isFetching={false}
        isLoading={false}
        locationId='loc-1'
      />
    );

    const expectedAddress = 'Jl. Sudirman No. 123, Jakarta, DKI Jakarta 12940';

    // Find the frost overlay container and click it
    const overlay = document.querySelector('.backdrop-blur-md');
    expect(overlay).not.toBeNull();
    fireEvent.click(overlay!);

    expect(mockWriteText).toHaveBeenCalledWith(expectedAddress);
  });

  it('right click on hero shares current URL', () => {
    // Set window.location.href
    const testUrl = 'http://localhost:3000/clinic?id=loc-1';
    Object.defineProperty(window, 'location', {
      value: { href: testUrl },
      writable: true,
      configurable: true
    });

    const entries = [createLocationEntry()];
    render(
      <ClinicPractitionersView
        entries={entries}
        isFetching={false}
        isLoading={false}
        locationId='loc-1'
      />
    );

    const overlay = document.querySelector('.backdrop-blur-md');
    expect(overlay).not.toBeNull();

    // Right click
    fireEvent.contextMenu(overlay!);
    expect(mockShare).toHaveBeenCalledWith({ url: testUrl });
  });

  it('falls back to clipboard copy when navigator.share is unavailable', () => {
    // Remove navigator.share
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

    const entries = [createLocationEntry()];
    render(
      <ClinicPractitionersView
        entries={entries}
        isFetching={false}
        isLoading={false}
        locationId='loc-1'
      />
    );

    const overlay = document.querySelector('.backdrop-blur-md');
    expect(overlay).not.toBeNull();

    fireEvent.contextMenu(overlay!);
    // Should copy URL to clipboard instead
    expect(mockWriteText).toHaveBeenCalledWith(testUrl);
  });

  it('renders PractitionerCard components for each practitioner', () => {
    const entries = [
      createLocationEntry(),
      createOrgEntry(),
      createPractitionerRoleEntry('role-1', 'prac-1', ['hs-1']),
      createPractitionerEntry('prac-1', 'John', 'Doe'),
      createHealthcareServiceEntry('hs-1', 'General Consultation')
    ];

    render(
      <ClinicPractitionersView
        entries={entries}
        isFetching={false}
        isLoading={false}
        locationId='loc-1'
      />
    );

    const cards = screen.getAllByTestId('mock-practitioner-card');
    expect(cards).toHaveLength(1);
    expect(cards[0]).toHaveTextContent('John Doe');
    expect(cards[0]).toHaveAttribute('data-role-id', 'role-1');
  });

  it('shows empty state when no practitioners found', () => {
    const entries = [createLocationEntry(), createOrgEntry()];

    render(
      <ClinicPractitionersView
        entries={entries}
        isFetching={false}
        isLoading={false}
        locationId='loc-1'
      />
    );

    expect(screen.getByTestId('mock-empty-state')).toBeDefined();
    expect(screen.getByText('No Practitioners Found')).toBeDefined();
  });

  it('shows card loader when loading', () => {
    render(
      <ClinicPractitionersView
        entries={undefined}
        isFetching={true}
        isLoading={true}
        locationId='loc-1'
      />
    );

    expect(screen.getByTestId('mock-card-loader')).toBeDefined();
  });

  it('uses location name over organization name for clinic name', () => {
    const entries = [
      createLocationEntry({ name: 'Location Name' }),
      createOrgEntry()
    ];

    render(
      <ClinicPractitionersView
        entries={entries}
        isFetching={false}
        isLoading={false}
        locationId='loc-1'
      />
    );

    expect(screen.getByText('Location Name')).toBeDefined();
    // Organization name should not be shown as primary name
    expect(screen.queryByText('Konsulin Test Clinic')).toBeNull();
  });

  it('handles location without hoursOfOperation gracefully', () => {
    const entries = [
      createLocationEntry({ hoursOfOperation: undefined })
    ];

    render(
      <ClinicPractitionersView
        entries={entries}
        isFetching={false}
        isLoading={false}
        locationId='loc-1'
      />
    );

    // Should not render any day-hours entries
    expect(screen.queryByText(/Mon:/)).toBeNull();
    expect(screen.queryByText(/Tue:/)).toBeNull();
    // But should still show clinic name
    expect(screen.getByText('Konsulin Test Clinic')).toBeDefined();
  });

  it('shows padding on all overlay edges', () => {
    const entries = [createLocationEntry()];
    render(
      <ClinicPractitionersView
        entries={entries}
        isFetching={false}
        isLoading={false}
        locationId='loc-1'
      />
    );

    // The overlay is the backdrop-blur-md element
    const overlay = document.querySelector('.backdrop-blur-md');
    expect(overlay).not.toBeNull();

    // Check padding on all sides
    const classList = (overlay as HTMLElement).className;
    // p-4 applies padding: 1rem on all sides
    expect(classList).toContain('p-4');
  });
});
