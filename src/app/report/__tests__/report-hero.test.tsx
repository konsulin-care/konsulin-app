import { render, screen, within } from '@testing-library/react';
import type { QuestionnaireResponse } from 'fhir/r4';
import { describe, expect, it, vi } from 'vitest';

vi.mock('@/i18n', async () => {
  const { createUseTranslationsMock } =
    await import('@/i18n/__tests__/test-messages');
  return { useTranslations: createUseTranslationsMock() };
});

import { GUEST_TITLE } from '@/constants/research';
import type { ResearchBatch } from '@/utils/fhir/research';

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
const OCTOBER_BATCH: ResearchBatch = {
  id: 'b3',
  start: '2026-10-01',
  end: '2026-10-31',
  questionnaireIds: ['phq2']
};
const NOVEMBER_BATCH: ResearchBatch = {
  id: 'b4',
  start: '2026-11-01',
  end: '2026-11-30',
  questionnaireIds: ['phq2']
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

describe('ReportHero', () => {
  it('announces the completed batch with its XP when completed=1', () => {
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
      'Batch 2 done! +115 XP'
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

  it('shows a patient the level bar with the level label and XP to next', () => {
    render(<ReportHero {...makeProps({ isPatient: true, totalXp: 45 })} />);
    expect(screen.getByTestId('report-hero-level')).toBeInTheDocument();
    expect(screen.getByTestId('report-hero-level-label')).toHaveTextContent(
      'Trailblazer'
    );
    expect(screen.getByTestId('report-hero-level-xp')).toHaveTextContent(
      '55 XP to Pathfinder'
    );
    expect(screen.getByTestId('report-hero-level-bar')).toHaveAttribute(
      'data-fraction',
      '0.45'
    );
  });

  it('shows a guest the fixed title and the 24-hour claim nudge', () => {
    render(<ReportHero {...makeProps({ isPatient: false })} />);
    const hero = screen.getByTestId('report-hero');
    expect(within(hero).getByTestId('report-hero-title')).toHaveTextContent(
      GUEST_TITLE.label
    );
    expect(within(hero).getByTestId('report-claim-nudge')).toHaveTextContent(
      /24 hours/
    );
    expect(within(hero).queryByTestId('report-hero-level')).toBeNull();
  });

  it('renders one timeline dot per batch with its status', () => {
    render(
      <ReportHero
        {...makeProps({
          today: '2026-10-15',
          batches: [
            AUGUST_BATCH,
            SEPTEMBER_BATCH,
            OCTOBER_BATCH,
            NOVEMBER_BATCH
          ],
          buckets: new Map<string, QuestionnaireResponse[]>([
            ['b1', [makeResponse('r1', 'phq2', '2026-08-15T10:00:00Z')]]
          ])
        })}
      />
    );
    const dots = screen.getAllByTestId('report-hero-timeline-dot');
    expect(dots).toHaveLength(4);
    expect(dots.map(dot => dot.getAttribute('data-status'))).toEqual([
      'done',
      'missed',
      'current',
      'upcoming'
    ]);
  });

  it('announces the next batch start date when a future batch exists', () => {
    render(
      <ReportHero
        {...makeProps({
          today: '2026-09-15',
          batches: [AUGUST_BATCH, SEPTEMBER_BATCH, OCTOBER_BATCH]
        })}
      />
    );
    expect(screen.getByTestId('report-hero-next-batch')).toHaveTextContent(
      'Next batch opens 01 Oct 2026'
    );
  });

  it('announces the last batch when no future batch exists', () => {
    render(<ReportHero {...makeProps({ today: '2026-10-15' })} />);
    expect(screen.getByTestId('report-hero-next-batch')).toHaveTextContent(
      'This is the last batch'
    );
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
});
