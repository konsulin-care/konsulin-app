import type { Condition } from 'fhir/r4';
import { describe, expect, it } from 'vitest';
import { extractCondition } from '../condition-extract';

describe('extractCondition', () => {
  it('extracts evidence codes as bullet list', () => {
    const cond: Condition = {
      resourceType: 'Condition',
      id: 'cond-1',
      subject: { reference: 'Patient/pat-1' },
      code: { text: 'Headache' },
      evidence: [
        {
          code: [{ text: 'MRI shows lesion' }, { text: 'Patient reports pain' }]
        }
      ],
      meta: { lastUpdated: '2025-01-01T00:00:00Z' }
    };
    const result = extractCondition(cond);
    expect(result.type).toBe('Condition');
    expect(result.id).toBe('Condition/cond-1');
    expect(result.title).toBe('Headache');
    expect(result.result).toBe('- MRI shows lesion\n- Patient reports pain');
  });

  it('handles condition without evidence', () => {
    const cond: Condition = {
      resourceType: 'Condition',
      id: 'cond-2',
      subject: { reference: 'Patient/pat-1' },
      code: { text: 'Test' },
      meta: { lastUpdated: '2025-01-01T00:00:00Z' }
    };
    const result = extractCondition(cond);
    expect(result.result).toBe('');
  });

  it('handles evidence with empty code arrays', () => {
    const cond: Condition = {
      resourceType: 'Condition',
      id: 'cond-3',
      subject: { reference: 'Patient/pat-1' },
      code: { text: 'Empty' },
      evidence: [{ code: [] }],
      meta: { lastUpdated: '2025-01-01T00:00:00Z' }
    };
    const result = extractCondition(cond);
    expect(result.result).toBe('');
  });
});
