import {
  getEndpointOptionsGrouped,
  getEndpointsForMethod,
  type HttpMethod
} from '@/lib/admin/endpoints';
import { describe, expect, it } from 'vitest';

describe('getEndpointOptionsGrouped', () => {
  it('returns a Map keyed by resource type', () => {
    const grouped = getEndpointOptionsGrouped('GET');
    expect(grouped).toBeInstanceOf(Map);

    const keys = [...grouped.keys()];
    expect(keys.length).toBeGreaterThan(0);
    // All keys should be resource type names or 'Special'
    for (const key of keys) {
      expect(typeof key).toBe('string');
    }
  });

  it('groups FHIR endpoints under their resource type', () => {
    const grouped = getEndpointOptionsGrouped('GET');

    // Organization supports GET, so it should appear
    const orgGroup = grouped.get('Organization');
    expect(orgGroup).toBeDefined();
    expect(orgGroup?.some(e => e.path === '/fhir/Organization')).toBe(true);
  });

  it('groups non-FHIR endpoints under Special', () => {
    const grouped = getEndpointOptionsGrouped('GET');

    const specialGroup = grouped.get('Special');
    expect(specialGroup).toBeDefined();
    expect(specialGroup?.some(e => e.path === '/fhir/metadata')).toBe(true);
    expect(specialGroup?.some(e => e.path === '/api/v1/tx')).toBe(true);
  });

  it('filters endpoints by the given method', () => {
    const grouped = getEndpointOptionsGrouped('DELETE');

    // DELETE is only supported on Organization
    const orgGroup = grouped.get('Organization');
    expect(orgGroup).toBeDefined();
    expect(orgGroup?.every(e => e.methods.includes('DELETE'))).toBe(true);

    // Patient only supports GET and POST, so should not appear for DELETE
    expect(grouped.has('Patient')).toBe(false);
  });

  it('returns empty Map when method has no matching endpoints', () => {
    // There are no endpoints supporting OPTIONS in the catalog
    const grouped = getEndpointOptionsGrouped('OPTIONS' as HttpMethod);
    expect(grouped.size).toBe(0);
  });

  it('preserves all endpoints that support the method', () => {
    const grouped = getEndpointOptionsGrouped('POST');
    const flatFromGrouped = [...grouped.values()].flat();
    const flatFromFilter = getEndpointsForMethod('POST');

    expect(flatFromGrouped.length).toBe(flatFromFilter.length);
  });
});
