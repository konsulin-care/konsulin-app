import { renderHook } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { describe, expect, it, vi } from 'vitest';
import type { ReactNode } from 'react';

vi.mock('../api', () => ({
  getAPI: vi.fn()
}));

import { getAPI } from '../api';
import { useCreateSlot } from '../api/appointments';

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } }
  });
  return ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
}

describe('useCreateSlot', () => {
  it('posts a Slot resource to /fhir/Slot with correct payload', async () => {
    const mockPost = vi.fn().mockResolvedValue({
      data: {
        resourceType: 'Slot',
        id: 'slot-123',
        status: 'busy-tentative',
        schedule: { reference: 'Schedule/sched-1' },
        start: '2026-07-15T10:00:00+07:00',
        end: '2026-07-15T10:30:00+07:00'
      }
    });
    vi.mocked(getAPI).mockResolvedValue({
      post: mockPost
    } as any);

    const { result } = renderHook(() => useCreateSlot(), {
      wrapper: createWrapper()
    });

    const payload = {
      scheduleReference: 'Schedule/sched-1',
      start: '2026-07-15T10:00:00+07:00',
      end: '2026-07-15T10:30:00+07:00'
    };

    const response = await result.current.mutateAsync(payload);

    expect(mockPost).toHaveBeenCalledWith('/fhir/Slot', {
      resourceType: 'Slot',
      status: 'busy-tentative',
      schedule: { reference: 'Schedule/sched-1' },
      start: '2026-07-15T10:00:00+07:00',
      end: '2026-07-15T10:30:00+07:00'
    });
    expect(response.id).toBe('slot-123');
    expect(response.status).toBe('busy-tentative');
  });
});
