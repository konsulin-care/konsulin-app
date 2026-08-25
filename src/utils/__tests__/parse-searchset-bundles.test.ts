import type { Bundle, Condition } from 'fhir/r4';
import { describe, expect, it } from 'vitest';
import { parseConditionBundle } from '../parse-searchset-bundles';

/** Build a minimal Condition bundle with evidence. */
function makeConditionBundle(overrides: Partial<Condition> = {}): Bundle {
  return {
    resourceType: 'Bundle',
    type: 'searchset',
    entry: [
      {
        resource: {
          resourceType: 'Condition',
          id: 'cond-1',
          code: { text: 'Headache' },
          meta: { lastUpdated: '2025-01-01T00:00:00Z' },
          ...overrides
        } as Condition
      }
    ]
  };
}

describe('parseConditionBundle', () => {
  it('extracts evidence codes as bullet points', () => {
    const bundle = makeConditionBundle({
      evidence: [
        {
          code: [{ text: 'MRI shows lesion' }, { text: 'Patient reports pain' }]
        }
      ]
    });

    const records = parseConditionBundle(bundle);
    expect(records).toHaveLength(1);
    expect(records[0].result).toBe(
      '- MRI shows lesion\n- Patient reports pain'
    );
  });

  it('handles evidence entry with no code field without crashing', () => {
    const bundle = makeConditionBundle({
      evidence: [{ detail: [{ reference: 'Observation/obs-1' }] }]
    });

    const records = parseConditionBundle(bundle);
    expect(records).toHaveLength(1);
    expect(records[0].result).toBe('');
  });

  it('handles undefined evidence without crashing', () => {
    const bundle = makeConditionBundle({
      evidence: undefined
    });

    const records = parseConditionBundle(bundle);
    expect(records).toHaveLength(1);
    expect(records[0].result).toBe('');
  });

  it('handles empty evidence array without crashing', () => {
    const bundle = makeConditionBundle({
      evidence: []
    });

    const records = parseConditionBundle(bundle);
    expect(records).toHaveLength(1);
    expect(records[0].result).toBe('');
  });
});
