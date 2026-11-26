import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useStudyById } from '../research-study';

const fetchStudiesByIds = vi.fn();

vi.mock('../research-catalogue', () => ({
  fetchStudiesByIds: (...args: unknown[]) => fetchStudiesByIds(...args)
}));
vi.mock('../../api', () => ({
  getAPI: () => Promise.resolve({})
}));

function wrapper({ children }: { children: ReactNode }) {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } }
  });
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}

describe('useStudyById', () => {
  beforeEach(() => fetchStudiesByIds.mockReset());

  it('loads the study by id with its batches', async () => {
    const progress = { study: { id: 's1', status: 'completed' }, batches: [] };
    fetchStudiesByIds.mockResolvedValue([progress]);
    const { result } = renderHook(() => useStudyById('s1'), { wrapper });
    await waitFor(() => expect(result.current.data).toEqual(progress));
    expect(fetchStudiesByIds.mock.calls[0][1]).toEqual(['s1']);
  });

  it('resolves to null when nothing is found', async () => {
    fetchStudiesByIds.mockResolvedValue([]);
    const { result } = renderHook(() => useStudyById('x'), { wrapper });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toBeNull();
  });
});
