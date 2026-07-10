/* eslint-disable max-lines */
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';
import type { AxiosInstance } from 'axios';
import type { ReactNode } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/services/api', () => ({
  getAPI: vi.fn()
}));

import { getAPI } from '@/services/api';
import type {
  Bundle,
  HealthcareService,
  Location,
  PractitionerRole
} from 'fhir/r4';
import {
  getTodayHours,
  useClinicLocationPractitioners,
  useClinicLocations,
  useListActiveOrganizations
} from '../clinic-locations';

// ---------------------------------------------------------------------------
// Shared mock infrastructure
// ---------------------------------------------------------------------------

const mockAxiosInstance = {
  get: vi.fn()
};

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } }
  });
  return function Wrapper({ children }: { children: ReactNode }) {
    return (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(getAPI).mockResolvedValue(
    mockAxiosInstance as unknown as AxiosInstance
  );
});

afterEach(() => {
  vi.resetAllMocks();
});

// ---------------------------------------------------------------------------
// getTodayHours — pure function, no React Query
// ---------------------------------------------------------------------------

describe('getTodayHours', () => {
  const baseLocation: Location = {
    resourceType: 'Location',
    id: 'loc-1',
    name: 'Test Clinic'
  };

  /** Override Date.now so "today" is fixed to a known weekday. */
  function mockToday(weekdayIndex: number) {
    // weekdayIndex: 0=Sun, 1=Mon, ..., 6=Sat
    // Use a Monday 2026-01-05 + offset
    const base = new Date(2026, 0, 5); // Monday
    const target = new Date(base);
    target.setDate(base.getDate() + weekdayIndex - 1);
    vi.useFakeTimers({ now: target, toFake: ['Date'] });
  }

  afterEach(() => {
    vi.useRealTimers();
  });

  it('returns "Closed today" when hoursOfOperation is undefined', () => {
    expect(getTodayHours(baseLocation)).toBe('Closed today');
  });

  it('returns "Closed today" when hoursOfOperation is empty', () => {
    const loc: Location = { ...baseLocation, hoursOfOperation: [] };
    expect(getTodayHours(loc)).toBe('Closed today');
  });

  it('returns "Closed today" when no entry matches today', () => {
    mockToday(3); // Wednesday
    const loc: Location = {
      ...baseLocation,
      hoursOfOperation: [
        {
          daysOfWeek: ['mon', 'tue', 'thu', 'fri'],
          openingTime: '09:00:00',
          closingTime: '18:00:00'
        }
      ]
    };
    expect(getTodayHours(loc)).toBe('Closed today');
  });

  it('returns "Open until 18:00" when today matches with closing time', () => {
    mockToday(1); // Monday
    const loc: Location = {
      ...baseLocation,
      hoursOfOperation: [
        {
          daysOfWeek: ['mon', 'tue', 'wed', 'thu', 'fri'],
          openingTime: '09:00:00',
          closingTime: '18:00:00'
        }
      ]
    };
    expect(getTodayHours(loc)).toBe('Open until 18:00');
  });

  it('uses the first matching entry when multiple daysOfWeek entries exist', () => {
    mockToday(2); // Tuesday
    const loc: Location = {
      ...baseLocation,
      hoursOfOperation: [
        {
          daysOfWeek: ['mon'],
          openingTime: '08:00:00',
          closingTime: '17:00:00'
        },
        {
          daysOfWeek: ['tue', 'wed'],
          openingTime: '09:00:00',
          closingTime: '20:00:00'
        }
      ]
    };
    expect(getTodayHours(loc)).toBe('Open until 20:00');
  });

  it('strips seconds from closingTime', () => {
    mockToday(5); // Friday
    const loc: Location = {
      ...baseLocation,
      hoursOfOperation: [
        {
          daysOfWeek: ['fri'],
          openingTime: '10:00:00',
          closingTime: '22:30:00'
        }
      ]
    };
    expect(getTodayHours(loc)).toBe('Open until 22:30');
  });
});

// ---------------------------------------------------------------------------
// useListActiveOrganizations — organization combobox data
// ---------------------------------------------------------------------------

describe('useListActiveOrganizations', () => {
  it('fetches active organizations with locations', async () => {
    const bundle: Bundle = {
      resourceType: 'Bundle',
      type: 'searchset',
      entry: [
        {
          resource: {
            resourceType: 'Organization',
            id: 'org-1',
            name: 'Klinik A'
          }
        }
      ]
    };
    mockAxiosInstance.get.mockResolvedValueOnce({ data: bundle });

    const { result } = renderHook(() => useListActiveOrganizations(), {
      wrapper: createWrapper()
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mockAxiosInstance.get).toHaveBeenCalledWith(
      '/fhir/Organization?active=true&_has:Location:organization:status=active&_elements=id,name'
    );
    expect(result.current.data).toEqual([{ code: 'org-1', name: 'Klinik A' }]);
  });

  it('returns empty array when no organizations found', async () => {
    mockAxiosInstance.get.mockResolvedValueOnce({
      data: { resourceType: 'Bundle', type: 'searchset', entry: [] }
    });

    const { result } = renderHook(() => useListActiveOrganizations(), {
      wrapper: createWrapper()
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual([]);
  });

  it('handles undefined entry gracefully', async () => {
    mockAxiosInstance.get.mockResolvedValueOnce({
      data: { resourceType: 'Bundle', type: 'searchset' }
    });

    const { result } = renderHook(() => useListActiveOrganizations(), {
      wrapper: createWrapper()
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// useClinicLocations — role-based Location fetching
// ---------------------------------------------------------------------------

// Role constants matching src/constants/roles.ts
const PATIENT = 'Patient';
const GUEST = 'Guest';
const ADMIN = 'Clinic Admin';
const PRACTITIONER = 'Practitioner';

describe('useClinicLocations', () => {
  it('fetches all locations for Patient role', async () => {
    const bundle: Bundle = {
      resourceType: 'Bundle',
      type: 'searchset',
      entry: [
        {
          resource: {
            resourceType: 'Location',
            id: 'loc-1',
            name: 'Main Clinic',
            address: { city: 'Jakarta' }
          }
        }
      ]
    };
    mockAxiosInstance.get.mockResolvedValueOnce({ data: bundle });

    const { result } = renderHook(() => useClinicLocations({ role: PATIENT }), {
      wrapper: createWrapper()
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toHaveLength(1);
    expect(result.current.data[0].id).toBe('loc-1');
    expect(mockAxiosInstance.get).toHaveBeenCalledWith('/fhir/Location');
  });

  it('fetches all locations for Guest role', async () => {
    const bundle: Bundle = {
      resourceType: 'Bundle',
      type: 'searchset',
      entry: []
    };
    mockAxiosInstance.get.mockResolvedValueOnce({ data: bundle });

    const { result } = renderHook(() => useClinicLocations({ role: GUEST }), {
      wrapper: createWrapper()
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mockAxiosInstance.get).toHaveBeenCalledWith('/fhir/Location');
  });

  it('fetches org-filtered locations for Clinic Admin', async () => {
    const bundle: Bundle = {
      resourceType: 'Bundle',
      type: 'searchset',
      entry: []
    };
    mockAxiosInstance.get.mockResolvedValueOnce({ data: bundle });

    const { result } = renderHook(
      () => useClinicLocations({ role: ADMIN, orgId: 'org-1' }),
      { wrapper: createWrapper() }
    );

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mockAxiosInstance.get).toHaveBeenCalledWith(
      '/fhir/Location?organization=org-1'
    );
  });

  it('does not fetch for Clinic Admin without orgId', () => {
    const { result } = renderHook(() => useClinicLocations({ role: ADMIN }), {
      wrapper: createWrapper()
    });

    expect(result.current.isFetching).toBe(false);
    expect(mockAxiosInstance.get).not.toHaveBeenCalled();
  });

  it('fetches practitioner locations for Practitioner role', async () => {
    const bundle: Bundle = {
      resourceType: 'Bundle',
      type: 'searchset',
      entry: [
        {
          resource: {
            resourceType: 'PractitionerRole',
            id: 'pr-1',
            practitioner: { reference: 'Practitioner/prac-1' }
          }
        },
        {
          resource: {
            resourceType: 'Location',
            id: 'loc-1',
            name: 'Downtown Clinic'
          }
        }
      ]
    };
    mockAxiosInstance.get.mockResolvedValueOnce({ data: bundle });

    const { result } = renderHook(
      () => useClinicLocations({ role: PRACTITIONER, fhirId: 'prac-1' }),
      { wrapper: createWrapper() }
    );

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toHaveLength(1);
    expect(result.current.data[0].id).toBe('loc-1');
    expect(mockAxiosInstance.get).toHaveBeenCalledWith(
      '/fhir/PractitionerRole?practitioner=prac-1&_include=PractitionerRole:location'
    );
  });

  it('does not fetch for Practitioner without fhirId', () => {
    const { result } = renderHook(
      () => useClinicLocations({ role: PRACTITIONER }),
      { wrapper: createWrapper() }
    );

    expect(result.current.isFetching).toBe(false);
    expect(mockAxiosInstance.get).not.toHaveBeenCalled();
  });

  it('returns empty array when no entries in bundle', async () => {
    const bundle: Bundle = {
      resourceType: 'Bundle',
      type: 'searchset',
      entry: []
    };
    mockAxiosInstance.get.mockResolvedValueOnce({ data: bundle });

    const { result } = renderHook(() => useClinicLocations({ role: PATIENT }), {
      wrapper: createWrapper()
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual([]);
  });

  it('does not fetch for unknown/empty role', () => {
    const { result } = renderHook(
      () => useClinicLocations({ role: 'UnknownRole' }),
      { wrapper: createWrapper() }
    );

    expect(result.current.isFetching).toBe(false);
    expect(mockAxiosInstance.get).not.toHaveBeenCalled();
  });

  it('does not fetch for empty role string', () => {
    const { result } = renderHook(() => useClinicLocations({ role: '' }), {
      wrapper: createWrapper()
    });

    expect(result.current.isFetching).toBe(false);
    expect(mockAxiosInstance.get).not.toHaveBeenCalled();
  });

  it('includes organization param for Patient role', async () => {
    const bundle: Bundle = {
      resourceType: 'Bundle',
      type: 'searchset',
      entry: []
    };
    mockAxiosInstance.get.mockResolvedValueOnce({ data: bundle });

    const { result } = renderHook(
      () =>
        useClinicLocations({
          role: PATIENT,
          organization: 'org-1'
        }),
      { wrapper: createWrapper() }
    );

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mockAxiosInstance.get).toHaveBeenCalledWith(
      '/fhir/Location?organization=org-1'
    );
  });

  it('includes organization param for Guest role', async () => {
    const bundle: Bundle = {
      resourceType: 'Bundle',
      type: 'searchset',
      entry: []
    };
    mockAxiosInstance.get.mockResolvedValueOnce({ data: bundle });

    const { result } = renderHook(
      () =>
        useClinicLocations({
          role: GUEST,
          organization: 'org-1'
        }),
      { wrapper: createWrapper() }
    );

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mockAxiosInstance.get).toHaveBeenCalledWith(
      '/fhir/Location?organization=org-1'
    );
  });

  it('includes province (address-state) param for Patient role', async () => {
    const bundle: Bundle = {
      resourceType: 'Bundle',
      type: 'searchset',
      entry: []
    };
    mockAxiosInstance.get.mockResolvedValueOnce({ data: bundle });

    const { result } = renderHook(
      () =>
        useClinicLocations({
          role: PATIENT,
          province: 'Aceh'
        }),
      { wrapper: createWrapper() }
    );

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mockAxiosInstance.get).toHaveBeenCalledWith(
      '/fhir/Location?address-state=Aceh'
    );
  });

  it('includes both organization and province params', async () => {
    const bundle: Bundle = {
      resourceType: 'Bundle',
      type: 'searchset',
      entry: []
    };
    mockAxiosInstance.get.mockResolvedValueOnce({ data: bundle });

    const { result } = renderHook(
      () =>
        useClinicLocations({
          role: GUEST,
          organization: 'org-1',
          province: 'Aceh',
          city: 'Kabupaten Simeulue'
        }),
      { wrapper: createWrapper() }
    );

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mockAxiosInstance.get).toHaveBeenCalledWith(
      '/fhir/Location?organization=org-1&address-state=Aceh&address-city:contains=Kabupaten%20Simeulue'
    );
  });

  it('includes province for Clinic Admin role', async () => {
    const bundle: Bundle = {
      resourceType: 'Bundle',
      type: 'searchset',
      entry: []
    };
    mockAxiosInstance.get.mockResolvedValueOnce({ data: bundle });

    const { result } = renderHook(
      () =>
        useClinicLocations({
          role: ADMIN,
          orgId: 'org-1',
          province: 'Aceh'
        }),
      { wrapper: createWrapper() }
    );

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mockAxiosInstance.get).toHaveBeenCalledWith(
      '/fhir/Location?organization=org-1&address-state=Aceh'
    );
  });

  it('does not add organization param for Practitioner role', async () => {
    const bundle: Bundle = {
      resourceType: 'Bundle',
      type: 'searchset',
      entry: [
        {
          resource: {
            resourceType: 'PractitionerRole',
            id: 'pr-1',
            practitioner: { reference: 'Practitioner/prac-1' }
          }
        },
        {
          resource: {
            resourceType: 'Location',
            id: 'loc-1',
            name: 'Downtown Clinic'
          }
        }
      ]
    };
    mockAxiosInstance.get.mockResolvedValueOnce({ data: bundle });

    const { result } = renderHook(
      () =>
        useClinicLocations({
          role: PRACTITIONER,
          fhirId: 'prac-1',
          organization: 'org-1',
          province: 'Aceh'
        }),
      { wrapper: createWrapper() }
    );

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mockAxiosInstance.get).toHaveBeenCalledWith(
      '/fhir/PractitionerRole?practitioner=prac-1&_include=PractitionerRole:location'
    );
  });

  it('encodes province name with special characters', async () => {
    const bundle: Bundle = {
      resourceType: 'Bundle',
      type: 'searchset',
      entry: []
    };
    mockAxiosInstance.get.mockResolvedValueOnce({ data: bundle });

    const { result } = renderHook(
      () =>
        useClinicLocations({
          role: PATIENT,
          province: 'Kepulauan Bangka Belitung'
        }),
      { wrapper: createWrapper() }
    );

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mockAxiosInstance.get).toHaveBeenCalledWith(
      '/fhir/Location?address-state=Kepulauan%20Bangka%20Belitung'
    );
  });
});

// ---------------------------------------------------------------------------
// useClinicLocationPractitioners — practitioners at a Location
// ---------------------------------------------------------------------------

describe('useClinicLocationPractitioners', () => {
  const samplePractitionerRole: PractitionerRole = {
    resourceType: 'PractitionerRole',
    id: 'role-1',
    active: true,
    practitioner: { reference: 'Practitioner/prac-1' },
    specialty: [{ text: 'Cardiology' }]
  };

  const samplePractitioner = {
    resourceType: 'Practitioner' as const,
    id: 'prac-1',
    name: [{ given: ['John'], family: 'Doe' }]
  };

  const sampleHealthcareService: HealthcareService = {
    resourceType: 'HealthcareService',
    id: 'hs-1',
    active: true,
    name: 'General Consultation',
    providedBy: { reference: 'Organization/org-1' }
  };

  const sampleOrganization = {
    resourceType: 'Organization' as const,
    id: 'org-1',
    name: 'Main Clinic'
  };

  it('fetches practitioners at a given location', async () => {
    const bundle: Bundle = {
      resourceType: 'Bundle',
      type: 'searchset',
      entry: [
        { resource: samplePractitionerRole },
        { resource: samplePractitioner },
        { resource: sampleHealthcareService },
        { resource: sampleOrganization }
      ]
    };
    mockAxiosInstance.get.mockResolvedValueOnce({ data: bundle });

    const { result } = renderHook(
      () => useClinicLocationPractitioners('loc-1'),
      { wrapper: createWrapper() }
    );

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mockAxiosInstance.get).toHaveBeenCalledWith(
      '/fhir/PractitionerRole?location=loc-1&_include=PractitionerRole:practitioner&_include=PractitionerRole:service&_include=PractitionerRole:organization'
    );
  });

  it('does not fetch when locationId is empty', () => {
    const { result } = renderHook(() => useClinicLocationPractitioners(''), {
      wrapper: createWrapper()
    });

    expect(result.current.isFetching).toBe(false);
    expect(mockAxiosInstance.get).not.toHaveBeenCalled();
  });

  it('returns empty array when bundle has no entries', async () => {
    mockAxiosInstance.get.mockResolvedValueOnce({
      data: { resourceType: 'Bundle', type: 'searchset', entry: [] }
    });

    const { result } = renderHook(
      () => useClinicLocationPractitioners('loc-1'),
      { wrapper: createWrapper() }
    );

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual([]);
  });
});
