import { describe, expect, it } from 'vitest';

import type { ResearchBatch } from '@/utils/fhir/research';

import { batchTitle } from '../batch-meta';

const B1: ResearchBatch = {
  id: 'b1',
  start: '2026-08-01',
  end: '2026-08-31',
  questionnaireIds: ['phq2']
};
const B2: ResearchBatch = {
  id: 'b2',
  start: '2026-09-01',
  end: '2026-09-30',
  questionnaireIds: ['phq2']
};

describe('batchTitle', () => {
  /** Mirrors the en message report.batch_prefix: "Batch {index}". */
  const prefix = (index: number): string => `Batch ${index}`;

  it('compacts a same-month window into a single month label', () => {
    expect(batchTitle(B2, [B1, B2], prefix)).toBe('Batch 2: 01 - 30 Sep 2026');
    expect(batchTitle(B1, [B1, B2], prefix)).toBe('Batch 1: 01 - 31 Aug 2026');
  });

  it('uses the caller-supplied translated prefix', () => {
    const idPrefix = (index: number): string => `Batch ${index}`;
    expect(batchTitle(B1, [B1, B2], idPrefix)).toContain('Batch 1');
  });

  it('falls back to a full range when the window crosses months', () => {
    const crossMonth: ResearchBatch = {
      id: 'b3',
      start: '2026-08-01',
      end: '2026-09-30',
      questionnaireIds: ['phq2']
    };
    expect(batchTitle(crossMonth, [B1, B2, crossMonth], prefix)).toBe(
      'Batch 3: 01 Aug 2026 - 30 Sep 2026'
    );
  });
});
