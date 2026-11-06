import { describe, expect, it } from 'vitest';
import type { ResearchBatch } from '../research';
import {
  batchTimeline,
  getNextBatch,
  nextBatchWithQuestionnaire
} from '../research-schedule';

/** Builds a batch with a fixed window and questionnaire set. */
function makeBatch(
  id: string,
  start: string,
  end: string,
  questionnaireIds: string[]
): ResearchBatch {
  return { id, start, end, questionnaireIds };
}

const BATCH_JAN = makeBatch('batch-jan', '2026-01-01', '2026-01-20', ['phq2']);
const BATCH_FEB = makeBatch('batch-feb', '2026-02-01', '2026-02-28', ['gad7']);
const BATCH_MAR = makeBatch('batch-mar', '2026-03-01', '2026-03-31', ['phq2']);

describe('getNextBatch', () => {
  it('returns the first batch when today is before all batches', () => {
    expect(getNextBatch([BATCH_FEB, BATCH_JAN, BATCH_MAR], '2025-12-31')).toBe(
      BATCH_JAN
    );
  });

  it('returns the following batch when today is inside a batch', () => {
    expect(getNextBatch([BATCH_JAN, BATCH_FEB, BATCH_MAR], '2026-01-10')).toBe(
      BATCH_FEB
    );
  });

  it('returns the following batch when today falls between two batches', () => {
    expect(getNextBatch([BATCH_JAN, BATCH_FEB, BATCH_MAR], '2026-01-25')).toBe(
      BATCH_FEB
    );
  });

  it('returns null when today is after the last batch', () => {
    expect(getNextBatch([BATCH_JAN, BATCH_FEB, BATCH_MAR], '2026-04-01')).toBe(
      null
    );
  });
});

describe('nextBatchWithQuestionnaire', () => {
  it('skips later batches that do not include the questionnaire', () => {
    expect(
      nextBatchWithQuestionnaire(
        [BATCH_JAN, BATCH_FEB, BATCH_MAR],
        'phq2',
        '2026-01-10'
      )
    ).toBe(BATCH_MAR);
  });

  it('returns null when no later batch includes the questionnaire', () => {
    expect(
      nextBatchWithQuestionnaire(
        [BATCH_JAN, BATCH_FEB, BATCH_MAR],
        'phq2',
        '2026-03-31'
      )
    ).toBe(null);
  });
});

describe('batchTimeline', () => {
  const TODAY = '2026-03-10';
  const batches = [BATCH_JAN, BATCH_FEB, BATCH_MAR];

  it('marks past batches with responses as done', () => {
    const entries = batchTimeline(batches, ['batch-jan'], TODAY);
    expect(entries[0].status).toBe('done');
  });

  it('marks past batches without responses as missed', () => {
    const entries = batchTimeline(batches, ['batch-jan'], TODAY);
    expect(entries[1].status).toBe('missed');
  });

  it('marks the batch containing today as current', () => {
    const entries = batchTimeline(batches, ['batch-jan'], TODAY);
    expect(entries[2].status).toBe('current');
  });

  it('marks future batches as upcoming', () => {
    const future = makeBatch('batch-apr', '2026-04-01', '2026-04-30', ['phq2']);
    const entries = batchTimeline([...batches, future], ['batch-jan'], TODAY);
    expect(entries[3].status).toBe('upcoming');
  });

  it('returns entries sorted by start with 1-based indexes', () => {
    const entries = batchTimeline(
      [BATCH_MAR, BATCH_JAN, BATCH_FEB],
      ['batch-jan'],
      TODAY
    );
    expect(entries.map(entry => entry.batch.id)).toEqual([
      'batch-jan',
      'batch-feb',
      'batch-mar'
    ]);
    expect(entries.map(entry => entry.index)).toEqual([1, 2, 3]);
  });
});
