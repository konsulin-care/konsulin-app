/* eslint-disable unicorn/prefer-https */
import type { Location } from 'fhir/r4';
import { describe, expect, it } from 'vitest';
import {
  getLocationImageUrl,
  setLocationImageUrl
} from '../fhir/location-image';

describe('getLocationImageUrl', () => {
  it('returns null when no image extension exists', () => {
    const loc: Location = {
      resourceType: 'Location',
      name: 'Main Clinic'
    };
    expect(getLocationImageUrl(loc)).toBeNull();
  });

  it('returns the URL from the image extension', () => {
    const loc: Location = {
      resourceType: 'Location',
      name: 'Main Clinic',
      extension: [
        {
          url: 'http://konsulin.care/fhir/StructureDefinition/locationImage',
          valueUrl:
            'https://res.cloudinary.com/test/image/upload/v1/sample.webp'
        }
      ]
    };
    expect(getLocationImageUrl(loc)).toBe(
      'https://res.cloudinary.com/test/image/upload/v1/sample.webp'
    );
  });

  it('returns null when extensions array is empty', () => {
    const loc: Location = {
      resourceType: 'Location',
      name: 'Main Clinic',
      extension: []
    };
    expect(getLocationImageUrl(loc)).toBeNull();
  });

  it('returns null when extension value is missing', () => {
    const loc: Location = {
      resourceType: 'Location',
      name: 'Main Clinic',
      extension: [
        {
          url: 'http://konsulin.care/fhir/StructureDefinition/locationImage'
        }
      ]
    };
    expect(getLocationImageUrl(loc)).toBeNull();
  });
});

describe('setLocationImageUrl', () => {
  it('adds image extension to a location without extensions', () => {
    const loc: Location = {
      resourceType: 'Location',
      name: 'Main Clinic'
    };
    const result = setLocationImageUrl(
      loc,
      'https://res.cloudinary.com/test/image/upload/v1/sample.webp'
    );
    const ext = result.extension?.find(
      e =>
        e.url === 'http://konsulin.care/fhir/StructureDefinition/locationImage'
    );
    expect(ext?.valueUrl).toBe(
      'https://res.cloudinary.com/test/image/upload/v1/sample.webp'
    );
  });

  it('replaces existing image extension', () => {
    const loc: Location = {
      resourceType: 'Location',
      name: 'Main Clinic',
      extension: [
        {
          url: 'http://konsulin.care/fhir/StructureDefinition/locationImage',
          valueUrl: 'https://res.cloudinary.com/test/image/upload/v1/old.webp'
        }
      ]
    };
    const result = setLocationImageUrl(
      loc,
      'https://res.cloudinary.com/test/image/upload/v1/new.webp'
    );
    const ext = result.extension?.find(
      e =>
        e.url === 'http://konsulin.care/fhir/StructureDefinition/locationImage'
    );
    expect(ext?.valueUrl).toBe(
      'https://res.cloudinary.com/test/image/upload/v1/new.webp'
    );
    expect(result.extension).toHaveLength(1);
  });

  it('preserves other extensions when adding image', () => {
    const loc: Location = {
      resourceType: 'Location',
      name: 'Main Clinic',
      extension: [
        {
          url: 'http://konsulin.care/fhir/StructureDefinition/someOther',
          valueString: 'metadata'
        }
      ]
    };
    const result = setLocationImageUrl(
      loc,
      'https://res.cloudinary.com/test/image/upload/v1/sample.webp'
    );
    const imgExt = result.extension?.find(
      e =>
        e.url === 'http://konsulin.care/fhir/StructureDefinition/locationImage'
    );
    const otherExt = result.extension?.find(
      e => e.url === 'http://konsulin.care/fhir/StructureDefinition/someOther'
    );
    expect(imgExt?.valueUrl).toBe(
      'https://res.cloudinary.com/test/image/upload/v1/sample.webp'
    );
    expect(otherExt?.valueString).toBe('metadata');
    expect(result.extension).toHaveLength(2);
  });
});
