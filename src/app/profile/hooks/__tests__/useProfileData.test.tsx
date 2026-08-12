import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';
import type { Patient, Person, Practitioner } from 'fhir/r4';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/services/profile', () => ({
  getProfileById: vi.fn()
}));

import { getProfileById } from '@/services/profile';
import { useProfileData } from '../useProfileData';

const patientFixture: Patient = {
  resourceType: 'Patient',
  id: 'pat-1',
  active: true,
  name: [{ use: 'official', given: ['John', 'Magnificent'], family: 'Doe' }],
  gender: 'male',
  birthDate: '1990-03-12',
  telecom: [
    { system: 'email', value: 'john@konsulin.care' },
    { system: 'phone', value: '+628123456789' }
  ],
  address: [
    {
      use: 'home',
      line: ['Jl. Merdeka 12'],
      district: 'Kebayoran Baru',
      city: 'Jakarta Selatan',
      state: 'DKI Jakarta',
      postalCode: '12120',
      country: 'ID'
    }
  ],
  communication: [
    {
      language: {
        coding: [
          { system: 'urn:ietf:bcp:47', code: 'id', display: 'Indonesian' }
        ]
      }
    }
  ],
  photo: [{ url: 'https://cdn.example.com/photo.jpg' }]
};

const practitionerFixture: Practitioner = {
  resourceType: 'Practitioner',
  id: 'pra-1',
  active: true,
  name: [{ use: 'official', given: ['Jane'], family: 'Smith' }],
  gender: 'female',
  birthDate: '1985-07-01',
  telecom: [{ system: 'email', value: 'jane@konsulin.care' }]
};

const personFixture: Person = {
  resourceType: 'Person',
  id: 'clinic-1',
  active: true,
  name: [{ use: 'official', given: ['Alex'], family: 'Brown' }],
  gender: 'other',
  birthDate: '1978-11-20',
  telecom: [{ system: 'phone', value: '+62811112222333' }]
};

describe('useProfileData', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } }
    });
    vi.clearAllMocks();
  });

  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );

  it('resolves the FHIR resource type from the role name', async () => {
    vi.mocked(getProfileById).mockResolvedValue(practitionerFixture);

    const { result } = renderHook(
      () => useProfileData('pra-1', 'Practitioner'),
      { wrapper }
    );

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(getProfileById).toHaveBeenCalledWith('pra-1', 'Practitioner');
  });

  it('uses the shared profile-data query key for cache invalidation', async () => {
    vi.mocked(getProfileById).mockResolvedValue(patientFixture);

    const { result } = renderHook(() => useProfileData('pat-1', 'Patient'), {
      wrapper
    });

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(queryClient.getQueryData(['profile-data', 'pat-1'])).toEqual(
      patientFixture
    );
  });

  it('collapses the FHIR name into identity display parts', async () => {
    vi.mocked(getProfileById).mockResolvedValue(patientFixture);

    const { result } = renderHook(() => useProfileData('pat-1', 'Patient'), {
      wrapper
    });

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.identity.displayName).toBe('John Magnificent Doe');
    expect(result.current.identity.given).toEqual(['John', 'Magnificent']);
    expect(result.current.identity.family).toBe('Doe');
    expect(result.current.identity.photoUrl).toBe(
      'https://cdn.example.com/photo.jpg'
    );
  });

  it('builds personal-info, contact and address sections for Patient', async () => {
    vi.mocked(getProfileById).mockResolvedValue(patientFixture);

    const { result } = renderHook(() => useProfileData('pat-1', 'Patient'), {
      wrapper
    });

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    const ids = result.current.sections.map(s => s.id);
    expect(ids).toEqual(['personal-info', 'contact', 'address']);

    const personalInfo = result.current.sections[0];
    const rowKeys = personalInfo.rows.map(r => r.id);
    expect(rowKeys).toContain('gender');
    expect(rowKeys).toContain('birthDate');
    expect(rowKeys).toContain('language');
    expect(personalInfo.rows.find(r => r.id === 'language')?.value).toBe(
      'Indonesian'
    );
  });

  it('includes the language row for Practitioner', async () => {
    const withLanguage: Practitioner = {
      ...practitionerFixture,
      communication: [{ coding: [{ code: 'en', display: 'English' }] }]
    };
    vi.mocked(getProfileById).mockResolvedValue(withLanguage);

    const { result } = renderHook(
      () => useProfileData('pra-1', 'Practitioner'),
      { wrapper }
    );

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    const personalInfo = result.current.sections[0];
    expect(personalInfo.rows.find(r => r.id === 'language')?.value).toBe(
      'English'
    );
  });

  it('omits the language row for Person-based roles', async () => {
    vi.mocked(getProfileById).mockResolvedValue(personFixture);

    const { result } = renderHook(
      () => useProfileData('clinic-1', 'Clinic Admin'),
      { wrapper }
    );

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(getProfileById).toHaveBeenCalledWith('clinic-1', 'Person');

    const personalInfo = result.current.sections[0];
    expect(personalInfo.rows.map(r => r.id)).not.toContain('language');
  });

  it('shows "-" placeholders for missing personal fields', async () => {
    vi.mocked(getProfileById).mockResolvedValue({
      resourceType: 'Person',
      id: 'clinic-1',
      active: true
    });
    const { result } = renderHook(
      () => useProfileData('clinic-1', 'Clinic Admin'),
      { wrapper }
    );

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    const personalInfo = result.current.sections[0];
    expect(personalInfo.rows.find(r => r.id === 'gender')?.value).toBe('-');
    expect(personalInfo.rows.find(r => r.id === 'birthDate')?.value).toBe('-');
  });
});
