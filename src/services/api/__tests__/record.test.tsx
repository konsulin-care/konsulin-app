/* eslint-disable @typescript-eslint/no-unsafe-argument */
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useDeleteJournal, useUpdateJournal } from '../record';

vi.mock('@/services/api', () => ({
  getAPI: vi.fn()
}));

import { getAPI } from '@/services/api';

describe('useDeleteJournal', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('calls DELETE /fhir/Observation/{id} on mutation', async () => {
    const mockDelete = vi.fn().mockResolvedValue({});
    vi.mocked(getAPI).mockResolvedValue({
      delete: mockDelete
    } as any);

    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } }
    });

    const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries');

    const { result } = renderHook(() => useDeleteJournal(), {
      wrapper: ({ children }: { children: React.ReactNode }) => (
        <QueryClientProvider client={queryClient}>
          {children}
        </QueryClientProvider>
      )
    });

    result.current.mutate('journal-123');

    await waitFor(() => {
      expect(mockDelete).toHaveBeenCalledWith('/fhir/Observation/journal-123');
    });

    await waitFor(() => {
      expect(invalidateSpy).toHaveBeenCalledWith({
        queryKey: ['journals']
      });
      expect(invalidateSpy).toHaveBeenCalledWith({
        queryKey: ['single-record', 'journal-123']
      });
    });
  });
});

describe('useUpdateJournal', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('invalidates journals and single-record queries on success', async () => {
    const mockPut = vi.fn().mockResolvedValue({ data: {} });
    vi.mocked(getAPI).mockResolvedValue({
      put: mockPut
    } as any);

    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } }
    });

    const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries');

    const { result } = renderHook(() => useUpdateJournal(), {
      wrapper: ({ children }: { children: React.ReactNode }) => (
        <QueryClientProvider client={queryClient}>
          {children}
        </QueryClientProvider>
      )
    });

    result.current.mutate({
      id: 'journal-456',
      valueString: 'Updated',
      resourceType: 'Observation',
      note: [{ text: 'Notes' }],
      effectiveDateTime: '2024-01-01T00:00:00Z',
      status: 'amended',
      code: {
        coding: [
          {
            system: 'https://loinc.org',
            code: '51855-5',
            display: 'Patient Note'
          }
        ]
      },
      subject: { reference: 'Patient/test' },
      performer: [{ reference: 'Patient/test' }]
    });

    await waitFor(() => {
      expect(mockPut).toHaveBeenCalledWith(
        '/fhir/Observation/journal-456',
        expect.any(Object)
      );
    });

    await waitFor(() => {
      expect(invalidateSpy).toHaveBeenCalledWith({
        queryKey: ['journals']
      });
      expect(invalidateSpy).toHaveBeenCalledWith({
        queryKey: ['single-record', 'journal-456']
      });
    });
  });
});
