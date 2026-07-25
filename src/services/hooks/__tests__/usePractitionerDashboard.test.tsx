/* eslint-disable react/display-name */

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';
import { format } from 'date-fns';
import type { Bundle, BundleEntry } from 'fhir/r4';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { usePractitionerDashboard } from '../usePractitionerDashboard';

vi.mock('@/services/api', () => ({
  getAPI: vi.fn()
}));

import { getAPI } from '@/services/api';

function createWrapper(queryClient: QueryClient) {
  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
}

const mockAppointmentEntry = (
  id: string,
  start: string,
  participantActors: string[]
) => ({
  resource: {
    resourceType: 'Appointment',
    status: 'booked',
    id,
    start,
    slot: [{ reference: 'Slot/slot-1' }],
    participant: participantActors.map(ref => ({
      actor: { reference: ref },
      status: 'accepted'
    }))
  }
});

const mockMonthBundle: Bundle = {
  resourceType: 'Bundle',
  type: 'searchset',
  total: 2,
  entry: [
    mockAppointmentEntry('appt-1', '2026-07-04T02:00:00.000Z', [
      'Patient/pat-1',
      'Location/loc-1',
      'PractitionerRole/role-1'
    ]) as unknown as BundleEntry,
    mockAppointmentEntry('appt-2', '2026-07-04T03:00:00.000Z', [
      'Patient/pat-2',
      'Location/loc-2',
      'PractitionerRole/role-2'
    ]) as unknown as BundleEntry,
    {
      resource: {
        resourceType: 'Slot',
        id: 'slot-1',
        start: '2026-07-04T02:00:00.000Z',
        end: '2026-07-04T02:30:00.000Z',
        status: 'free',
        schedule: { reference: 'Schedule/sched-1' }
      }
    },
    {
      resource: {
        resourceType: 'Patient',
        id: 'pat-1',
        name: [{ given: ['John'], family: 'Doe' }],
        telecom: [{ system: 'email', value: 'john@test.com' }]
      }
    },
    {
      resource: {
        resourceType: 'Patient',
        id: 'pat-2',
        name: [{ given: ['Jane'], family: 'Smith' }],
        telecom: [{ system: 'email', value: 'jane@test.com' }]
      }
    },
    {
      resource: {
        resourceType: 'Location',
        id: 'loc-1',
        name: 'Clinic A'
      }
    },
    {
      resource: {
        resourceType: 'Location',
        id: 'loc-2',
        name: 'Clinic B'
      }
    },
    {
      resource: {
        resourceType: 'PractitionerRole',
        id: 'role-1',
        availableTime: [{ daysOfWeek: ['mon', 'wed', 'fri'] }]
      }
    },
    {
      resource: {
        resourceType: 'PractitionerRole',
        id: 'role-2',
        availableTime: [{ daysOfWeek: ['tue', 'thu'] }]
      }
    }
  ]
};

describe('usePractitionerDashboard', () => {
  let queryClient: QueryClient;
  let mockGet: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } }
    });
    mockGet = vi.fn();
    vi.mocked(getAPI).mockResolvedValue({
      get: mockGet,
      post: vi.fn()
    } as unknown as Awaited<ReturnType<typeof getAPI>>);
    // Default mock: month query returns the month bundle
    mockGet.mockResolvedValue({ data: mockMonthBundle });
  });

  afterEach(() => {
    queryClient.clear();
  });

  it('maps each appointment to exactly one dayDot entry (no flattening)', async () => {
    const { result } = renderHook(
      () =>
        usePractitionerDashboard({
          practitionerId: 'pract-1',
          monthStart: new Date('2026-07-01'),
          monthEnd: new Date('2026-07-31')
        }),
      { wrapper: createWrapper(queryClient) }
    );

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    const dots = result.current.dayDots?.get('2026-07-04');
    expect(dots).toBeDefined();
    expect(dots).toHaveLength(2);
    expect(dots).toEqual(
      expect.arrayContaining([expect.any(String), expect.any(String)])
    );
  });

  it('returns parsed month data including dayDots and colorLegend', async () => {
    const { result } = renderHook(
      () =>
        usePractitionerDashboard({
          practitionerId: 'pract-1',
          monthStart: new Date('2026-07-01'),
          monthEnd: new Date('2026-07-31')
        }),
      { wrapper: createWrapper(queryClient) }
    );

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.dayDots).toBeDefined();
    // Both appointments are on 2026-07-04
    const dots = result.current.dayDots?.get('2026-07-04');
    expect(dots).toBeDefined();
    expect(dots).toHaveLength(2);

    const colorLegend = result.current.colorLegend;
    expect(colorLegend).toHaveLength(2);
    expect(colorLegend[0].name).toBe('Clinic A');
    expect(colorLegend[1].name).toBe('Clinic B');
  });

  it('fires day query when selectedDate is provided', async () => {
    const { result } = renderHook(
      () =>
        usePractitionerDashboard({
          practitionerId: 'pract-1',
          monthStart: new Date('2026-07-01'),
          monthEnd: new Date('2026-07-31'),
          selectedDate: new Date('2026-07-04')
        }),
      { wrapper: createWrapper(queryClient) }
    );

    // Wait for day query to fire and resolve
    await waitFor(() => {
      expect(result.current.isDayLoading).toBe(false);
    });

    // Verify the day query URL contains the correct date
    const dateStr = format(new Date('2026-07-04'), "yyyy-MM-dd'T'00:");
    const dayCalls = mockGet.mock.calls
      .filter(
        (call: unknown): call is [string, ...unknown[]] =>
          Array.isArray(call) && typeof call[0] === 'string'
      )
      .filter(
        ([url]) =>
          url.includes('/fhir/Appointment') &&
          url.includes(`slot.start=ge${dateStr}`)
      );
    expect(dayCalls.length).toBeGreaterThanOrEqual(1);

    // Verify day sessions are returned
    expect(result.current.daySessions).toBeDefined();
    expect(result.current.daySessions.length).toBeGreaterThan(0);
  });

  it('does not fire day query when selectedDate is not provided', async () => {
    const { result } = renderHook(
      () =>
        usePractitionerDashboard({
          practitionerId: 'pract-1',
          monthStart: new Date('2026-07-01'),
          monthEnd: new Date('2026-07-31')
        }),
      { wrapper: createWrapper(queryClient) }
    );

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.daySessions).toBeDefined();
    expect(result.current.daySessions).toHaveLength(0);
  });

  it('keeps isLoading false when month changes (keepPreviousData)', async () => {
    const { result, rerender } = renderHook(
      ({ monthStart, monthEnd }: { monthStart: Date; monthEnd: Date }) =>
        usePractitionerDashboard({
          practitionerId: 'pract-1',
          monthStart,
          monthEnd
        }),
      {
        initialProps: {
          monthStart: new Date('2026-07-01'),
          monthEnd: new Date('2026-07-31')
        },
        wrapper: createWrapper(queryClient)
      }
    );

    // Wait for initial month query to complete
    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    const callsBefore = mockGet.mock.calls.length;
    expect(callsBefore).toBeGreaterThanOrEqual(1);

    // Simulate month navigation: change monthStart/monthEnd
    rerender({
      monthStart: new Date('2026-08-01'),
      monthEnd: new Date('2026-08-31')
    });

    // isLoading must stay false — keepPreviousData keeps old data as placeholder
    expect(result.current.isLoading).toBe(false);

    // A new API call should be in-flight for the new month
    await waitFor(() => {
      expect(mockGet.mock.calls.length).toBeGreaterThan(callsBefore);
    });
  });

  it('computes available days from merged PractitionerRole availableTime', async () => {
    const { result } = renderHook(
      () =>
        usePractitionerDashboard({
          practitionerId: 'pract-1',
          monthStart: new Date('2026-07-01'),
          monthEnd: new Date('2026-07-31')
        }),
      { wrapper: createWrapper(queryClient) }
    );

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.availableTime).toHaveLength(2);
    expect(result.current.listAvailableDate).toBeDefined();
    // July 2026 starts on Wednesday (mon/wed/fri + tue/thu => weekdays)
    expect(result.current.listAvailableDate.length).toBeGreaterThan(0);
  });
});
