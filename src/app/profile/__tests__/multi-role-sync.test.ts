import type { IStateUserInfo } from '@/context/auth/authTypes';
import type { ProfileResource, RoleProfile } from '@/services/role-profiles';
import { describe, expect, it } from 'vitest';
import {
  buildProfileTransactionBundle,
  buildUpdatedRoleProfiles,
  collectCachedResources,
  dedupeProfileResources,
  resourceKey
} from '../multi-role-sync';

const PATIENT_ID = 'DH66MVEL7R7XSFT2';
const PRACTITIONER_ID = 'DG5CY3QAKEOXE2Y6';

/** Patient fixture from the bug report (real id/version). */
const patient: ProfileResource = {
  resourceType: 'Patient',
  id: PATIENT_ID,
  meta: { versionId: '4226', lastUpdated: '2026-08-13T08:04:41.761Z' }
};

/** Practitioner fixture sharing the bug-report resource id. */
function practitioner(lastUpdated?: string): ProfileResource {
  return {
    resourceType: 'Practitioner',
    id: PRACTITIONER_ID,
    meta: lastUpdated ? { versionId: '4226', lastUpdated } : undefined
  };
}

function roleProfile(resource: ProfileResource): RoleProfile {
  return { name: 'Aly Lamuri', photoUrl: '', resource };
}

describe('resourceKey', () => {
  it('builds a resourceType/id key', () => {
    expect(resourceKey(patient)).toBe(`Patient/${PATIENT_ID}`);
    expect(resourceKey(practitioner('2026-08-13T08:04:41.761Z'))).toBe(
      `Practitioner/${PRACTITIONER_ID}`
    );
  });
});

describe('dedupeProfileResources', () => {
  it('keeps a single copy of identical resources', () => {
    const firstResource = practitioner('2026-08-13T08:04:41.761Z');
    const duplicateResource = practitioner('2026-08-13T08:04:41.761Z');
    const result = dedupeProfileResources([
      firstResource,
      duplicateResource,
      duplicateResource
    ]);
    expect(result).toHaveLength(1);
    expect(result[0]).toBe(firstResource);
  });

  it('keeps distinct resources separate', () => {
    const practitionerResource = practitioner('2026-08-13T08:04:41.761Z');
    expect(dedupeProfileResources([patient, practitionerResource])).toEqual([
      patient,
      practitionerResource
    ]);
  });

  it('keeps the preferred (active role) copy even when another copy is newer', () => {
    const active = practitioner('2020-01-01T00:00:00.000Z');
    const newer = practitioner('2026-08-13T08:04:41.761Z');
    expect(dedupeProfileResources([newer, active], active)).toEqual([active]);
  });

  it('keeps the copy with the most recent meta.lastUpdated when no preferred copy is given', () => {
    const old = practitioner('2024-01-01T00:00:00.000Z');
    const mid = practitioner('2025-06-01T00:00:00.000Z');
    const newest = practitioner('2026-08-13T08:04:41.761Z');
    expect(dedupeProfileResources([old, mid, newest])).toEqual([newest]);
  });

  it('keeps the first occurrence when lastUpdated ties', () => {
    const first = practitioner('2026-08-13T08:04:41.761Z');
    const second = practitioner('2026-08-13T08:04:41.761Z');
    expect(dedupeProfileResources([first, second])).toEqual([first]);
  });

  it('treats a missing meta.lastUpdated as the oldest copy', () => {
    const noMeta = practitioner();
    const withMeta = practitioner('2026-08-13T08:04:41.761Z');
    expect(dedupeProfileResources([noMeta, withMeta])).toEqual([withMeta]);
    expect(dedupeProfileResources([noMeta])).toEqual([noMeta]);
  });
});

describe('buildProfileTransactionBundle', () => {
  it('bug repro: 3 roles sharing one Practitioner emit a single PUT entry', () => {
    const resources = [
      patient,
      practitioner('2026-08-13T08:04:41.761Z'),
      practitioner('2026-08-13T08:04:41.761Z'),
      practitioner('2026-08-13T08:04:41.761Z')
    ];
    const bundle = buildProfileTransactionBundle(resources);
    const urls = bundle.entry?.map(entry => entry.request?.url) ?? [];
    expect(urls).toEqual([
      `Patient/${PATIENT_ID}`,
      `Practitioner/${PRACTITIONER_ID}`
    ]);
    expect(new Set(urls).size).toBe(urls.length);
    expect(
      urls.filter(url => url === `Practitioner/${PRACTITIONER_ID}`)
    ).toHaveLength(1);
  });

  it('prefers the active role copy for a duplicate practitioner', () => {
    const active = practitioner('2020-01-01T00:00:00.000Z');
    const newer = practitioner('2026-08-13T08:04:41.761Z');
    const bundle = buildProfileTransactionBundle([newer, active], active);
    expect(bundle.entry).toHaveLength(1);
    expect(bundle.entry?.[0]?.resource).toBe(active);
  });
});

describe('collectCachedResources', () => {
  it('keeps every role key when roles share one Practitioner resource', () => {
    const userInfo: IStateUserInfo = {
      role_name: 'Patient',
      roles: ['Patient', 'Practitioner', 'Clinic Admin', 'Researcher'],
      roleProfiles: {
        Patient: roleProfile(patient),
        Practitioner: roleProfile(practitioner('2026-08-13T08:04:41.761Z')),
        'Clinic Admin': roleProfile(practitioner('2026-08-13T08:04:41.761Z')),
        Researcher: roleProfile(practitioner('2026-08-13T08:04:41.761Z'))
      }
    };
    const resources = collectCachedResources(userInfo);
    expect(Object.keys(resources).sort()).toEqual([
      'Clinic Admin',
      'Patient',
      'Practitioner',
      'Researcher'
    ]);
    expect(resources.Patient).toBe(patient);
  });

  it('collapses shared Practitioner copies into one canonical object', () => {
    const p1 = practitioner('2026-08-13T08:04:41.761Z');
    const p2 = practitioner('2026-08-13T08:04:41.761Z');
    const p3 = practitioner('2026-08-13T08:04:41.761Z');
    const userInfo: IStateUserInfo = {
      role_name: 'Patient',
      roles: ['Patient', 'Practitioner', 'Clinic Admin', 'Researcher'],
      roleProfiles: {
        Patient: roleProfile(patient),
        Practitioner: roleProfile(p1),
        'Clinic Admin': roleProfile(p2),
        Researcher: roleProfile(p3)
      }
    };
    const resources = collectCachedResources(userInfo);
    expect(resources.Practitioner).toBe(resources['Clinic Admin']);
    expect(resources['Clinic Admin']).toBe(resources.Researcher);
    expect(resources.Patient).not.toBe(resources.Practitioner);
  });

  it('prefers the active role copy when it is part of the shared resource', () => {
    const activeCopy = practitioner('2020-01-01T00:00:00.000Z');
    const newerCopy = practitioner('2026-08-13T08:04:41.761Z');
    const userInfo: IStateUserInfo = {
      role_name: 'Practitioner',
      roles: ['Patient', 'Practitioner', 'Clinic Admin'],
      roleProfiles: {
        Patient: roleProfile(patient),
        Practitioner: roleProfile(activeCopy),
        'Clinic Admin': roleProfile(newerCopy)
      }
    };
    const resources = collectCachedResources(userInfo);
    expect(resources.Practitioner).toBe(activeCopy);
    expect(resources['Clinic Admin']).toBe(activeCopy);
  });

  it('keeps distinct resources separate', () => {
    const practitionerResource = practitioner('2026-08-13T08:04:41.761Z');
    const userInfo: IStateUserInfo = {
      role_name: 'Patient',
      roles: ['Patient', 'Practitioner'],
      roleProfiles: {
        Patient: roleProfile(patient),
        Practitioner: roleProfile(practitionerResource)
      }
    };
    const resources = collectCachedResources(userInfo);
    expect(resources.Patient).toBe(patient);
    expect(resources.Practitioner).toBe(practitionerResource);
  });
});

describe('buildUpdatedRoleProfiles', () => {
  it('preserves every merged role key after a deduped multi-role save', () => {
    const sharedPractitioner = practitioner('2026-08-13T08:04:41.761Z');
    const merged: Record<string, ProfileResource> = {
      Patient: patient,
      Practitioner: sharedPractitioner,
      'Clinic Admin': sharedPractitioner,
      Researcher: sharedPractitioner
    };
    const existing: Record<string, RoleProfile | null> = {
      'Some Other Role': null
    };
    const updated = buildUpdatedRoleProfiles(merged, existing);
    expect(Object.keys(updated).sort()).toEqual([
      'Clinic Admin',
      'Patient',
      'Practitioner',
      'Researcher',
      'Some Other Role'
    ]);
    expect(updated.Patient?.resource).toBe(patient);
  });
});
