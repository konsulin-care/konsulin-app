/**
 * Pure helpers that transform dynamic-form input into a FHIR resource payload
 * and a query string. Kept free of React/network so they are unit-testable.
 */

/** Supported field value shapes in the dynamic form. */
export type FieldValueType = 'string' | 'boolean' | 'number' | 'json' | 'array';

/** Describes one editable field of a FHIR resource schema. */
export interface AdminField {
  /** FHIR JSON path (dots nest), e.g. address.city. */
  key: string;
  /** Human-readable label. */
  label: string;
  /** Value shape when constructing the payload. */
  type: FieldValueType;
  /** Placeholder hint for the input. */
  placeholder?: string;
}

/** Curated common fields per FHIR resource, derived from live resources. */
const RESOURCE_SCHEMAS: Record<string, AdminField[]> = {
  Organization: [
    { key: 'active', label: 'Active', type: 'boolean' },
    { key: 'name', label: 'Name', type: 'string' },
    {
      key: 'partOf',
      label: 'Part of (reference)',
      type: 'json',
      placeholder: '{"reference":"Organization/..."}'
    }
  ],
  Location: [
    { key: 'status', label: 'Status', type: 'string', placeholder: 'active' },
    { key: 'name', label: 'Name', type: 'string' },
    { key: 'address.line', label: 'Address line', type: 'string' },
    { key: 'address.city', label: 'City', type: 'string' },
    { key: 'address.state', label: 'State', type: 'string' },
    { key: 'address.postalCode', label: 'Postal code', type: 'string' },
    { key: 'position.longitude', label: 'Longitude', type: 'number' },
    { key: 'position.latitude', label: 'Latitude', type: 'number' },
    {
      key: 'managingOrganization',
      label: 'Managing organization',
      type: 'json',
      placeholder: '{"reference":"Organization/..."}'
    },
    {
      key: 'hoursOfOperation',
      label: 'Hours of operation',
      type: 'json',
      placeholder:
        '[{"daysOfWeek":["mon"],"openingTime":"08:00:00","closingTime":"18:00:00"}]'
    }
  ],
  HealthcareService: [
    { key: 'active', label: 'Active', type: 'boolean' },
    {
      key: 'providedBy',
      label: 'Provided by',
      type: 'json',
      placeholder: '{"reference":"Organization/..."}'
    },
    { key: 'name', label: 'Name', type: 'string' },
    { key: 'extraDetails', label: 'Extra details', type: 'string' },
    {
      key: 'extension',
      label: 'Extension (fee, duration)',
      type: 'json',
      placeholder:
        '[{"url":".../fee","valueMoney":{"value":250000,"currency":"IDR"}}]'
    }
  ],
  PractitionerRole: [
    { key: 'active', label: 'Active', type: 'boolean' },
    {
      key: 'organization',
      label: 'Organization',
      type: 'json',
      placeholder: '{"reference":"Organization/..."}'
    },
    {
      key: 'location',
      label: 'Location',
      type: 'json',
      placeholder: '{"reference":"Location/..."}'
    },
    {
      key: 'practitioner',
      label: 'Practitioner',
      type: 'json',
      placeholder: '{"reference":"Practitioner/..."}'
    },
    {
      key: 'period',
      label: 'Active period',
      type: 'json',
      placeholder: '{"start":"2026-01-01T00:00:00+07:00"}'
    }
  ],
  Practitioner: [
    { key: 'active', label: 'Active', type: 'boolean' },
    {
      key: 'name',
      label: 'Name',
      type: 'json',
      placeholder: '[{"use":"official","family":"...","given":["..."]}]'
    },
    {
      key: 'gender',
      label: 'Gender',
      type: 'string',
      placeholder: 'male|female|other|unknown'
    },
    {
      key: 'birthDate',
      label: 'Birth date',
      type: 'string',
      placeholder: '1990-01-01'
    },
    {
      key: 'telecom',
      label: 'Telecom',
      type: 'json',
      placeholder: '[{"system":"email","value":"..."}]'
    }
  ],
  Schedule: [
    {
      key: 'actor',
      label: 'Actor references',
      type: 'json',
      placeholder: '[{"reference":"Practitioner/..."}]'
    },
    { key: 'comment', label: 'Comment', type: 'string' }
  ],
  Slot: [
    {
      key: 'status',
      label: 'Status',
      type: 'string',
      placeholder: 'free|busy'
    },
    {
      key: 'start',
      label: 'Start',
      type: 'string',
      placeholder: '2030-01-01T10:00:00+07:00'
    },
    {
      key: 'end',
      label: 'End',
      type: 'string',
      placeholder: '2030-01-01T10:30:00+07:00'
    },
    {
      key: 'schedule',
      label: 'Schedule',
      type: 'json',
      placeholder: '{"reference":"Schedule/..."}'
    }
  ],
  Questionnaire: [
    {
      key: 'status',
      label: 'Status',
      type: 'string',
      placeholder: 'draft|active'
    },
    { key: 'title', label: 'Title', type: 'string' },
    { key: 'description', label: 'Description', type: 'string' },
    {
      key: 'subjectType',
      label: 'Subject types',
      type: 'json',
      placeholder: '["Patient","Practitioner"]'
    },
    {
      key: 'item',
      label: 'Items',
      type: 'json',
      placeholder: '[{"linkId":"q1","text":"...","type":"choice"}]'
    }
  ],
  PlanDefinition: [
    { key: 'title', label: 'Title', type: 'string' },
    {
      key: 'status',
      label: 'Status',
      type: 'string',
      placeholder: 'draft|active|retired'
    },
    {
      key: 'effectivePeriod',
      label: 'Effective period',
      type: 'json',
      placeholder: '{"start":"2026-07-01","end":"2026-07-31"}'
    },
    {
      key: 'action',
      label: 'Actions',
      type: 'json',
      placeholder: '[{"definitionCanonical":"https://.../Questionnaire/..."}]'
    }
  ],
  ResearchStudy: [
    { key: 'title', label: 'Title', type: 'string' },
    {
      key: 'status',
      label: 'Status',
      type: 'string',
      placeholder: 'active|completed'
    },
    {
      key: 'enrollment',
      label: 'Enrollment',
      type: 'json',
      placeholder: '[{"reference":"ResearchSubject/..."}]'
    }
  ],
  Patient: [
    { key: 'active', label: 'Active', type: 'boolean' },
    {
      key: 'name',
      label: 'Name',
      type: 'json',
      placeholder: '[{"use":"official","family":"...","given":["..."]}]'
    },
    {
      key: 'gender',
      label: 'Gender',
      type: 'string',
      placeholder: 'male|female|other|unknown'
    },
    {
      key: 'birthDate',
      label: 'Birth date',
      type: 'string',
      placeholder: '1990-01-01'
    },
    {
      key: 'telecom',
      label: 'Telecom',
      type: 'json',
      placeholder: '[{"system":"email","value":"..."}]'
    }
  ],
  Person: [
    { key: 'active', label: 'Active', type: 'boolean' },
    {
      key: 'name',
      label: 'Name',
      type: 'json',
      placeholder: '[{"use":"official","family":"...","given":["..."]}]'
    }
  ],
  Invoice: [
    {
      key: 'status',
      label: 'Status',
      type: 'string',
      placeholder: 'issued|paid|draft'
    },
    {
      key: 'totalGross',
      label: 'Total gross',
      type: 'json',
      placeholder: '{"value":250000,"currency":"IDR"}'
    }
  ],
  Media: [
    {
      key: 'status',
      label: 'Status',
      type: 'string',
      placeholder: 'preparation|completed'
    },
    {
      key: 'content',
      label: 'Content',
      type: 'json',
      placeholder: '{"contentType":"image/png","url":"..."}'
    }
  ]
};

/**
 * Returns the curated fields for a resource type, or an empty list when the
 * resource has no curated schema (falls back to the raw JSON escape hatch).
 *
 * @param resourceType - FHIR resource type name
 * @returns list of editable field descriptors
 */
export function getFieldSchemas(
  resourceType: string | undefined
): AdminField[] {
  if (!resourceType) return [];
  return RESOURCE_SCHEMAS[resourceType] ?? [];
}

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
