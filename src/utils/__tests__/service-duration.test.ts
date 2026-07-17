import type { HealthcareService } from 'fhir/r4';
import { describe, expect, it } from 'vitest';
import {
  getServiceDuration,
  setServiceDuration
} from '../fhir/service-duration';

describe('getServiceDuration', () => {
  it('returns null when no duration extension exists', () => {
    const hs: HealthcareService = {
      resourceType: 'HealthcareService',
      name: 'General Consultation'
    };
    expect(getServiceDuration(hs)).toBeNull();
  });

  it('reads old valueInteger format for backward compatibility', () => {
    const hs: HealthcareService = {
      resourceType: 'HealthcareService',
      name: 'General Consultation',
      extension: [
        {
          url: 'https://konsulin.id/fhir/StructureDefinition/serviceDuration',
          valueInteger: 30
        }
      ]
    };
    expect(getServiceDuration(hs)).toBe(30);
  });

  it('returns the duration value from valueDuration', () => {
    const hs: HealthcareService = {
      resourceType: 'HealthcareService',
      name: 'General Consultation',
      extension: [
        {
          url: 'https://konsulin.id/fhir/StructureDefinition/serviceDuration',
          valueDuration: {
            value: 30,
            system: 'https://unitsofmeasure.org',
            code: 'min'
          }
        }
      ]
    };
    expect(getServiceDuration(hs)).toBe(30);
  });

  it('returns null when extension value is missing', () => {
    const hs: HealthcareService = {
      resourceType: 'HealthcareService',
      name: 'General Consultation',
      extension: [
        {
          url: 'https://konsulin.id/fhir/StructureDefinition/serviceDuration'
        }
      ]
    };
    expect(getServiceDuration(hs)).toBeNull();
  });

  it('returns null when extensions array is empty', () => {
    const hs: HealthcareService = {
      resourceType: 'HealthcareService',
      name: 'General Consultation',
      extension: []
    };
    expect(getServiceDuration(hs)).toBeNull();
  });
});

describe('setServiceDuration', () => {
  it('adds duration extension to a service without extensions', () => {
    const hs: HealthcareService = {
      resourceType: 'HealthcareService',
      name: 'General Consultation'
    };
    const result = setServiceDuration(hs, 45);
    const ext = result.extension?.find(
      e =>
        e.url === 'https://konsulin.id/fhir/StructureDefinition/serviceDuration'
    );
    expect(ext?.valueDuration?.value).toBe(45);
    expect(ext?.valueDuration?.system).toBe('https://unitsofmeasure.org');
    expect(ext?.valueDuration?.code).toBe('min');
  });

  it('replaces existing duration extension', () => {
    const hs: HealthcareService = {
      resourceType: 'HealthcareService',
      name: 'General Consultation',
      extension: [
        {
          url: 'https://konsulin.id/fhir/StructureDefinition/serviceDuration',
          valueDuration: {
            value: 30,
            system: 'https://unitsofmeasure.org',
            code: 'min'
          }
        }
      ]
    };
    const result = setServiceDuration(hs, 60);
    const ext = result.extension?.find(
      e =>
        e.url === 'https://konsulin.id/fhir/StructureDefinition/serviceDuration'
    );
    expect(ext?.valueDuration?.value).toBe(60);
    expect(ext?.valueDuration?.system).toBe('https://unitsofmeasure.org');
    expect(ext?.valueDuration?.code).toBe('min');
    expect(result.extension).toHaveLength(1);
  });

  it('preserves other extensions when adding duration', () => {
    const hs: HealthcareService = {
      resourceType: 'HealthcareService',
      name: 'General Consultation',
      extension: [
        {
          url: 'https://konsulin.id/fhir/StructureDefinition/fee',
          valueMoney: { value: 250_000, currency: 'IDR' }
        }
      ]
    };
    const result = setServiceDuration(hs, 30);
    const feeExt = result.extension?.find(
      e => e.url === 'https://konsulin.id/fhir/StructureDefinition/fee'
    );
    const durationExt = result.extension?.find(
      e =>
        e.url === 'https://konsulin.id/fhir/StructureDefinition/serviceDuration'
    );
    expect(durationExt?.valueDuration?.value).toBe(30);
    expect(durationExt?.valueDuration?.system).toBe(
      'https://unitsofmeasure.org'
    );
    expect(durationExt?.valueDuration?.code).toBe('min');
    expect(feeExt?.valueMoney?.value).toBe(250_000);
    expect(result.extension).toHaveLength(2);
  });
});
