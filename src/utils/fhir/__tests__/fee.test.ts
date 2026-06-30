import type { HealthcareService } from 'fhir/r4';
import { describe, expect, it } from 'vitest';
import { getFeeFromHealthcareService } from '../fee';

const FEE_EXTENSION_URL = 'https://konsulin.id/fhir/StructureDefinition/fee';

describe('getFeeFromHealthcareService', () => {
  it('returns fee when extension is present', () => {
    const hs: HealthcareService = {
      resourceType: 'HealthcareService',
      id: 'svc-1',
      active: true,
      name: 'General Consultation',
      extension: [
        {
          url: FEE_EXTENSION_URL,
          valueMoney: { value: 250_000, currency: 'IDR' }
        }
      ]
    };

    const result = getFeeFromHealthcareService(hs);
    expect(result).toEqual({ value: 250_000, currency: 'IDR' });
  });

  it('returns null when no fee extension exists', () => {
    const hs: HealthcareService = {
      resourceType: 'HealthcareService',
      id: 'svc-2',
      active: true,
      name: 'Free Service'
    };

    const result = getFeeFromHealthcareService(hs);
    expect(result).toBeNull();
  });

  it('returns null when extension array is empty', () => {
    const hs: HealthcareService = {
      resourceType: 'HealthcareService',
      id: 'svc-3',
      active: true,
      name: 'Empty Extension',
      extension: []
    };

    const result = getFeeFromHealthcareService(hs);
    expect(result).toBeNull();
  });

  it('returns null when extension has wrong URL', () => {
    const hs: HealthcareService = {
      resourceType: 'HealthcareService',
      id: 'svc-4',
      active: true,
      name: 'Other Extension',
      extension: [
        {
          url: 'https://other.extension/url',
          valueString: 'test'
        }
      ]
    };

    const result = getFeeFromHealthcareService(hs);
    expect(result).toBeNull();
  });

  it('returns null when valueMoney has no value', () => {
    const hs: HealthcareService = {
      resourceType: 'HealthcareService',
      id: 'svc-5',
      active: true,
      name: 'Empty Money',
      extension: [
        {
          url: FEE_EXTENSION_URL,
          valueMoney: {}
        }
      ]
    };

    const result = getFeeFromHealthcareService(hs);
    expect(result).toBeNull();
  });
});
