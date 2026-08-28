import {
  buildQueryString,
  buildResourcePayload,
  coerceFieldValue,
  createParamRow,
  mergeRawJson
} from '@/lib/admin/payload';
import { describe, expect, it } from 'vitest';

describe('buildResourcePayload', () => {
  it('builds { resourceType } with only filled fields', () => {
    const payload = buildResourcePayload('Organization', {
      active: 'true',
      name: 'Konsulin HQ',
      partOf: ''
    });
    expect(payload).toEqual({
      resourceType: 'Organization',
      active: true,
      name: 'Konsulin HQ'
    });
  });

  it('coerces boolean and number values', () => {
    const payload = buildResourcePayload('Slot', {
      status: 'free',
      start: '2030-01-01T10:00:00+07:00',
      end: '2030-01-01T10:30:00+07:00'
    });
    expect(payload.status).toBe('free');
    expect(payload.start).toBe('2030-01-01T10:00:00+07:00');
  });

  it('handles nested dot paths', () => {
    const payload = buildResourcePayload('Location', {
      'address.city': 'Denpasar',
      'address.state': 'Bali',
      'position.longitude': '115.2'
    });
    expect(payload).toEqual({
      resourceType: 'Location',
      address: { city: 'Denpasar', state: 'Bali' },
      position: { longitude: 115.2 }
    });
  });

  it('parses inline JSON fields', () => {
    const payload = buildResourcePayload('Schedule', {
      actor: '[{"reference":"Practitioner/p1"}]'
    });
    expect(payload.actor).toEqual([{ reference: 'Practitioner/p1' }]);
  });

  it('merges the raw JSON escape hatch on top of curated fields', () => {
    const payload = buildResourcePayload(
      'HealthcareService',
      { active: 'true', name: 'Gen Consult' },
      '{"extension":[{"url":"http://konsulin.care/fhir/StructureDefinition/fee","valueMoney":{"value":250000,"currency":"IDR"}}]}'
    );
    expect(payload.resourceType).toBe('HealthcareService');
    expect(payload.active).toBe(true);
    expect(payload.name).toBe('Gen Consult');
    expect(payload.extension).toHaveLength(1);
  });
});

describe('coerceFieldValue', () => {
  it('keeps strings as-is', () => {
    expect(coerceFieldValue('string', 'hello')).toBe('hello');
  });

  it('parses booleans', () => {
    expect(coerceFieldValue('boolean', 'true')).toBe(true);
    expect(coerceFieldValue('boolean', 'false')).toBe(false);
  });

  it('parses numbers', () => {
    expect(coerceFieldValue('number', '250000')).toBe(250000);
    expect(coerceFieldValue('number', '-6.3')).toBe(-6.3);
  });

  it('parses JSON strings into structured values', () => {
    expect(coerceFieldValue('json', '{"a":1}')).toEqual({ a: 1 });
    expect(coerceFieldValue('json', '[1,2]')).toEqual([1, 2]);
  });

  it('falls back to the raw string when JSON is invalid', () => {
    expect(coerceFieldValue('json', '{not json')).toBe('{not json');
  });

  it('parses a comma-separated list into an array of strings', () => {
    expect(coerceFieldValue('array', 'a,b,c')).toEqual(['a', 'b', 'c']);
  });
});

describe('mergeRawJson', () => {
  it('deep-merges raw JSON over the base payload', () => {
    const base = {
      resourceType: 'Questionnaire',
      status: 'draft',
      item: [{ linkId: 'a', text: 'Keep' }]
    };
    const raw = '{"status":"active","item":[{"linkId":"b","text":"New"}]}';
    const merged = mergeRawJson(base, raw);
    expect(merged.status).toBe('active');
    expect(merged.item).toEqual([{ linkId: 'b', text: 'New' }]);
    expect(merged.resourceType).toBe('Questionnaire');
  });

  it('returns the base unchanged for empty raw JSON', () => {
    expect(mergeRawJson({ a: 1 }, '')).toEqual({ a: 1 });
    expect(mergeRawJson({ a: 1 }, '   ')).toEqual({ a: 1 });
  });

  it('throws on invalid raw JSON', () => {
    expect(() => mergeRawJson({ a: 1 }, '{oops')).toThrow();
  });

  it('strips __proto__ and constructor keys from raw JSON', () => {
    const merged = mergeRawJson(
      { resourceType: 'Questionnaire' },
      JSON.stringify({ status: 'active', __proto__: { polluted: true } })
    );
    expect(merged).toEqual({ resourceType: 'Questionnaire', status: 'active' });
    expect(Object.keys(merged)).not.toContain('__proto__');
    expect(Object.getPrototypeOf(merged)).toBe(Object.prototype);
    // Ensure no shared prototype mutation leaked.
    expect(({} as Record<string, unknown>).polluted).toBeUndefined();
  });

  it('strips constructor key from raw JSON', () => {
    const merged = mergeRawJson(
      { resourceType: 'Questionnaire' },
      JSON.stringify({ constructor: { prototype: { polluted: true } } })
    );
    expect(merged).toEqual({ resourceType: 'Questionnaire' });
    expect(({} as Record<string, unknown>).polluted).toBeUndefined();
  });
});

describe('buildQueryString', () => {
  it('serializes key/value rows, skipping empty rows', () => {
    const rows = [
      { ...createParamRow(), key: 'active', value: 'true' },
      { ...createParamRow(), key: '', value: 'ignored' },
      { ...createParamRow(), key: 'name', value: 'Konsulin' },
      { ...createParamRow(), key: 'city', value: 'Denpasar' }
    ];
    expect(buildQueryString(rows)).toBe(
      '?active=true&name=Konsulin&city=Denpasar'
    );
  });

  it('encodes special characters', () => {
    const rows = [
      {
        ...createParamRow(),
        key: '_has:Location:organization',
        value: 'Konsulin X'
      }
    ];
    expect(buildQueryString(rows)).toBe(
      '?_has%3ALocation%3Aorganization=Konsulin%20X'
    );
  });

  it('returns empty string with no rows', () => {
    expect(buildQueryString([])).toBe('');
    expect(buildQueryString([createParamRow()])).toBe('');
  });
});
