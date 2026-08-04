import type { Extension } from 'fhir/r4';
import { describe, expect, it } from 'vitest';
import {
  FhirExtensionUrls,
  FhirSystems,
  getExtension,
  upsertExtension
} from '../extensions';

type WithExtension = { resourceType?: string; extension?: Extension[] };

describe('FhirExtensionUrls', () => {
  it('defines the six canonical extension URLs without duplication', () => {
    expect(new Set(Object.keys(FhirExtensionUrls))).toEqual(
      new Set([
        'fee',
        'locationImage',
        'questionnaireEstimatedDuration',
        'questionnaireImage',
        'referralBatch',
        'serviceDuration'
      ])
    );
    const urls = Object.values(FhirExtensionUrls);
    expect(new Set(urls).size).toBe(urls.length);
    for (const url of urls) {
      expect(url).toContain('konsulin.care/fhir/StructureDefinition/');
      expect(url.startsWith('http')).toBe(true);
    }
  });
});

describe('FhirSystems', () => {
  it('defines the six canonical system URLs without duplication', () => {
    expect(new Set(Object.keys(FhirSystems))).toEqual(
      new Set([
        'assessmentContext',
        'assessmentDomain',
        'lucide',
        'researchReferral',
        'ucum',
        'usageContext'
      ])
    );
    const urls = Object.values(FhirSystems);
    expect(new Set(urls).size).toBe(urls.length);
    for (const url of urls) {
      expect(url.length).toBeGreaterThan(0);
    }
  });
});
describe('upsertExtension', () => {
  it('adds an extension to a resource with no existing extensions', () => {
    const resource: WithExtension = { resourceType: 'Questionnaire' };
    const ext: Extension = {
      url: FhirExtensionUrls.fee,
      valueMoney: { value: 100_000, currency: 'IDR' }
    };

    const result = upsertExtension(resource, ext);

    expect(result.extension).toEqual([ext]);
    expect(resource.extension).toBeUndefined();
  });

  it('replaces an existing extension with the same URL', () => {
    const resource: WithExtension = {
      resourceType: 'Questionnaire',
      extension: [
        {
          url: FhirExtensionUrls.fee,
          valueMoney: { value: 50_000, currency: 'IDR' }
        }
      ]
    };
    const ext: Extension = {
      url: FhirExtensionUrls.fee,
      valueMoney: { value: 200_000, currency: 'IDR' }
    };

    const result = upsertExtension(resource, ext);

    expect(result.extension).toEqual([ext]);
  });

  it('preserves unrelated extensions when upserting', () => {
    const imageExt: Extension = {
      url: FhirExtensionUrls.questionnaireImage,
      valueUrl: 'https://example.com/image.webp'
    };
    const resource: WithExtension = {
      resourceType: 'Questionnaire',
      extension: [imageExt]
    };
    const feeExt: Extension = {
      url: FhirExtensionUrls.fee,
      valueMoney: { value: 100_000, currency: 'IDR' }
    };

    const result = upsertExtension(resource, feeExt);

    expect(result.extension).toEqual([imageExt, feeExt]);
  });

  it('does not mutate the original resource', () => {
    const resource: WithExtension = { resourceType: 'Questionnaire' };
    const ext: Extension = {
      url: FhirExtensionUrls.fee,
      valueMoney: { value: 100_000, currency: 'IDR' }
    };

    const result = upsertExtension(resource, ext);

    expect(result).not.toBe(resource);
    expect(resource.extension).toBeUndefined();
  });
});

describe('getExtension', () => {
  const feeExt: Extension = {
    url: FhirExtensionUrls.fee,
    valueMoney: { value: 100_000, currency: 'IDR' }
  };

  it('returns the extension matching the URL', () => {
    const resource: WithExtension = {
      resourceType: 'Questionnaire',
      extension: [feeExt]
    };

    expect(getExtension(resource, FhirExtensionUrls.fee)).toEqual(feeExt);
  });

  it('returns undefined when no extension matches', () => {
    const resource: WithExtension = {
      resourceType: 'Questionnaire',
      extension: [feeExt]
    };

    expect(
      getExtension(resource, FhirExtensionUrls.questionnaireImage)
    ).toBeUndefined();
  });

  it('returns undefined when the resource has no extensions', () => {
    const resource: WithExtension = { resourceType: 'Questionnaire' };

    expect(getExtension(resource, FhirExtensionUrls.fee)).toBeUndefined();
  });
});
