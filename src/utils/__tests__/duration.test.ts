/* eslint-disable unicorn/prefer-https */
import { describe, expect, it } from 'vitest';
import {
  DurationExtensionUrls,
  getDurationInMinutes,
  setDurationExtension
} from '../fhir/duration';

describe('getDurationInMinutes', () => {
  const URL = DurationExtensionUrls.Questionnaire;

  it('returns null when no matching extension exists', () => {
    const resource = { extension: [] };
    expect(getDurationInMinutes(resource, URL)).toBeNull();
  });

  it('returns null when resource has no extensions', () => {
    const resource = {};
    expect(getDurationInMinutes(resource, URL)).toBeNull();
  });

  it('reads valueDuration.value', () => {
    const resource = {
      extension: [{ url: URL, valueDuration: { value: 15 } }]
    };
    expect(getDurationInMinutes(resource, URL)).toBe(15);
  });

  it('reads valueInteger as fallback', () => {
    const resource = {
      extension: [{ url: URL, valueInteger: 30 }]
    };
    expect(getDurationInMinutes(resource, URL)).toBe(30);
  });

  it('prefers valueDuration over valueInteger when both present', () => {
    const resource = {
      extension: [
        {
          url: URL,
          valueDuration: { value: 20 },
          valueInteger: 99
        }
      ]
    };
    expect(getDurationInMinutes(resource, URL)).toBe(20);
  });

  it('returns null when extension has no value', () => {
    const resource = {
      extension: [{ url: URL }]
    };
    expect(getDurationInMinutes(resource, URL)).toBeNull();
  });

  it('ignores extensions with non-matching URL', () => {
    const resource = {
      extension: [
        {
          url: 'http://konsulin.care/fhir/StructureDefinition/fee',
          valueDuration: { value: 50 }
        }
      ]
    };
    expect(getDurationInMinutes(resource, URL)).toBeNull();
  });

  it('supports service duration URL as well', () => {
    const resource = {
      extension: [
        {
          url: DurationExtensionUrls.Service,
          valueDuration: { value: 45 }
        }
      ]
    };
    expect(getDurationInMinutes(resource, DurationExtensionUrls.Service)).toBe(
      45
    );
  });
});

describe('setDurationExtension', () => {
  const URL = DurationExtensionUrls.Questionnaire;

  it('adds duration extension when no extensions exist', () => {
    const result = setDurationExtension(undefined, URL, 10);
    expect(result).toHaveLength(1);
    expect(result[0].url).toBe(URL);
    expect(result[0].valueDuration?.value).toBe(10);
  });

  it('replaces existing duration extension', () => {
    const existing = [
      { url: URL, valueDuration: { value: 5 } as const },
      { url: 'other', valueInteger: 1 }
    ];
    const result = setDurationExtension(existing, URL, 20);
    expect(result).toHaveLength(2);
    const dur = result.find(e => e.url === URL);
    expect(dur?.valueDuration?.value).toBe(20);
  });

  it('preserves other extensions when replacing duration', () => {
    const existing = [
      { url: 'https://other/extension', valueInteger: 99 },
      { url: URL, valueDuration: { value: 10 } as const }
    ];
    const result = setDurationExtension(existing, URL, 30);
    expect(result).toHaveLength(2);
    const other = result.find(e => e.url === 'https://other/extension');
    expect(other?.valueInteger).toBe(99);
  });
});
