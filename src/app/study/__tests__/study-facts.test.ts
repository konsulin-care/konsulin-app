import { describe, expect, it } from 'vitest';
import { getBackItems, studyKind, timeNeeded } from '../study-facts';

const b = (id: string, q: string[] = []) => ({
  id,
  start: '2026-01-01',
  end: '2026-01-31',
  questionnaireIds: q
});

describe('study-facts', () => {
  it('sums durations and is undefined when any unknown', () => {
    expect(timeNeeded(b('1', ['a', 'b']), { a: 3, b: 4 })).toBe(7);
    expect(timeNeeded(b('1', ['a', 'b']), { a: 3 })).toBeUndefined();
  });

  it('reports one-time or batch i of n', () => {
    expect(studyKind({ batches: [b('1')] })).toEqual({ kind: 'one-time' });
    const batches = [b('1'), b('2'), b('3')];
    expect(studyKind({ batches, currentBatch: batches[1] })).toEqual({
      kind: 'repeated',
      index: 2,
      total: 3
    });
  });

  it('follows batch-count and shares-findings rules', () => {
    expect(
      getBackItems({ batches: [b('1')] }, { sharesFindings: false })
    ).toEqual(['personal']);
    expect(
      getBackItems({ batches: [b('1'), b('2')] }, { sharesFindings: true })
    ).toEqual(['personal', 'comparison', 'findings']);
  });
});
