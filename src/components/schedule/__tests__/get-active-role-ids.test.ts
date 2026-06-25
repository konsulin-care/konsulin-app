import type { IPractitionerRoleDetail } from '@/types/practitioner';
import type { BundleEntry, Invoice, Organization, Schedule } from 'fhir/r4';
import { describe, expect, it } from 'vitest';
import { getActiveRoleIds } from '../mark-unavailability';

const buildEntry = (
  id: string,
  active: boolean,
  orgName?: string
): BundleEntry<IPractitionerRoleDetail> => ({
  resource: {
    resourceType: 'PractitionerRole',
    id,
    active,
    organizationData: { name: orgName ?? '' } as unknown as Organization,
    scheduleData: {} as Schedule,
    invoiceData: {} as Invoice
  } as unknown as IPractitionerRoleDetail
});

describe('getActiveRoleIds', () => {
  it('returns empty array for undefined entries', () => {
    expect(getActiveRoleIds()).toEqual([]);
  });

  it('returns empty array for empty entries', () => {
    expect(getActiveRoleIds([])).toEqual([]);
  });

  it('filters active resources and maps to IDs', () => {
    const entries = [
      buildEntry('role-1', true),
      buildEntry('role-2', false),
      buildEntry('role-3', true)
    ];
    expect(getActiveRoleIds(entries)).toEqual(['role-1', 'role-3']);
  });

  it('returns empty array when no entries are active', () => {
    const entries = [buildEntry('role-1', false), buildEntry('role-2', false)];
    expect(getActiveRoleIds(entries)).toEqual([]);
  });

  it('handles entries with missing resource gracefully', () => {
    const entries = [
      {
        resource: undefined
      } as unknown as BundleEntry<IPractitionerRoleDetail>,
      buildEntry('role-1', true)
    ];
    expect(getActiveRoleIds(entries)).toEqual(['role-1']);
  });

  it('handles null/undefined id in active resources', () => {
    const entries = [
      {
        resource: {
          resourceType: 'PractitionerRole',
          active: true
        } as IPractitionerRoleDetail
      } as BundleEntry<IPractitionerRoleDetail>,
      buildEntry('role-2', true)
    ];
    expect(getActiveRoleIds(entries)).toEqual(['', 'role-2']);
  });
});
