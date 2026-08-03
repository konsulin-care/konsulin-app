import type { HealthcareService } from 'fhir/r4';
import { describe, expect, it } from 'vitest';
import { FhirExtensionUrls } from '../extensions';
import {
  buildFeeExtension,
  getFee,
  getFeeFromHealthcareService,
  setFee
} from '../fee';

type WithExtension = { extension?: unknown[] };

describe('getFeeFromHealthcareService', () => {
  it('returns fee when extension is present', () => {
    const hs: HealthcareService = {
      resourceType: 'HealthcareService',
      id: 'svc-1',
      active: true,
      name: 'General Consultation',
      extension: [
        {
          url: FhirExtensionUrls.fee,
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
          url: FhirExtensionUrls.fee,
          valueMoney: {}
        }
      ]
    };

    const result = getFeeFromHealthcareService(hs);
    expect(result).toBeNull();
  });
});

describe('buildFeeExtension', () => {
  it('builds an IDR Money extension for the fee URL', () => {
    expect(buildFeeExtension(250_000)).toEqual({
      url: FhirExtensionUrls.fee,
      valueMoney: { value: 250_000, currency: 'IDR' }
    });
  });

  it('builds a zero-value extension for 0', () => {
    expect(buildFeeExtension(0)).toEqual({
      url: FhirExtensionUrls.fee,
      valueMoney: { value: 0, currency: 'IDR' }
    });
  });
});

describe('setFee', () => {
  it('adds a fee extension to a resource with no extensions', () => {
    const hs: HealthcareService = {
      resourceType: 'HealthcareService',
      id: 'svc-1',
      active: true,
      name: 'General Consultation'
    };

    const result = setFee(hs, 150_000);

    expect(result.extension).toEqual([buildFeeExtension(150_000)]);
  });

  it('replaces an existing fee extension', () => {
    const hs: HealthcareService = {
      resourceType: 'HealthcareService',
      id: 'svc-2',
      active: true,
      name: 'General Consultation',
      extension: [buildFeeExtension(50_000)]
    };

    const result = setFee(hs, 200_000);

    expect(result.extension).toEqual([buildFeeExtension(200_000)]);
  });

  it('preserves unrelated extensions', () => {
    const imageExt = {
      url: FhirExtensionUrls.questionnaireImage,
      valueUrl: 'https://example.com/image.webp'
    };
    const hs: HealthcareService = {
      resourceType: 'HealthcareService',
      id: 'svc-3',
      active: true,
      name: 'General Consultation',
      extension: [imageExt]
    };

    const result = setFee(hs, 100_000);

    expect(result.extension).toEqual([imageExt, buildFeeExtension(100_000)]);
  });

  it('does not mutate the input resource', () => {
    const hs: HealthcareService = {
      resourceType: 'HealthcareService',
      id: 'svc-4',
      active: true,
      name: 'General Consultation'
    };

    const result = setFee(hs, 100_000);

    expect(result).not.toBe(hs);
    expect(hs.extension).toBeUndefined();
  });
});

describe('getFee', () => {
  it('returns Money when the fee extension is present', () => {
    const hs: WithExtension = {
      resourceType: 'HealthcareService',
      extension: [buildFeeExtension(250_000)]
    };

    expect(getFee(hs)).toEqual({ value: 250_000, currency: 'IDR' });
  });

  it('returns null when no fee extension exists', () => {
    const hs: WithExtension = {
      resourceType: 'HealthcareService',
      extension: []
    };

    expect(getFee(hs)).toBeNull();
  });

  it('returns null when valueMoney is empty', () => {
    const hs: WithExtension = {
      resourceType: 'HealthcareService',
      extension: [{ url: FhirExtensionUrls.fee, valueMoney: {} }]
    };

    expect(getFee(hs)).toBeNull();
  });

  it('defaults currency to IDR when missing', () => {
    const hs: WithExtension = {
      resourceType: 'HealthcareService',
      extension: [{ url: FhirExtensionUrls.fee, valueMoney: { value: 500 } }]
    };

    expect(getFee(hs)).toEqual({ value: 500, currency: 'IDR' });
  });
});
