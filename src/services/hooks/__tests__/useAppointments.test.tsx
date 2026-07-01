import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';
import { type Bundle, type BundleEntry } from 'fhir/r4';
import { type ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useAppointments } from '../useAppointments';

const mockAPI = vi.fn();

vi.mock('@/services/api', () => ({
  getAPI: vi.fn(() =>
    Promise.resolve({
      get: mockAPI
    })
  )
}));

function buildLink(url: string | null, relation: string) {
  return url ? { url, relation } : undefined;
}

function buildPageTokenUrl(token: string): string {
  return `http://localhost/fhir/Appointment?pageToken=${token}`;
}

function buildPage(entries: number, offset: number): Bundle {
  const items: BundleEntry[] = [];
  for (let i = 0; i < entries; i++) {
    items.push({
      resource: {
        resourceType: 'Appointment',
        id: `appt-${offset + i}`,
        status: 'booked',
        slot: [{ reference: `Slot/slot-${offset + i}` }],
        participant: [
          {
            actor: { reference: `Patient/pat-1` },
            status: 'accepted'
          }
        ]
      }
    });
  }

  const total = entries + offset;
  const hasNext = offset + entries < 50; // simulate 50 total
  return {
    resourceType: 'Bundle',
    type: 'searchset',
    total,
    entry: items,
    link: hasNext
      ? [buildLink(buildPageTokenUrl(`${offset + entries}`), 'next')].filter(
          Boolean
        )
      : []
  };
}

const createWrapper = (queryClient: QueryClient) => {
  const Wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
  Wrapper.displayName = 'QueryWrapper';
  return Wrapper;
};

describe('useAppointments', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } }
    });
    mockAPI.mockReset();
  });

  it('fetches first page of appointments for a patient', async () => {
    mockAPI.mockResolvedValueOnce({ data: buildPage(10, 0) });

    const { result } = renderHook(() => useAppointments('Patient', 'pat-1'), {
      wrapper: createWrapper(queryClient)
    });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.data?.pages[0].total).toBe(10);
    expect(result.current.hasNextPage).toBe(true);
  });

  it('constructs correct FHIR query for Patient role', async () => {
    mockAPI.mockResolvedValueOnce({ data: buildPage(10, 0) });

    renderHook(() => useAppointments('Patient', 'pat-1'), {
      wrapper: createWrapper(queryClient)
    });

    await waitFor(() => {
      expect(mockAPI).toHaveBeenCalled();
    });

    const url = mockAPI.mock.calls[0][0] as string;
    expect(url).toContain('actor=Patient/pat-1');
    expect(url).toContain('_count=10');
    expect(url).toContain('_sort=-_lastUpdated');
    expect(url).toContain('_include=Appointment:slot');
    expect(url).toContain('_include=Appointment:actor:PractitionerRole');
    expect(url).toContain('_include:iterate=PractitionerRole:practitioner');
  });

  it('constructs correct FHIR query for Practitioner role', async () => {
    mockAPI.mockResolvedValueOnce({ data: buildPage(10, 0) });

    renderHook(() => useAppointments('Practitioner', 'prac-1'), {
      wrapper: createWrapper(queryClient)
    });

    await waitFor(() => {
      expect(mockAPI).toHaveBeenCalled();
    });

    const url = mockAPI.mock.calls[0][0] as string;
    expect(url).toContain('actor=Practitioner/prac-1');
    expect(url).toContain('_count=10');
    expect(url).toContain('_sort=-_lastUpdated');
    expect(url).toContain('_include=Appointment:slot');
    expect(url).toContain('_include=Appointment:actor:Patient');
  });

  it('fetches next page when requested', async () => {
    const firstPage = buildPage(10, 0);
    const secondPage = buildPage(10, 10);

    mockAPI.mockResolvedValueOnce({ data: firstPage });
    mockAPI.mockResolvedValueOnce({ data: secondPage });

    const { result } = renderHook(() => useAppointments('Patient', 'pat-1'), {
      wrapper: createWrapper(queryClient)
    });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    // Verify first page loaded and hasNextPage is true
    expect(result.current.hasNextPage).toBe(true);
    expect(result.current.data?.pages.length).toBe(1);

    // Call fetchNextPage and wait for next page
    await result.current.fetchNextPage();

    await waitFor(() => {
      expect(result.current.data?.pages.length).toBe(2);
    });

    expect(mockAPI).toHaveBeenCalledTimes(2);
    expect(result.current.data?.pages[1].total).toBe(20);
  });

  it('returns hasNextPage=false when no next link', async () => {
    const lastPage = buildPage(10, 40);
    // Override to simulate last page (no link)
    lastPage.link = [];

    mockAPI.mockResolvedValueOnce({ data: lastPage });

    const { result } = renderHook(() => useAppointments('Patient', 'pat-1'), {
      wrapper: createWrapper(queryClient)
    });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.hasNextPage).toBe(false);
  });

  it('disables query when fhirId is empty', async () => {
    const { result } = renderHook(() => useAppointments('Patient', ''), {
      wrapper: createWrapper(queryClient)
    });

    // Wait a tick for React Query to settle
    await new Promise(resolve => setTimeout(resolve, 100));

    expect(mockAPI).not.toHaveBeenCalled();
    expect(result.current.data).toBeUndefined();
    expect(result.current.hasNextPage).toBeUndefined();
  });
});
