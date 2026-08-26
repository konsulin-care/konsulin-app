import {
  ADMIN_ENDPOINTS,
  getEndpointsForMethod,
  resourceTypeFromPath
} from '@/lib/admin/endpoints';
import { describe, expect, it } from 'vitest';

describe('ADMIN_ENDPOINTS', () => {
  it('exposes every RBAC-granted superadmin FHIR resource', () => {
    expect(ADMIN_ENDPOINTS).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ path: '/fhir/Organization' }),
        expect.objectContaining({ path: '/fhir/Organization/{id}' }),
        expect.objectContaining({ path: '/fhir/Location' }),
        expect.objectContaining({ path: '/fhir/HealthcareService' }),
        expect.objectContaining({ path: '/fhir/PractitionerRole' }),
        expect.objectContaining({ path: '/fhir/Schedule' }),
        expect.objectContaining({ path: '/fhir/Slot' }),
        expect.objectContaining({ path: '/fhir/Questionnaire' }),
        expect.objectContaining({ path: '/fhir/PlanDefinition' }),
        expect.objectContaining({ path: '/fhir/ResearchStudy' }),
        expect.objectContaining({ path: '/fhir/Patient' }),
        expect.objectContaining({ path: '/fhir/metadata' })
      ])
    );
  });

  it('includes the superadmin special endpoints', () => {
    expect(ADMIN_ENDPOINTS).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ path: '/api/v1/tx' }),
        expect.objectContaining({ path: '/hook/synchronous/send-wa-link' }),
        expect.objectContaining({ path: '/api/v1/auth/magiclink' })
      ])
    );
  });

  it('marks Organization DELETE as superadmin-exclusive', () => {
    const orgItem = ADMIN_ENDPOINTS.find(
      e => e.path === '/fhir/Organization/{id}'
    );
    expect(orgItem?.methods).toContain('DELETE');
  });
});

describe('getEndpointsForMethod', () => {
  it('returns only endpoints supporting the given method', () => {
    for (const e of getEndpointsForMethod('DELETE')) {
      expect(e.methods).toContain('DELETE');
    }
  });

  it('returns non-empty result for each method', () => {
    for (const method of ['GET', 'POST', 'PUT', 'DELETE'] as const) {
      expect(getEndpointsForMethod(method).length).toBeGreaterThan(0);
    }
  });
});

describe('resourceTypeFromPath', () => {
  it('extracts the resource type from a base path', () => {
    expect(resourceTypeFromPath('/fhir/Organization')).toBe('Organization');
    expect(resourceTypeFromPath('/fhir/Location')).toBe('Location');
  });

  it('extracts the resource type from an item path', () => {
    expect(resourceTypeFromPath('/fhir/Organization/org-123')).toBe(
      'Organization'
    );
    expect(resourceTypeFromPath('/fhir/Slot/DH772NZNDDSUDZZU')).toBe('Slot');
  });

  it('returns undefined for non-FHIR endpoints', () => {
    expect(resourceTypeFromPath('/api/v1/tx')).toBeUndefined();
    expect(
      resourceTypeFromPath('/hook/synchronous/send-wa-link')
    ).toBeUndefined();
    expect(resourceTypeFromPath('/api/v1/auth/magiclink')).toBeUndefined();
    expect(resourceTypeFromPath('/fhir/metadata')).toBeUndefined();
  });

  it('returns undefined for empty or unknown paths', () => {
    expect(resourceTypeFromPath('')).toBeUndefined();
    expect(resourceTypeFromPath('/api/provinces')).toBeUndefined();
  });
});
