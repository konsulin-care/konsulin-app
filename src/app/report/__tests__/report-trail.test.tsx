import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

vi.mock('@/i18n', async () => {
  const { createUseTranslationsMock } =
    await import('@/i18n/__tests__/test-messages');
  return { useTranslations: createUseTranslationsMock() };
});

import type { ParticipationStats } from '@/utils/fhir/report';
import type { ResearchBatch, StudyProgress } from '@/utils/fhir/research';

import { ReportTrail } from '../report-trail';

const AUGUST_BATCH: ResearchBatch = {
  id: 'b1',
  start: '2026-08-01',
  end: '2026-08-31',
  questionnaireIds: ['phq-9']
};
const SEPTEMBER_BATCH: ResearchBatch = {
  id: 'b2',
  start: '2026-09-01',
  end: '2026-09-30',
  questionnaireIds: ['phq-9']
};

const STATS: ParticipationStats = {
  assessmentsCompleted: 3,
  batchesCompleted: 2,
  totalBatches: 2,
  timeInvestedMinutes: 24
};

/** Builds a minimal study progress for the given batches. */
function makeStudy(batches: ResearchBatch[]): StudyProgress {
  return {
    study: {
      resourceType: 'ResearchStudy',
      id: 'study-1',
      status: 'active',
      title: 'Mental Health Survey'
    },
    batches,
    currentBatch: null,
    completedCount: 0,
    totalCount: 0,
    isComplete: false,
    firstUncompletedQuestionnaireId: null,
    completedQuestionnaireIds: [],
    history: batches.map(batch => ({
      batchId: batch.id,
      start: batch.start,
      end: batch.end,
      participated: true
    })),
    consecutiveBatches: 2
  };
}

describe('ReportTrail', () => {
  it('renders the BatchTrail for the given study progress', () => {
    render(
      <ReportTrail
        study={makeStudy([AUGUST_BATCH, SEPTEMBER_BATCH])}
        stats={null}
        today='2026-09-10'
      />
    );

    const trail = screen.getByTestId('report-trail');
    expect(trail).toBeInTheDocument();
    expect(trail.querySelectorAll('ol > li')).toHaveLength(2);
  });

  it('renders the participation stats as one caption line with batches, total, questionnaires and minutes', () => {
    render(
      <ReportTrail
        study={makeStudy([AUGUST_BATCH, SEPTEMBER_BATCH])}
        stats={STATS}
        today='2026-09-10'
      />
    );

    expect(screen.getByTestId('report-stats-caption')).toHaveTextContent(
      '2 of 2 batches · 3 questionnaires · 24 min contributed'
    );
  });

  it('renders the next-batch opening date when a future batch exists and the last-batch text otherwise', () => {
    const { rerender } = render(
      <ReportTrail
        study={makeStudy([AUGUST_BATCH, SEPTEMBER_BATCH])}
        stats={STATS}
        today='2026-08-10'
      />
    );

    expect(screen.getByTestId('report-next-batch')).toHaveTextContent(
      'Next batch opens 01 Sep 2026'
    );

    rerender(
      <ReportTrail
        study={makeStudy([AUGUST_BATCH, SEPTEMBER_BATCH])}
        stats={STATS}
        today='2026-09-10'
      />
    );

    expect(screen.getByTestId('report-next-batch')).toHaveTextContent(
      'This is the last batch'
    );
  });
});
