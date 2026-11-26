import { render, screen } from '@testing-library/react';
import type { QuestionnaireResponse } from 'fhir/r4';
import { describe, expect, it, vi } from 'vitest';

vi.mock('@/i18n', async () => {
  const { createUseTranslationsMock } =
    await import('@/i18n/__tests__/test-messages');
  return { useTranslations: createUseTranslationsMock() };
});

import { scanSource } from '@/styles/__tests__/raw-color-scan';
import type { ResearchBatch } from '@/utils/fhir/research';

import { completedBatchSummary } from '../batch-meta';
import { ReportHero, type ReportHeroProps } from '../report-hero';

const DURATIONS = new Map<string, number | null>([
  ['phq2', 8],
  ['ocean', 15]
]);

const AUGUST_BATCH: ResearchBatch = {
  id: 'b1',
  start: '2026-08-01',
  end: '2026-08-31',
  questionnaireIds: ['phq2', 'ocean']
};
const SEPTEMBER_BATCH: ResearchBatch = {
  id: 'b2',
  start: '2026-09-01',
  end: '2026-09-30',
  questionnaireIds: ['phq2', 'ocean']
};

/** Minimal completed response pointing at a bare questionnaire id. */
function makeResponse(
  id: string,
  questionnaire: string,
  authored: string
): QuestionnaireResponse {
  return {
    resourceType: 'QuestionnaireResponse',
    id,
    questionnaire: `Questionnaire/${questionnaire}`,
    status: 'completed',
    authored,
    item: []
  };
}

/** Default hero props: patient, no completion flag, two batches. */
function makeProps(overrides: Partial<ReportHeroProps> = {}): ReportHeroProps {
  return {
    studyTitle: 'Mental Health Survey',
    completed: false,
    today: '2026-09-10',
    batches: [AUGUST_BATCH, SEPTEMBER_BATCH],
    buckets: new Map<string, QuestionnaireResponse[]>(),
    durationByQuestionnaire: DURATIONS,
    totalXp: 0,
    isPatient: true,
    latestBatchByQuestionnaire: new Map<string, string>(),
    ...overrides
  };
}

const NO_TIMELINE_OR_NUDGE = [
  'report-hero-timeline',
  'report-hero-timeline-dot',
  'report-claim-nudge',
  'report-hero-next-batch'
];

describe('ReportHero', () => {
  it('announces the completed batch without XP when completed=1', () => {
    render(
      <ReportHero
        {...makeProps({
          completed: true,
          buckets: new Map<string, QuestionnaireResponse[]>([
            ['b1', [makeResponse('r1', 'phq2', '2026-08-15T10:00:00Z')]],
            [
              'b2',
              [
                makeResponse('r2', 'phq2', '2026-09-10T10:00:00Z'),
                makeResponse('r3', 'ocean', '2026-09-11T10:00:00Z')
              ]
            ]
          ])
        })}
      />
    );
    expect(screen.getByTestId('report-hero-headline')).toHaveTextContent(
      'Batch 2 done. Thank you.'
    );
    expect(screen.queryByTestId('report-study-title')).toBeNull();
  });

  it('shows the study title when the completed flag is absent', () => {
    render(<ReportHero {...makeProps()} />);
    expect(screen.getByTestId('report-study-title')).toHaveTextContent(
      'Mental Health Survey'
    );
    expect(screen.queryByTestId('report-hero-headline')).toBeNull();
  });

  it('renders no level label, XP text or level bar', () => {
    render(<ReportHero {...makeProps({ isPatient: true, totalXp: 45 })} />);
    for (const id of [
      'report-hero-level',
      'report-hero-level-label',
      'report-hero-level-xp',
      'report-hero-level-bar'
    ]) {
      expect(screen.queryByTestId(id)).toBeNull();
    }
    for (const testId of NO_TIMELINE_OR_NUDGE) {
      expect(screen.queryByTestId(testId)).toBeNull();
    }
  });

  it('shows a guest only the headline, with no level bar or nudge', () => {
    render(<ReportHero {...makeProps({ isPatient: false })} />);
    expect(screen.getByTestId('report-study-title')).toHaveTextContent(
      'Mental Health Survey'
    );
    expect(screen.queryByTestId('report-hero-level')).toBeNull();
    for (const testId of NO_TIMELINE_OR_NUDGE) {
      expect(screen.queryByTestId(testId)).toBeNull();
    }
  });

  it('renders the baseline note exactly once when a card is a baseline', () => {
    render(
      <ReportHero
        {...makeProps({
          buckets: new Map<string, QuestionnaireResponse[]>([
            ['b1', [makeResponse('r1', 'phq2', '2026-08-15T10:00:00Z')]]
          ]),
          latestBatchByQuestionnaire: new Map<string, string>([['phq2', 'b1']])
        })}
      />
    );
    expect(screen.getAllByTestId('report-hero-baseline-note')).toHaveLength(1);
  });

  it('renders the hero with design tokens only for patients and guests', () => {
    const { rerender } = render(
      <ReportHero {...makeProps({ isPatient: true, totalXp: 45 })} />
    );
    const collect = (): string => {
      const hero = screen.getByTestId('report-hero');
      return [hero, ...hero.querySelectorAll('*')]
        .map(node => node.getAttribute('class') ?? '')
        .join(' ');
    };
    expect(scanSource(collect())).toEqual([]);

    rerender(<ReportHero {...makeProps({ isPatient: false })} />);
    expect(scanSource(collect())).toEqual([]);
  });
});

describe('completedBatchSummary', () => {
  const buckets = new Map<string, QuestionnaireResponse[]>([
    ['b1', [makeResponse('r1', 'phq2', '2026-08-15T10:00:00Z')]],
    [
      'b2',
      [
        makeResponse('r2', 'phq2', '2026-09-10T10:00:00Z'),
        makeResponse('r3', 'phq2', '2026-09-11T10:00:00Z'),
        makeResponse('r4', 'ocean', '2026-09-12T10:00:00Z')
      ]
    ]
  ]);

  it('picks the participated batch containing today with its index and XP', () => {
    const summary = completedBatchSummary(
      [AUGUST_BATCH, SEPTEMBER_BATCH],
      ['b1', 'b2'],
      buckets,
      DURATIONS,
      '2026-09-15'
    );
    expect(summary?.batch.id).toBe('b2');
    expect(summary?.index).toBe(2);
    // Distinct questionnaires only: (phq2 8 + ocean 15) x 5 XP/minute.
    expect(summary?.xp).toBe(115);
  });

  it('falls back to the latest participated batch when today is outside', () => {
    const summary = completedBatchSummary(
      [AUGUST_BATCH, SEPTEMBER_BATCH],
      ['b1', 'b2'],
      buckets,
      DURATIONS,
      '2026-10-15'
    );
    expect(summary?.batch.id).toBe('b2');
    expect(summary?.index).toBe(2);
  });

  it('ignores a batch containing today when it was not participated', () => {
    const summary = completedBatchSummary(
      [AUGUST_BATCH, SEPTEMBER_BATCH],
      ['b1'],
      buckets,
      DURATIONS,
      '2026-09-15'
    );
    expect(summary?.batch.id).toBe('b1');
    expect(summary?.index).toBe(1);
  });

  it('returns null when no batch was participated', () => {
    expect(
      completedBatchSummary(
        [AUGUST_BATCH, SEPTEMBER_BATCH],
        [],
        buckets,
        DURATIONS,
        '2026-09-15'
      )
    ).toBeNull();
  });
});
