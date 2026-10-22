/**
 * Pure helpers that transform dynamic-form input into a FHIR resource payload
 * and a query string. Kept free of React/network so they are unit-testable.
 */

export { getFieldSchemas } from './schemas';
export type { AdminField, FieldValueType } from './schemas';
import { type FieldValueType, getFieldSchemas } from './schemas';

/**
 * Coerces a form string into the field's typed value.
 *
 * @param type - target value shape
 * @param raw - raw form input
 * @returns coerced value (raw string fallback on failed parse)
 */
export function coerceFieldValue(
  type: FieldValueType,
  raw: string
): string | boolean | number | unknown[] | Record<string, unknown> {
  switch (type) {
    case 'boolean': {
      return raw === 'true';
    }
    case 'number': {
      const n = Number(raw);
      return Number.isFinite(n) ? n : raw;
    }
    case 'json':
    case 'array': {
      try {
        return JSON.parse(raw) as unknown[] | Record<string, unknown>;
      } catch {
        if (type === 'array') {
          return raw
            .split(',')
            .map(part => part.trim())
            .filter(Boolean);
        }
        return raw;
      }
    }
    default: {
      return raw;
    }
  }
}

/** Sets a dotted path value on a nested object, creating containers as needed. */
function setNested(obj: Record<string, unknown>, key: string, value: unknown) {
  const parts = key.split('.');
  let cursor = obj;
  for (let i = 0; i < parts.length - 1; i++) {
    const part = parts[i];
    const existing = cursor[part];
    if (typeof existing !== 'object' || existing === null) {
      cursor[part] = {};
    }
    cursor = cursor[part] as Record<string, unknown>;
  }
  cursor[parts.at(-1) ?? ''] = value;
}

/**
 * Recursively removes `__proto__` and `constructor` keys from an object
 * tree to prevent prototype pollution.
 *
 * @param obj - the value to sanitize (mutated in place)
 * @returns the sanitized value
 */
function sanitizeKeys(
  obj: Record<string, unknown> | unknown[]
): Record<string, unknown> | unknown[] {
  if (Array.isArray(obj)) {
    for (const item of obj) {
      if (item !== null && typeof item === 'object') {
        sanitizeKeys(item as Record<string, unknown>);
      }
    }
    return obj;
  }
  for (const key of Object.keys(obj)) {
    if (key === '__proto__' || key === 'constructor') {
      // eslint-disable-next-line @typescript-eslint/no-dynamic-delete
      delete obj[key];
      continue;
    }
    const value = obj[key];
    if (value !== null && typeof value === 'object') {
      sanitizeKeys(value as Record<string, unknown>);
    }
  }
  return obj;
}

/**
 * Deep-merges raw JSON over the base payload.
 *
 * @param base - payload built from curated fields
 * @param rawJson - escape-hatch JSON text (empty means no merge)
 * @returns the merged payload
 */
export function mergeRawJson(
  base: Record<string, unknown>,
  rawJson: string
): Record<string, unknown> {
  const trimmed = rawJson.trim();
  if (!trimmed) return base;
  const parsed = JSON.parse(trimmed) as Record<string, unknown>;
  // Guard against prototype pollution: recursively strip __proto__ and
  // constructor keys at every nesting level before merging.
  sanitizeKeys(parsed);
  return { ...base, ...parsed };
}

/**
 * Builds a FHIR resource payload from curated field values plus an optional
 * raw JSON escape hatch.
 *
 * @param resourceType - FHIR resource type (e.g. Organization)
 * @param values - key → raw form input; empty values are skipped
 * @param rawJson - optional escape-hatch JSON merged over the result
 * @returns the constructed payload object
 */
export function buildResourcePayload(
  resourceType: string,
  values: Record<string, string>,
  rawJson = ''
): Record<string, unknown> {
  const payload: Record<string, unknown> = { resourceType };
  for (const field of getFieldSchemas(resourceType)) {
    const raw = values[field.key];
    if (raw === undefined || raw === '') continue;
    setNested(payload, field.key, coerceFieldValue(field.type, raw));
  }
  return mergeRawJson(payload, rawJson);
}

/** One query-parameter row: key and value. */
export interface QueryParamRow {
  /** Stable row identifier for React list keys. */
  id: string;
  key: string;
  value: string;
}

let paramRowSeq = 0;

/**
 * Creates an empty query-parameter row with a unique id.
 *
 * @returns a new row ready for editing
 */
export function createParamRow(): QueryParamRow {
  paramRowSeq += 1;
  return { id: `param-${paramRowSeq}`, key: '', value: '' };
}

/**
 * Serializes query-parameter rows into a URL query string, skipping rows with
 * an empty key.
 *
 * @param rows - key/value rows
 * @returns the query string (with leading ?) or empty string
 */
export function buildQueryString(rows: QueryParamRow[]): string {
  const parts = rows
    .filter(row => row.key.trim() !== '')
    .map(
      row =>
        `${encodeURIComponent(row.key.trim())}=${encodeURIComponent(row.value)}`
    );
  return parts.length > 0 ? `?${parts.join('&')}` : '';
}
