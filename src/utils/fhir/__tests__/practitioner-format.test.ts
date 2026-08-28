import type { BundleEntry, HealthcareService, PractitionerRole } from 'fhir/r4';
import { describe, expect, it } from 'vitest';
import {
  getPhotoUrl,
  getPractitionerName,
  getServiceNames,
  mapToCardData
} from '../practitioner-format';

describe('getPractitionerName', () => {
  it('extracts name from resource', () => {
    const r = {
      name: [{ given: ['John'], family: 'Doe' }]
    } as unknown as BundleEntry['resource'];
    expect(getPractitionerName(r)).toBe('John Doe');
  });

  it('handles missing given name', () => {
    const r = {
      name: [{ family: 'Doe' }]
    } as unknown as BundleEntry['resource'];
    expect(getPractitionerName(r)).toBe('Doe');
  });

  it('returns "-" for undefined resource', () => {
    expect(getPractitionerName(undefined)).toBe('-');
  });

  it('returns "-" for resource with no name', () => {
    expect(getPractitionerName({} as BundleEntry['resource'])).toBe('-');
  });
});

describe('getPhotoUrl', () => {
  it('extracts photo URL', () => {
    const r = {
      photo: [{ url: 'https://example.com/photo.jpg' }]
    } as unknown as BundleEntry['resource'];
    expect(getPhotoUrl(r)).toBe('https://example.com/photo.jpg');
  });

  it('returns undefined for no photo', () => {
    expect(getPhotoUrl({} as BundleEntry['resource'])).toBeUndefined();
  });

  it('returns undefined for undefined resource', () => {
    expect(getPhotoUrl(undefined)).toBeUndefined();
  });
});

describe('getServiceNames', () => {
  it('extracts service names from role', () => {
    const role: BundleEntry<PractitionerRole> = {
      resource: {
        resourceType: 'PractitionerRole',
        id: 'role-1',
        practitioner: { reference: 'Practitioner/p-1' },
        healthcareService: [
          { reference: 'HealthcareService/hs-1' },
          { reference: 'HealthcareService/hs-2' }
        ]
      } as PractitionerRole
    };
    const hsMap = new Map([
      ['hs-1', 'General Practice'],
      ['hs-2', 'Pediatrics']
    ]);
    expect(getServiceNames(role, hsMap)).toEqual([
      'General Practice',
      'Pediatrics'
    ]);
  });

  it('returns empty for role with no healthcareService', () => {
    const role: BundleEntry<PractitionerRole> = {
      resource: {
        resourceType: 'PractitionerRole',
        id: 'role-1',
        practitioner: { reference: 'Practitioner/p-1' }
      } as PractitionerRole
    };
    expect(getServiceNames(role, new Map())).toEqual([]);
  });
});

describe('mapToCardData', () => {
  it('maps practitioner entries to card data', () => {
    const entries: BundleEntry[] = [
      {
        resource: {
          resourceType: 'Practitioner',
          id: 'p-1',
          name: [{ given: ['Jane'], family: 'Smith' }],
          photo: [{ url: 'https://example.com/jane.jpg' }]
        }
      },
      {
        resource: {
          resourceType: 'PractitionerRole',
          id: 'role-1',
          practitioner: { reference: 'Practitioner/p-1' },
          specialty: [{ text: 'Cardiology' }],
          healthcareService: [{ reference: 'HealthcareService/hs-1' }]
        } as PractitionerRole
      },
      {
        resource: {
          resourceType: 'HealthcareService',
          id: 'hs-1',
          name: 'Cardiology Clinic'
        } as HealthcareService
      }
    ];
    const result = mapToCardData(entries);
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('p-1');
    expect(result[0].practitionerName).toBe('Jane Smith');
    expect(result[0].photoUrl).toBe('https://example.com/jane.jpg');
    expect(result[0].specialties).toEqual(['Cardiology']);
    expect(result[0].healthcareServiceNames).toEqual(['Cardiology Clinic']);
  });

  it('returns empty for entries with no practitioners', () => {
    expect(mapToCardData([])).toEqual([]);
  });
});
