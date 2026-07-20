import type { IRecord } from '@/types/record';
import { describe, expect, it } from 'vitest';
import { mergeRecords } from '../parse-searchset-bundles';

describe('mergeRecords', () => {
  it('merges multiple arrays and sorts by lastUpdated desc', () => {
    const records1: IRecord[] = [
      {
        type: 'QR',
        resourceType: 'QuestionnaireResponse',
        id: 'QR/qr-1',
        title: 'QR1',
        result: '',
        lastUpdated: '2024-06-01T00:00:00Z'
      },
      {
        type: 'QR',
        resourceType: 'QuestionnaireResponse',
        id: 'QR/qr-2',
        title: 'QR2',
        result: '',
        lastUpdated: '2024-06-03T00:00:00Z'
      }
    ];
    const records2: IRecord[] = [
      {
        type: 'Condition',
        resourceType: 'Condition',
        id: 'Condition/c-1',
        title: 'C1',
        result: '',
        lastUpdated: '2024-06-02T00:00:00Z'
      },
      {
        type: 'Condition',
        resourceType: 'Condition',
        id: 'Condition/c-2',
        title: 'C2',
        result: '',
        lastUpdated: '2024-06-04T00:00:00Z'
      }
    ];
    const merged = mergeRecords(records1, records2);
    expect(merged).toHaveLength(4);
    expect(merged[0].id).toBe('Condition/c-2');
    expect(merged[1].id).toBe('QR/qr-2');
    expect(merged[2].id).toBe('Condition/c-1');
    expect(merged[3].id).toBe('QR/qr-1');
  });

  it('deduplicates by resourceType/id', () => {
    const a: IRecord[] = [
      {
        type: 'QR',
        resourceType: 'QuestionnaireResponse',
        id: 'QuestionnaireResponse/qr-1',
        title: 'QR1',
        result: '',
        lastUpdated: '2024-06-01T00:00:00Z'
      }
    ];
    const b: IRecord[] = [
      {
        type: 'QR',
        resourceType: 'QuestionnaireResponse',
        id: 'QuestionnaireResponse/qr-1',
        title: 'QR1',
        result: '',
        lastUpdated: '2024-06-01T00:00:00Z'
      }
    ];
    const merged = mergeRecords(a, b);
    expect(merged).toHaveLength(1);
  });

  it('returns empty for empty input', () => {
    expect(mergeRecords()).toEqual([]);
    expect(mergeRecords([])).toEqual([]);
    expect(mergeRecords([], [])).toEqual([]);
  });

  it('uses stable tie-breaker by id when timestamps are equal', () => {
    const a: IRecord[] = [
      {
        type: 'A',
        resourceType: 'TypeA',
        id: 'TypeA/a-2',
        title: 'a2',
        result: '',
        lastUpdated: '2024-06-01T00:00:00Z'
      },
      {
        type: 'A',
        resourceType: 'TypeA',
        id: 'TypeA/a-1',
        title: 'a1',
        result: '',
        lastUpdated: '2024-06-01T00:00:00Z'
      }
    ];
    const b: IRecord[] = [
      {
        type: 'B',
        resourceType: 'TypeB',
        id: 'TypeB/b-1',
        title: 'b1',
        result: '',
        lastUpdated: '2024-06-01T00:00:00Z'
      }
    ];
    const merged = mergeRecords(a, b);
    expect(merged).toHaveLength(3);
    expect(merged[0].id).toBe('TypeA/a-1');
    expect(merged[1].id).toBe('TypeA/a-2');
    expect(merged[2].id).toBe('TypeB/b-1');
  });

  it('handles mixed chronological merging correctly (C3 inserts between C2 and QR2)', () => {
    const page1: IRecord[] = [
      {
        type: 'QR',
        resourceType: 'QuestionnaireResponse',
        id: 'QuestionnaireResponse/qr-1',
        title: 'QR1',
        result: '',
        lastUpdated: '2024-06-10T00:00:00Z'
      },
      {
        type: 'Condition',
        resourceType: 'Condition',
        id: 'Condition/c-1',
        title: 'C1',
        result: '',
        lastUpdated: '2024-06-09T00:00:00Z'
      },
      {
        type: 'Condition',
        resourceType: 'Condition',
        id: 'Condition/c-2',
        title: 'C2',
        result: '',
        lastUpdated: '2024-06-08T00:00:00Z'
      },
      {
        type: 'QR',
        resourceType: 'QuestionnaireResponse',
        id: 'QuestionnaireResponse/qr-2',
        title: 'QR2',
        result: '',
        lastUpdated: '2024-06-05T00:00:00Z'
      }
    ];
    const page2: IRecord[] = [
      {
        type: 'Condition',
        resourceType: 'Condition',
        id: 'Condition/c-3',
        title: 'C3',
        result: '',
        lastUpdated: '2024-06-07T00:00:00Z'
      },
      {
        type: 'Condition',
        resourceType: 'Condition',
        id: 'Condition/c-4',
        title: 'C4',
        result: '',
        lastUpdated: '2024-06-04T00:00:00Z'
      },
      {
        type: 'QR',
        resourceType: 'QuestionnaireResponse',
        id: 'QuestionnaireResponse/qr-3',
        title: 'QR3',
        result: '',
        lastUpdated: '2024-06-06T00:00:00Z'
      },
      {
        type: 'QR',
        resourceType: 'QuestionnaireResponse',
        id: 'QuestionnaireResponse/qr-4',
        title: 'QR4',
        result: '',
        lastUpdated: '2024-06-03T00:00:00Z'
      }
    ];
    const merged = mergeRecords(page1, page2);
    expect(merged).toHaveLength(8);
    expect(merged[0].title).toBe('QR1');
    expect(merged[1].title).toBe('C1');
    expect(merged[2].title).toBe('C2');
    expect(merged[3].title).toBe('C3');
    expect(merged[4].title).toBe('QR3');
    expect(merged[5].title).toBe('QR2');
    expect(merged[6].title).toBe('C4');
    expect(merged[7].title).toBe('QR4');
  });
});
