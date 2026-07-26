import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';
import type { Patient } from 'fhir/r4';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { usePatientProfile } from '../hooks/usePatientProfile';

vi.mock('@/context/auth/authContext', () => ({
  useAuth: vi.fn()
}));

vi.mock('@/services/profile', () => ({
  getProfileById: vi.fn()
}));

import { useAuth } from '@/context/auth/authContext';
import { getProfileById } from '@/services/profile';

describe('usePatientProfile', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } }
    });
    vi.clearAllMocks();
    vi.mocked(useAuth).mockReturnValue({
      isLoading: false,
      state: {
        isAuthenticated: true,
        userInfo: {
          role_name: 'Patient',
          fhirId: 'pat-1',
          fullname: 'John Doe',
          email: 'john@test.com'
        }
      },
      dispatch: vi.fn()
    } as never);
  });

  afterEach(() => {
    queryClient.clear();
  });

  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );

  it('returns loading state initially', () => {
    const { result } = renderHook(() => usePatientProfile('pat-1'), {
      wrapper
    });
    expect(result.current.isLoading).toBe(true);
  });

  it('returns computed profile detail from fetched data', async () => {
    const mockPatient: Patient = {
      resourceType: 'Patient',
      id: 'pat-1',
      name: [{ given: ['John'], family: 'Doe' }],
      birthDate: '1990-06-15',
      gender: 'male',
      telecom: [{ system: 'phone', value: '+628123456789' }],
      address: [
        {
          line: ['123 Main St'],
          city: 'Jakarta',
          country: 'Indonesia'
        }
      ]
    };
    vi.mocked(getProfileById).mockResolvedValue(mockPatient as never);

    const { result } = renderHook(() => usePatientProfile('pat-1'), {
      wrapper
    });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.profileDetail).toEqual(
      expect.arrayContaining([
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
        expect.objectContaining({ key: 'Age', value: expect.any(String) }),
        expect.objectContaining({ key: 'Sex', value: 'Male' }),
        expect.objectContaining({ key: 'Whatsapp', value: '+628123456789' })
      ])
    );
    expect(result.current.initials).toBeDefined();
    expect(result.current.backgroundColor).toBeDefined();
  });
});
