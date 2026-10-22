/* eslint-disable @typescript-eslint/unbound-method */

import type { AxiosInstance } from 'axios';
import type { Bundle, Patient, Practitioner } from 'fhir/r4';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/services/api', () => ({
  getAPI: vi.fn()
}));

import { getAPI } from '@/services/api';
import { fetchUserProfilesBundle } from '@/services/role-profiles';

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

const practitionerSearchset: Bundle = {
  resourceType: 'Bundle',
  type: 'searchset',
  total: 1,
  entry: [
    {
      resource: {
        resourceType: 'Practitioner',
        id: 'prac-1',
        name: [{ use: 'official', given: ['Jane'], family: 'Doe' }],
        photo: [{ url: 'https://cdn.example.com/jane.jpg' }]
      }
    }
  ]
};

const emptySearchset: Bundle = {
  resourceType: 'Bundle',
  type: 'searchset',
  total: 0,
  entry: []
};

const fullPatientResource: Patient = {
  resourceType: 'Patient',
  id: 'pat-1',
  identifier: [
    {
      system: 'https://login.konsulin.care/userid',
      value: 'user-1'
    }
  ],
  name: [{ use: 'official', given: ['John'], family: 'Doe' }],
  telecom: [{ system: 'email', value: 'john@example.com' }],
  photo: [{ url: 'https://cdn.example.com/john.jpg' }]
};

const fullPatientSearchset: Bundle = {
  resourceType: 'Bundle',
  type: 'searchset',
  total: 1,
  entry: [{ resource: fullPatientResource }]
};

const unnamedPractitionerResource: Practitioner = {
  resourceType: 'Practitioner',
  id: 'prac-2'
};

const unnamedPractitionerSearchset: Bundle = {
  resourceType: 'Bundle',
  type: 'searchset',
  total: 1,
  entry: [{ resource: unnamedPractitionerResource }]
};

/** Build a batch-response entry for one search request. */
function batchResponseEntry(bundle: Bundle, status = '200 OK') {
  return { resource: bundle, response: { status } };
}

describe('fetchUserProfilesBundle — plain profiles (Patient/Practitioner)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getAPI).mockResolvedValue(mockAxiosInstance);
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  it('fetches the FULL Patient and Practitioner resources (no _elements projection)', async () => {
    vi.mocked(mockAxiosInstance.post).mockResolvedValue({
      data: {
        resourceType: 'Bundle',
        type: 'batch-response',
        entry: [
          batchResponseEntry(fullPatientSearchset),
          batchResponseEntry(practitionerSearchset)
        ]
      }
    });

    const result = await fetchUserProfilesBundle(
      'user-1',
      ['Patient', 'Practitioner'],
      'Patient'
    );

    const postMock = mockAxiosInstance.post as ReturnType<typeof vi.fn>;
    const postedBundle = postMock.mock.calls[0]?.[1] as Bundle;
    expect(
      postedBundle.entry?.some(entry =>
        entry.request?.url.includes('_elements')
      )
    ).toBe(false);

    expect(result.activeProfile).toEqual(fullPatientResource);
    expect(result.roleProfiles).toEqual({
      Patient: {
        name: 'John Doe',
        photoUrl: 'https://cdn.example.com/john.jpg',
        resource: fullPatientResource
      },
      Practitioner: {
        name: 'Jane Doe',
        photoUrl: 'https://cdn.example.com/jane.jpg',
        resource: practitionerSearchset.entry?.[0]?.resource
      }
    });
  });

  it('caches an unnamed Practitioner resource (no name) instead of returning null', async () => {
    vi.mocked(mockAxiosInstance.post).mockResolvedValue({
      data: {
        resourceType: 'Bundle',
        type: 'batch-response',
        entry: [batchResponseEntry(unnamedPractitionerSearchset)]
      }
    });

    const result = await fetchUserProfilesBundle(
      'user-1',
      ['Practitioner'],
      'Practitioner'
    );

    expect(result.activeProfile).toEqual(unnamedPractitionerResource);
    expect(result.roleProfiles.Practitioner).toEqual({
      name: '-',
      photoUrl: '',
      resource: unnamedPractitionerResource
    });
  });

  it('returns null for a role whose entry has no resource', async () => {
    vi.mocked(mockAxiosInstance.post).mockResolvedValue({
      data: {
        resourceType: 'Bundle',
        type: 'batch-response',
        entry: [batchResponseEntry(emptySearchset)]
      }
    });

    const result = await fetchUserProfilesBundle(
      'user-1',
      ['Patient'],
      'Patient'
    );

    expect(result.activeProfile).toBeNull();
    expect(result.roleProfiles).toEqual({ Patient: null });
  });

  it('treats a non-2xx per-entry response as a missing profile', async () => {
    vi.mocked(mockAxiosInstance.post).mockResolvedValue({
      data: {
        resourceType: 'Bundle',
        type: 'batch-response',
        entry: [{ response: { status: '404 Not Found' } }]
      }
    });

    const result = await fetchUserProfilesBundle(
      'user-1',
      ['Practitioner'],
      'Practitioner'
    );

    expect(result.activeProfile).toBeNull();
    expect(result.roleProfiles).toEqual({ Practitioner: null });
  });

  it('URL-encodes the userId in every identifier query', async () => {
    vi.mocked(mockAxiosInstance.post).mockResolvedValue({
      data: {
        resourceType: 'Bundle',
        type: 'batch-response',
        entry: [batchResponseEntry(emptySearchset)]
      }
    });

    await fetchUserProfilesBundle('user id/1', ['Patient'], 'Patient');

    const posted = vi.mocked(mockAxiosInstance.post).mock.calls[0][1] as Bundle;
    expect(posted.entry?.[0]?.request?.url).toBe(
      '/Patient?identifier=https://login.konsulin.care/userid|user%20id%2F1'
    );
  });

  it('appends the active role as a full entry when it is missing from the roles list', async () => {
    vi.mocked(mockAxiosInstance.post).mockResolvedValue({
      data: {
        resourceType: 'Bundle',
        type: 'batch-response',
        entry: [
          batchResponseEntry(practitionerSearchset),
          batchResponseEntry(fullPatientSearchset)
        ]
      }
    });

    const result = await fetchUserProfilesBundle(
      'user-1',
      ['Practitioner'],
      'Patient'
    );

    const posted = vi.mocked(mockAxiosInstance.post).mock.calls[0][1] as Bundle;
    expect(posted.entry).toHaveLength(2);
    expect(posted.entry?.[1]?.request?.url).toBe(
      '/Patient?identifier=https://login.konsulin.care/userid|user-1'
    );
    expect(result.activeProfile).toEqual(fullPatientResource);
    expect(result.roleProfiles.Practitioner).toEqual({
      name: 'Jane Doe',
      photoUrl: 'https://cdn.example.com/jane.jpg',
      resource: practitionerSearchset.entry?.[0]?.resource
    });
  });

  it('propagates a batch POST failure for the caller fallback', async () => {
    vi.mocked(mockAxiosInstance.post).mockRejectedValue(
      new Error('network down')
    );

    await expect(
      fetchUserProfilesBundle('user-1', ['Patient'], 'Patient')
    ).rejects.toThrow('network down');
  });
});
