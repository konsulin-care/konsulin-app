/* eslint-disable @typescript-eslint/no-unsafe-argument */
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useDeleteJournal } from '../record';

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
  });
});
