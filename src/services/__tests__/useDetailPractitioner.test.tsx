import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';
import type { AxiosInstance } from 'axios';
import { type ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useDetailPractitioner } from '../clinic';

vi.mock('@/services/api', () => ({
  getAPI: vi.fn()
}));

import { getAPI } from '@/services/api';

const mockAxiosInstance = { get: vi.fn() };

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } }
  });
  const Wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
  Wrapper.displayName = 'Wrapper';
  return Wrapper;
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(getAPI).mockResolvedValue(
    mockAxiosInstance as unknown as AxiosInstance
  );
});

describe('useDetailPractitioner', () => {
  const practitionerRoleId = 'role-123';
  const baseBundle = {
    resourceType: 'Bundle' as const,
    entry: [
      {
        resource: {
          resourceType: 'PractitionerRole',
          id: 'role-123',
          practitioner: { reference: 'Practitioner/prac-1' },
          organization: { reference: 'Organization/org-1' },
          specialty: [{ text: 'Cardiology' }]
        }
      },
      {
        resource: {
          resourceType: 'Practitioner',
          id: 'prac-1',
          name: [{ text: 'Dr. Sarah Chen' }],
          photo: [{ url: 'https://example.com/photo.jpg' }]
        }
      },
      {
        resource: {
          resourceType: 'Organization',
          id: 'org-1',
          name: 'Jakarta Heart Clinic'
        }
      }
    ]
  };

  it('returns practitioner resource in newData', async () => {
    mockAxiosInstance.get.mockResolvedValueOnce({ data: baseBundle });

    const { result } = renderHook(
      () => useDetailPractitioner(practitionerRoleId),
      { wrapper: createWrapper() }
    );

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.newData?.practitioner).toBeDefined();
    expect(result.current.newData?.practitioner?.id).toBe('prac-1');
    expect(result.current.newData?.practitioner?.name).toBeDefined();
  });

  it('returns undefined practitioner when not in bundle', async () => {
    const bundleWithoutPractitioner = {
      resourceType: 'Bundle' as const,
      entry: [
        {
          resource: {
            resourceType: 'PractitionerRole',
            id: 'role-123',
            practitioner: { reference: 'Practitioner/prac-1' },
            specialty: [{ text: 'Cardiology' }]
          }
        }
      ]
    };

    mockAxiosInstance.get.mockResolvedValueOnce({
      data: bundleWithoutPractitioner
    });

    const { result } = renderHook(
      () => useDetailPractitioner(practitionerRoleId),
      { wrapper: createWrapper() }
    );

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.newData?.practitioner).toBeUndefined();
  });
});
