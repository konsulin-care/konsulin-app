/* eslint-disable @typescript-eslint/unbound-method */

import {
  ClinicAdminRoleCode,
  LoginIdentifierSystem,
  ResearcherRoleCode
} from '@/constants/practitioner-roles';
import type { AxiosInstance } from 'axios';
import type { Bundle, Practitioner, PractitionerRole } from 'fhir/r4';
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

const emptySearchset: Bundle = {
  resourceType: 'Bundle',
  type: 'searchset',
  total: 0,
  entry: []
};

const fullPractitionerResource: Practitioner = {
  resourceType: 'Practitioner',
  id: 'prac-1',
  identifier: [
    {
      system: 'https://login.konsulin.care/userid',
      value: 'user-1'
    }
  ],
  name: [{ use: 'official', given: ['Jane'], family: 'Doe' }],
  telecom: [{ system: 'email', value: 'jane@example.com' }],
  photo: [{ url: 'https://cdn.example.com/jane.jpg' }]
};

/**
 * Build a PractitionerRole searchset as returned by the verified
 * `_include=PractitionerRole:practitioner` query: one match entry (the role,
 * projected to organization) and one include entry (the full Practitioner).
 */
function practitionerRoleSearchset({
  roleId = 'role-1',
  organizationId,
  practitioner = fullPractitionerResource
}: {
  roleId?: string;
  organizationId?: string;
  practitioner?: Practitioner;
}): Bundle {
  const role: PractitionerRole = {
    resourceType: 'PractitionerRole',
    id: roleId,
    practitioner: { reference: `Practitioner/${practitioner.id}` },
    ...(organizationId
      ? { organization: { reference: `Organization/${organizationId}` } }
      : {})
  };
  return {
    resourceType: 'Bundle',
    type: 'searchset',
    total: 1,
    entry: [
      { resource: role, search: { mode: 'match' } },
      { resource: practitioner, search: { mode: 'include' } }
    ]
  };
}

/** Build a batch-response entry for one search request. */
function batchResponseEntry(bundle: Bundle, status = '200 OK') {
  return { resource: bundle, response: { status } };
}

/** Expected verified PractitionerRole URL for the given role code. */
function roleCodedUrl(roleCode: { system: string; code: string }): string {
  const params = [
    `role=${roleCode.system}|${roleCode.code}`,
    '_include=PractitionerRole:practitioner',
    `practitioner.identifier=${LoginIdentifierSystem}|user-1`,
    '_elements=organization'
  ];
  return `/PractitionerRole?${params.join('&')}`;
}

describe('fetchUserProfilesBundle — role-coded profiles (Clinic Admin/Researcher)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getAPI).mockResolvedValue(mockAxiosInstance);
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  it('builds the verified PractitionerRole URL for Clinic Admin and Researcher entries', async () => {
    vi.mocked(mockAxiosInstance.post).mockResolvedValue({
      data: {
        resourceType: 'Bundle',
        type: 'batch-response',
        entry: [
          batchResponseEntry(emptySearchset),
          batchResponseEntry(emptySearchset)
        ]
      }
    });

    await fetchUserProfilesBundle(
      'user-1',
      ['Clinic Admin', 'Researcher'],
      'Clinic Admin'
    );

    expect(mockAxiosInstance.post).toHaveBeenCalledTimes(1);
    expect(mockAxiosInstance.post).toHaveBeenCalledWith('/fhir', {
      resourceType: 'Bundle',
      type: 'batch',
      entry: [
        {
          request: {
            method: 'GET',
            url: roleCodedUrl(ClinicAdminRoleCode)
          }
        },
        {
          request: {
            method: 'GET',
            url: roleCodedUrl(ResearcherRoleCode)
          }
        }
      ]
    });
  });

  it('extracts the organization id from the PractitionerRole match, stripping the Organization/ prefix', async () => {
    const searchset = practitionerRoleSearchset({
      roleId: 'admin-role-1',
      organizationId: 'org-99'
    });
    vi.mocked(mockAxiosInstance.post).mockResolvedValue({
      data: {
        resourceType: 'Bundle',
        type: 'batch-response',
        entry: [batchResponseEntry(searchset)]
      }
    });

    const result = await fetchUserProfilesBundle(
      'user-1',
      ['Clinic Admin'],
      'Clinic Admin'
    );

    expect(result.activeProfile).toEqual(fullPractitionerResource);
    expect(result.roleProfiles['Clinic Admin']).toEqual({
      name: 'Jane Doe',
      photoUrl: 'https://cdn.example.com/jane.jpg',
      resource: fullPractitionerResource,
      organizationId: 'org-99'
    });
  });

  it('tolerates a PractitionerRole without an organization reference', async () => {
    const searchset = practitionerRoleSearchset({ roleId: 'role-1' });
    vi.mocked(mockAxiosInstance.post).mockResolvedValue({
      data: {
        resourceType: 'Bundle',
        type: 'batch-response',
        entry: [batchResponseEntry(searchset)]
      }
    });

    const result = await fetchUserProfilesBundle(
      'user-1',
      ['Researcher'],
      'Researcher'
    );

    expect(result.roleProfiles.Researcher).toEqual({
      name: 'Jane Doe',
      photoUrl: 'https://cdn.example.com/jane.jpg',
      resource: fullPractitionerResource
    });
    expect(result.roleProfiles.Researcher?.organizationId).toBeUndefined();
  });

  it('returns null for an admin role whose PractitionerRole search has no match', async () => {
    vi.mocked(mockAxiosInstance.post).mockResolvedValue({
      data: {
        resourceType: 'Bundle',
        type: 'batch-response',
        entry: [batchResponseEntry(emptySearchset)]
      }
    });

    const result = await fetchUserProfilesBundle(
      'user-1',
      ['Clinic Admin'],
      'Clinic Admin'
    );

    expect(result.activeProfile).toBeNull();
    expect(result.roleProfiles).toEqual({ 'Clinic Admin': null });
  });

  it('caches an unnamed admin profile (no name) instead of returning null', async () => {
    const unnamedPractitioner: Practitioner = {
      resourceType: 'Practitioner',
      id: 'prac-2'
    };
    const searchset = practitionerRoleSearchset({
      roleId: 'admin-role-2',
      organizationId: 'org-2',
      practitioner: unnamedPractitioner
    });
    vi.mocked(mockAxiosInstance.post).mockResolvedValue({
      data: {
        resourceType: 'Bundle',
        type: 'batch-response',
        entry: [batchResponseEntry(searchset)]
      }
    });

    const result = await fetchUserProfilesBundle(
      'user-1',
      ['Clinic Admin'],
      'Clinic Admin'
    );

    expect(result.activeProfile).toEqual(unnamedPractitioner);
    expect(result.roleProfiles['Clinic Admin']).toEqual({
      name: '-',
      photoUrl: '',
      resource: unnamedPractitioner,
      organizationId: 'org-2'
    });
  });

  it('uses the full Practitioner include as the active profile for the Researcher role', async () => {
    const searchset = practitionerRoleSearchset({
      roleId: 'researcher-role-1',
      organizationId: 'org-77'
    });
    vi.mocked(mockAxiosInstance.post).mockResolvedValue({
      data: {
        resourceType: 'Bundle',
        type: 'batch-response',
        entry: [batchResponseEntry(searchset)]
      }
    });

    const result = await fetchUserProfilesBundle(
      'user-1',
      ['Researcher'],
      'Researcher'
    );

    expect(result.activeProfile?.resourceType).toBe('Practitioner');
    expect(result.activeProfile?.id).toBe('prac-1');
  });
});
