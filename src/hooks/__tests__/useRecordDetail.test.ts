import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/services/api', () => ({
  getAPI: vi.fn()
}));

import { getAPI } from '@/services/api';
import { useRecordDetail } from '../useRecordDetail';

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } }
  });
  const Wrapper = ({ children }: { children: ReactNode }) =>
    React.createElement(QueryClientProvider, { client: queryClient }, children);
  Wrapper.displayName = 'TestWrapper';
  return Wrapper;
}

describe('useRecordDetail', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('fetches a single resource by type and ID', async () => {
    const apiMock = {
      get: vi.fn().mockResolvedValue({
        data: { resourceType: 'Observation', id: 'obs-1', status: 'final' }
      })
    };
    vi.mocked(getAPI).mockResolvedValue(apiMock);

    const { result } = renderHook(
      () => useRecordDetail('Observation', 'obs-1'),
      { wrapper: createWrapper() }
    );

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(apiMock.get).toHaveBeenCalledWith('/fhir/Observation/obs-1');
    expect(result.current.data?.resourceType).toBe('Observation');
    expect(result.current.data?.id).toBe('obs-1');
  });

  it('does not fetch when resourceId is null', async () => {
    const apiMock = { get: vi.fn() };
    vi.mocked(getAPI).mockResolvedValue(apiMock);

    renderHook(() => useRecordDetail('Observation', null), {
      wrapper: createWrapper()
    });

    await new Promise(resolve => setTimeout(resolve, 200));
    expect(apiMock.get).not.toHaveBeenCalled();
  });

  it('does not fetch when resourceType is empty', async () => {
    const apiMock = { get: vi.fn() };
    vi.mocked(getAPI).mockResolvedValue(apiMock);

    renderHook(() => useRecordDetail('', 'obs-1'), {
      wrapper: createWrapper()
    });

    await new Promise(resolve => setTimeout(resolve, 200));
    expect(apiMock.get).not.toHaveBeenCalled();
  });
});
