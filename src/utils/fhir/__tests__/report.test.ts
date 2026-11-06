import { describe, expect, it } from 'vitest';
import {
  bucketResponsesByBatch,
  computeParticipationStats,
  deduplicateBuckets,
  trendForQuestionnaire
} from '../report';
import type { ResearchBatch, StudyProgress } from '../research';

const BATCHES: ResearchBatch[] = [
  {
    id: 'b1',
    start: '2026-08-01',
    end: '2026-08-31',
    questionnaireIds: ['phq2', 'ocean']
  },
  {
    id: 'b2',
    start: '2026-09-01',
    end: '2026-09-30',
    questionnaireIds: ['phq2']
  },
  {
    id: 'b3',
    start: '2026-10-01',
    end: '2026-10-31',
    questionnaireIds: ['gad7']
  }
];

/** Minimal response fixture; full QRs are structurally compatible. */
function resp(id: string, questionnaire: string, authored?: string) {
  return {
    resourceType: 'QuestionnaireResponse' as const,
    id,
    questionnaire: `Questionnaire/${questionnaire}`,
    status: 'completed' as const,
    authored
  };
}

describe('bucketResponsesByBatch', () => {
  it('buckets authored responses into their batch window', () => {
    const buckets = bucketResponsesByBatch(
      [resp('r1', 'phq2', '2026-08-15T10:00:00Z')],
      BATCHES
    );
    expect(buckets.get('b1')).toEqual([
      resp('r1', 'phq2', '2026-08-15T10:00:00Z')
    ]);
    expect(buckets.get('b2')).toBeUndefined();
  });

  it('assigns a questionnaire shared by batches to the batch matching its authored date', () => {
    const buckets = bucketResponsesByBatch(
      [resp('r2', 'phq2', '2026-09-10T10:00:00Z')],
      BATCHES
    );
    expect(buckets.get('b2')).toHaveLength(1);
    expect(buckets.get('b1')).toBeUndefined();
  });

  it('drops responses authored outside every batch window', () => {
    const buckets = bucketResponsesByBatch(
      [resp('r3', 'phq2', '2025-01-01T10:00:00Z')],
      BATCHES
    );
    expect(buckets.size).toBe(0);
  });

  it('falls back to the first batch containing the questionnaire when authored is missing', () => {
    const buckets = bucketResponsesByBatch([resp('r4', 'phq2')], BATCHES);
    expect(buckets.get('b1')).toEqual([resp('r4', 'phq2')]);
  });

  it('drops responses whose questionnaire belongs to no batch', () => {
    const buckets = bucketResponsesByBatch(
      [resp('r5', 'sleep', '2026-08-15T10:00:00Z')],
      BATCHES
    );
    expect(buckets.size).toBe(0);
  });

  it('keeps multiple responses for one batch', () => {
    const buckets = bucketResponsesByBatch(
      [
        resp('r6', 'phq2', '2026-08-05T10:00:00Z'),
        resp('r7', 'ocean', '2026-08-06T10:00:00Z')
      ],
      BATCHES
    );
    expect(buckets.get('b1')).toHaveLength(2);
  });
});

describe('deduplicateBuckets', () => {
  it('keeps the most recent response per questionnaire within a batch', () => {
    const buckets = new Map([
      [
        'b1',
        [
          resp('old', 'phq2', '2026-08-10T10:00:00Z'),
          resp('new', 'phq2', '2026-08-20T10:00:00Z')
        ]
      ]
    ]);
    const deduped = deduplicateBuckets(buckets);
    const b1 = deduped.get('b1');
    expect(b1).toHaveLength(1);
    expect(b1?.[0]?.id).toBe('new');
  });

  it('keeps different questionnaires in the same batch', () => {
    const buckets = new Map([
      [
        'b1',
        [
          resp('r1', 'phq2', '2026-08-10T10:00:00Z'),
          resp('r2', 'ocean', '2026-08-12T10:00:00Z')
        ]
      ]
    ]);
    const deduped = deduplicateBuckets(buckets);
    expect(deduped.get('b1')).toHaveLength(2);
  });

  it('treats missing authored as oldest', () => {
    const buckets = new Map([
      [
        'b1',
        [resp('no-date', 'phq2'), resp('dated', 'phq2', '2026-08-20T10:00:00Z')]
      ]
    ]);
    const deduped = deduplicateBuckets(buckets);
    expect(deduped.get('b1')?.[0]?.id).toBe('dated');
  });

  it('preserves empty buckets', () => {
    const buckets = new Map([['b1', []]]);
    const deduped = deduplicateBuckets(buckets);
    expect(deduped.get('b1')).toHaveLength(0);
  });

  it('prevents duplicate trend rows when combined with trendForQuestionnaire', () => {
    const batches: ResearchBatch[] = [
      {
        id: 'b1',
        start: '2026-08-01',
        end: '2026-08-31',
        questionnaireIds: ['phq2']
      },
      {
        id: 'b2',
        start: '2026-09-01',
        end: '2026-09-30',
        questionnaireIds: ['phq2']
      }
    ];
    // Two phq2 responses in b2, one in b1
    const buckets = bucketResponsesByBatch(
      [
        resp('r1', 'phq2', '2026-08-15T10:00:00Z'),
        resp('r2', 'phq2', '2026-09-10T10:00:00Z'),
        resp('r3', 'phq2', '2026-09-20T10:00:00Z')
      ],
      batches
    );
    // Without dedup: 3 rows (b1:1, b2:2) => trend with duplicate labels
    expect(buckets.get('b2')).toHaveLength(2);
    const deduped = deduplicateBuckets(buckets);
    expect(deduped.get('b2')).toHaveLength(1);
    // Trend should now have exactly 2 rows from distinct batches
    const trend = trendForQuestionnaire('phq2', deduped, batches);
    expect(trend.kind).toBe('trend');
    if (trend.kind !== 'trend') return;
    expect(trend.rows).toHaveLength(2);
    const labels = trend.rows.map(row => row.batchId);
    expect(new Set(labels).size).toBe(2);
  });
});

describe('trendForQuestionnaire', () => {
  it('returns none when the instrument appears in only one batch', () => {
    const buckets = bucketResponsesByBatch(
      [resp('r8', 'gad7', '2026-10-15T10:00:00Z')],
      BATCHES
    );
    expect(trendForQuestionnaire('gad7', buckets, BATCHES)).toEqual({
      kind: 'none'
    });
  });

  it('returns baseline when a repeated instrument has a single response', () => {
    const buckets = bucketResponsesByBatch(
      [resp('r9', 'phq2', '2026-08-15T10:00:00Z')],
      BATCHES
    );
    expect(trendForQuestionnaire('phq2', buckets, BATCHES)).toEqual({
      kind: 'baseline'
    });
  });

  it('returns chronological trend rows when a repeated instrument has multiple responses', () => {
    const buckets = bucketResponsesByBatch(
      [
        resp('r10', 'phq2', '2026-09-10T10:00:00Z'),
        resp('r11', 'phq2', '2026-08-15T10:00:00Z')
      ],
      BATCHES
    );
    const trend = trendForQuestionnaire('phq2', buckets, BATCHES);
    expect(trend.kind).toBe('trend');
    if (trend.kind !== 'trend') return;
    expect(trend.rows.map(row => row.batchId)).toEqual(['b1', 'b2']);
    expect(trend.rows[0]?.label).toContain('Batch 1');
    expect(trend.rows[1]?.label).toContain('Batch 2');
  });
});

describe('computeParticipationStats', () => {
  const study: StudyProgress = {
    study: {
      resourceType: 'ResearchStudy',
      id: 'research',
      status: 'active',
      title: 'Mental Health Survey'
    },
    batches: BATCHES,
    currentBatch: BATCHES[0] ?? null,
    completedCount: 2,
    totalCount: 2,
    isComplete: true,
    firstUncompletedQuestionnaireId: null,
    completedQuestionnaireIds: ['phq2', 'ocean'],
    // History disagrees with the responses on purpose: participation and
    // streak must be derived from the response buckets, not from history.
    history: BATCHES.map(batch => ({
      batchId: batch.id,
      start: batch.start,
      end: batch.end,
      participated: false
    })),
    consecutiveBatches: 0
  };

  it('derives completion, streak, and time invested from de-duplicated buckets', () => {
    const responses = [
      resp('r12', 'phq2', '2026-08-15T10:00:00Z'),
      resp('r13', 'ocean', '2026-08-16T10:00:00Z'),
      resp('r14', 'phq2', '2026-09-10T10:00:00Z'),
      // Second phq2 submission inside b2: de-duplicated away.
      resp('r15', 'phq2', '2026-09-20T10:00:00Z')
    ];
    const stats = computeParticipationStats(
      study,
      responses,
      new Map([
        ['phq2', 8],
        ['ocean', 15]
      ])
    );
    // One response per questionnaire per batch: 2 (b1) + 1 (b2), not 4 raw.
    expect(stats.assessmentsCompleted).toBe(3);
    // Every history entry says participated=false; the buckets say b1, b2.
    expect(stats.batchesCompleted).toBe(2);
    expect(stats.totalBatches).toBe(3);
    // Streak from buckets (b1, b2), not study.consecutiveBatches (0).
    expect(stats.consecutiveBatches).toBe(2);
    // Distinct questionnaire per batch: phq2+ocean (b1), phq2 (b2)
    // XP = duration × 5 → (8+15+8) × 5
    expect(stats.xp).toBe(155);
    // Durations over de-duplicated responses: 8 + 15 + 8, not 39.
    expect(stats.timeInvestedMinutes).toBe(31);
  });

  it('resets the streak when an inner batch has no responses', () => {
    const responses = [
      resp('r16', 'phq2', '2026-08-15T10:00:00Z'),
      resp('r17', 'gad7', '2026-10-15T10:00:00Z')
    ];
    const stats = computeParticipationStats(
      study,
      responses,
      new Map([
        ['phq2', 8],
        ['gad7', 10]
      ])
    );
    expect(stats.batchesCompleted).toBe(2);
    // b1 and b3 participated but b2 did not: run at the newest batch is 1.
    expect(stats.consecutiveBatches).toBe(1);
  });

  it('returns zeroed stats for no responses', () => {
    const stats = computeParticipationStats(study, [], new Map());
    expect(stats.assessmentsCompleted).toBe(0);
    expect(stats.batchesCompleted).toBe(0);
    expect(stats.consecutiveBatches).toBe(0);
    expect(stats.xp).toBe(0);
    expect(stats.timeInvestedMinutes).toBe(0);
  });
});
