/* eslint-disable @typescript-eslint/unbound-method */

import type { AxiosInstance } from 'axios';
import type { Bundle } from 'fhir/r4';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/services/api', () => ({
  getAPI: vi.fn()
}));

import { getAPI } from '@/services/api';
import { fetchRoleProfiles } from '@/services/role-profiles';

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

describe('fetchRoleProfiles', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getAPI).mockResolvedValue(mockAxiosInstance);
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  it('fetches one profile per role by identifier and maps name + photo', async () => {
    vi.mocked(mockAxiosInstance.get)
      .mockResolvedValueOnce({ data: practitionerSearchset })
      .mockResolvedValueOnce({ data: emptySearchset });

    const result = await fetchRoleProfiles('user-1', [
      'Practitioner',
      'Patient'
    ]);

    expect(mockAxiosInstance.get).toHaveBeenCalledTimes(2);
    expect(mockAxiosInstance.get).toHaveBeenCalledWith(
      '/fhir/Practitioner?identifier=https://login.konsulin.care/userid|user-1&_elements=name,photo'
    );
    expect(mockAxiosInstance.get).toHaveBeenCalledWith(
      '/fhir/Patient?identifier=https://login.konsulin.care/userid|user-1&_elements=name,photo'
    );
    expect(result).toEqual({
      Practitioner: {
        name: 'Jane Doe',
        photoUrl: 'https://cdn.example.com/jane.jpg'
      },
      Patient: null
    });
  });

  it('returns null for a role whose profile is missing', async () => {
    vi.mocked(mockAxiosInstance.get).mockResolvedValue({
      data: emptySearchset
    });

    const result = await fetchRoleProfiles('user-1', ['Patient']);

    expect(result).toEqual({ Patient: null });
  });

  it('returns null for a role when the request fails', async () => {
    vi.mocked(mockAxiosInstance.get).mockRejectedValue(
      new Error('network down')
    );

    const result = await fetchRoleProfiles('user-1', ['Practitioner']);

    expect(result).toEqual({ Practitioner: null });
  });

  it('URL-encodes the userId in the identifier query', async () => {
    vi.mocked(mockAxiosInstance.get).mockResolvedValue({
      data: emptySearchset
    });

    await fetchRoleProfiles('user id/1', ['Patient']);

    expect(mockAxiosInstance.get).toHaveBeenCalledWith(
      '/fhir/Patient?identifier=https://login.konsulin.care/userid|user%20id%2F1&_elements=name,photo'
    );
  });
});
