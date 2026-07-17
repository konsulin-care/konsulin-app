/* eslint-disable @typescript-eslint/unbound-method */

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';
import type { AxiosInstance } from 'axios';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/services/api', async () => {
  const actual =
    await vi.importActual<Record<string, unknown>>('@/services/api');
  return {
    ...actual,
    getAPI: vi.fn()
  };
});

import { getAPI } from '@/services/api';
import type { Bundle, HealthcareService } from 'fhir/r4';
import { usePractitionerRoleHealthcareServices } from '../clinic-practitioners';

const mockAxiosInstance = {
  get: vi.fn(),
  post: vi.fn(),
  put: vi.fn(),
  delete: vi.fn(),
  patch: vi.fn(),
  request: vi.fn(),
  defaults: {},
  interceptors: {
    request: { use: vi.fn(), eject: vi.fn(), clear: vi.fn() },
    response: { use: vi.fn(), eject: vi.fn(), clear: vi.fn() }
  },
  getUri: vi.fn()
} as unknown as AxiosInstance;

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } }
  });
  return function Wrapper({ children }: { children: React.ReactNode }) {
    return (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );
  };
}

const sampleService: HealthcareService = {
  resourceType: 'HealthcareService',
  id: 'service-1',
  active: true,
  name: 'General Consultation',
  providedBy: { reference: 'Organization/org-1' }
};

const sampleBundle: Bundle = {
  resourceType: 'Bundle',
  type: 'searchset',
  entry: [
    {
      resource: {
        resourceType: 'PractitionerRole',
        id: 'role-1',
        active: true,
        healthcareService: [{ reference: 'HealthcareService/service-1' }]
      }
    },
    {
      resource: sampleService
    }
  ]
};

describe('usePractitionerRoleHealthcareServices', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getAPI).mockResolvedValue(
      mockAxiosInstance as unknown as AxiosInstance
    );
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  it('fetches HealthcareService resources for a practitioner role', async () => {
    vi.mocked(mockAxiosInstance.get).mockResolvedValue({
      data: sampleBundle
    });

    const { result } = renderHook(
      () => usePractitionerRoleHealthcareServices('role-1'),
      { wrapper: createWrapper() }
    );

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(result.current.data).toEqual([sampleService]);
    expect(mockAxiosInstance.get).toHaveBeenCalledWith(
      '/fhir/PractitionerRole?_id=role-1&_include=PractitionerRole:service'
    );
  });

  it('returns empty array when no HealthcareService entries exist', async () => {
    const bundleWithoutServices: Bundle = {
      resourceType: 'Bundle',
      type: 'searchset',
      entry: [
        {
          resource: {
            resourceType: 'PractitionerRole',
            id: 'role-2',
            active: true
          }
        }
      ]
    };
    vi.mocked(mockAxiosInstance.get).mockResolvedValue({
      data: bundleWithoutServices
    });

    const { result } = renderHook(
      () => usePractitionerRoleHealthcareServices('role-2'),
      { wrapper: createWrapper() }
    );

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(result.current.data).toEqual([]);
  });

  it('returns empty array when no roleId provided', () => {
    const { result } = renderHook(
      () => usePractitionerRoleHealthcareServices(''),
      { wrapper: createWrapper() }
    );

    expect(result.current.isFetching).toBe(false);
    expect(result.current.data).toBeUndefined();
  });
});
