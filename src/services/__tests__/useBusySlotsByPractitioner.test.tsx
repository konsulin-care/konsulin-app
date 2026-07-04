/* eslint-disable react/display-name */

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';
import { type AxiosInstance } from 'axios';
import { type ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useBusySlotsByPractitioner } from '../slots';

vi.mock('@/services/api', () => ({
  getAPI: vi.fn()
}));

import { getAPI } from '@/services/api';

const mockAxiosInstance = { get: vi.fn() };

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } }
  });
  return ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(getAPI).mockResolvedValue(
    mockAxiosInstance as unknown as AxiosInstance
  );
});

describe('useBusySlotsByPractitioner', () => {
  const practitionerId = 'prac-123';
  const dateStr = '2026-07-02';

  it('queries slots by Practitioner ID with explicit busy statuses filter', async () => {
    mockAxiosInstance.get.mockResolvedValueOnce({
      data: { resourceType: 'Bundle', entry: [] }
    });

    const { result } = renderHook(
      () => useBusySlotsByPractitioner(practitionerId, dateStr),
      { wrapper: createWrapper() }
    );

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    const calledUrl = mockAxiosInstance.get.mock.calls[0]?.[0] as string;
    expect(calledUrl).toContain('schedule.actor=Practitioner/prac-123');
    expect(calledUrl).toContain('status=busy,busy-unavailable,busy-tentative');
    expect(calledUrl).toContain('start=ge2026-07-02T00%3A00%3A00Z');
    expect(calledUrl).toContain('start=le2026-07-02T23%3A59%3A59Z');
  });

  it('returns busy slot array from Slot entries', async () => {
    mockAxiosInstance.get.mockResolvedValueOnce({
      data: {
        resourceType: 'Bundle',
        entry: [
          {
            resource: {
              resourceType: 'Slot',
              id: 'slot-1',
              start: '2026-07-02T10:00:00+07:00',
              end: '2026-07-02T11:00:00+07:00',
              status: 'busy'
            }
          },
          {
            resource: {
              resourceType: 'Slot',
              id: 'slot-2',
              start: '2026-07-02T14:00:00+07:00',
              end: '2026-07-02T15:00:00+07:00',
              status: 'busy-tentative'
            }
          }
        ]
      }
    });

    const { result } = renderHook(
      () => useBusySlotsByPractitioner(practitionerId, dateStr),
      { wrapper: createWrapper() }
    );

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.data).toEqual([
      { start: '2026-07-02T10:00:00+07:00', end: '2026-07-02T11:00:00+07:00' },
      { start: '2026-07-02T14:00:00+07:00', end: '2026-07-02T15:00:00+07:00' }
    ]);
  });

  it('returns empty array when no entries', async () => {
    mockAxiosInstance.get.mockResolvedValueOnce({
      data: { resourceType: 'Bundle', entry: [] }
    });

    const { result } = renderHook(
      () => useBusySlotsByPractitioner(practitionerId, dateStr),
      { wrapper: createWrapper() }
    );

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.data).toEqual([]);
  });

  it('is disabled when practitionerId is empty', () => {
    const { result } = renderHook(
      () => useBusySlotsByPractitioner('', dateStr),
      { wrapper: createWrapper() }
    );

    expect(result.current.isFetching).toBe(false);
    expect(mockAxiosInstance.get).not.toHaveBeenCalled();
  });

  it('is disabled when dateStr is empty', () => {
    const { result } = renderHook(
      () => useBusySlotsByPractitioner(practitionerId, ''),
      { wrapper: createWrapper() }
    );

    expect(result.current.isFetching).toBe(false);
    expect(mockAxiosInstance.get).not.toHaveBeenCalled();
  });
});
