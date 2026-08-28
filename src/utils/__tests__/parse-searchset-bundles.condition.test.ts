import type { Bundle, Condition } from 'fhir/r4';
import { describe, expect, it } from 'vitest';
import { parseConditionBundle } from '../fhir/searchset-bundle';

/** Helper: build a Condition searchset Bundle. */
function condBundle(
  items: Array<{
    id: string;
    lastUpdated: string;
    codeText: string;
    evidence?: Array<{ codeTexts: string[] }>;
  }>
): Bundle {
  const entry = items.map(i => {
    const evidence = i.evidence?.map(e => ({
      code: e.codeTexts.map(t => ({ text: t }))
    }));
    const c: Condition = {
      resourceType: 'Condition',
      id: i.id,
      subject: { reference: 'Patient/pat-1' },
      code: { text: i.codeText },
      clinicalStatus: { coding: [{ code: 'active' }] },
      evidence,
      meta: { lastUpdated: i.lastUpdated }
    } as Condition;
    return { resource: c };
  });
  return { resourceType: 'Bundle', type: 'searchset', entry } as Bundle;
}

describe('parseConditionBundle', () => {
  it('parses Condition entries', () => {
    const b = condBundle([
      {
        id: 'cond-1',
        lastUpdated: '2024-06-01T00:00:00Z',
        codeText: 'Hypertension'
      }
    ]);
    const result = parseConditionBundle(b);
    expect(result).toHaveLength(1);
    expect(result[0].type).toBe('Condition');
    expect(result[0].resourceType).toBe('Condition');
    expect(result[0].title).toBe('Hypertension');
  });

  it('renders evidence as markdown bullet list in result', () => {
    const b = condBundle([
      {
        id: 'cond-ev',
        lastUpdated: '2024-06-01T00:00:00Z',
        codeText: 'Asthma',
        evidence: [
          { codeTexts: ['Imaging confirms diagnosis'] },
          { codeTexts: ['Lab results show elevated markers'] }
        ]
      }
    ]);
    const result = parseConditionBundle(b);
    expect(result).toHaveLength(1);
    expect(result[0].type).toBe('Condition');
    expect(result[0].result).toBe(
      '- Imaging confirms diagnosis\n- Lab results show elevated markers'
    );
  });

  it('handles multiple conditions', () => {
    const b = condBundle([
      { id: 'cond-1', lastUpdated: '2024-06-01T00:00:00Z', codeText: 'A' },
      { id: 'cond-2', lastUpdated: '2024-06-02T00:00:00Z', codeText: 'B' }
    ]);
    expect(parseConditionBundle(b)).toHaveLength(2);
  });

  it('returns empty for empty bundle', () => {
    expect(
      parseConditionBundle({
        resourceType: 'Bundle',
        type: 'searchset',
        entry: []
      } as Bundle)
    ).toEqual([]);
  });
});
