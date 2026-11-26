import type { QuestionnaireInfo } from '@/services/api/research';
import type { StudyProgress } from '@/utils/fhir/research';
import type { UpNextItem } from '@/utils/fhir/research-queue';
import { formatBatchDate } from '@/utils/format-batch-date';
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import UpNextSection, { type UpNextSectionProps } from '../up-next-section';

vi.mock('@/i18n', async () => {
  const { createUseTranslationsMock } =
    await import('@/i18n/__tests__/test-messages');
  return { useTranslations: createUseTranslationsMock() };
});

const TITLE_MAP: ReadonlyMap<string, QuestionnaireInfo> = new Map([
  ['phq2', { title: 'PHQ-2', durationMinutes: 8 }],
  ['big-five-inventory', { title: 'Big Five Inventory', durationMinutes: 15 }],
  ['sleep', { title: 'Sleep Check', durationMinutes: null }]
]);

/**
 * Builds a study progress fixture with a sponsor group and one batch.
 *
 * @param id - Study id.
 * @param title - Study title.
 * @param group - Sponsor display, when any.
 * @returns The study progress fixture.
 */
function makeProgress(
  id: string,
  title: string,
  group?: string
): StudyProgress {
  const batch = {
    id: `${id}-batch-1`,
    start: '2026-08-01',
    end: '2026-08-31',
    questionnaireIds: ['phq2']
  };
  return {
    study: {
      resourceType: 'ResearchStudy',
      id,
      status: 'active',
      title,
      ...(group ? { sponsor: { display: group } } : {})
    },
    batches: [batch],
    currentBatch: batch,
    completedCount: 0,
    totalCount: 1,
    isComplete: false,
    firstUncompletedQuestionnaireId: 'phq2',
    completedQuestionnaireIds: [],
    history: []
  };
}

/**
 * Builds an up-next queue item for the given questionnaire and studies.
 *
 * @param questionnaireId - Questionnaire id.
 * @param studies - Studies the questionnaire counts toward.
 * @returns The queue item fixture.
 */
function makeItem(
  questionnaireId: string,
  studies: StudyProgress[]
): UpNextItem {
  return {
    questionnaireId,
    studies,
    leadStudy: studies[0],
    closesOn: '2026-08-31'
  };
}

const LEAD_STUDY = makeProgress(
  'research',
  'Konsulin Mental Health Survey',
  'Konsulin Research Lab'
);

/**
 * Renders the section with defaults for the option under test.
 *
 * @param overrides - Prop overrides.
 * @returns The render result.
 */
function renderSection(overrides: Partial<UpNextSectionProps> = {}) {
  return render(
    <UpNextSection
      items={[makeItem('phq2', [LEAD_STUDY])]}
      titleMap={TITLE_MAP}
      joinedCount={1}
      onStart={vi.fn()}
      {...overrides}
    />
  );
}

describe('UpNextSection', () => {
  it('shows the first item card and starts the lead study', () => {
    const onStart = vi.fn();
    renderSection({ onStart });

    expect(
      screen.getByText(
        'For Konsulin Mental Health Survey · Konsulin Research Lab'
      )
    ).toBeInTheDocument();
    expect(screen.getByText('PHQ-2')).toBeInTheDocument();
    expect(screen.getByText(/closes /).textContent).toContain(
      formatBatchDate('2026-08-31', 'id')
    );
    expect(screen.getByText(/About 8 minutes/)).toBeInTheDocument();
    expect(
      screen.getByText('Stop whenever you like. A screening, not a diagnosis.')
    ).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Start, about 8 min' }));

    expect(onStart).toHaveBeenCalledWith(LEAD_STUDY, 'phq2');
  });

  it('shows the shared note, three rows and the count of the rest', () => {
    const second = makeProgress('study-b', 'Sleep Quality Study', 'Sleep Lab');
    const lead = makeItem('phq2', [LEAD_STUDY, second]);
    const items = [
      lead,
      makeItem('big-five-inventory', [LEAD_STUDY]),
      makeItem('sleep', [LEAD_STUDY]),
      makeItem('extra-1', [LEAD_STUDY]),
      makeItem('extra-2', [LEAD_STUDY]),
      makeItem('extra-3', [LEAD_STUDY])
    ];

    renderSection({ items });

    expect(
      screen.getByText(
        'Answer once. It counts toward 2 studies: Konsulin Mental Health Survey, Sleep Quality Study.'
      )
    ).toBeInTheDocument();
    expect(screen.getAllByTestId('up-next-row')).toHaveLength(3);
    expect(screen.getAllByRole('button', { name: 'Start' })).toHaveLength(3);
    expect(screen.getByTestId('up-next-rest').textContent).toBe(
      '2 questionnaires'
    );
    expect(screen.getByText('Then')).toBeInTheDocument();
  });

  it('thanks a joined participant with nothing waiting and links to studies', () => {
    renderSection({ items: [], joinedCount: 2 });

    expect(screen.getByTestId('up-next-up-to-date').textContent).toContain(
      'You are up to date. Thank you. Nothing is waiting for you.'
    );
    expect(screen.queryByTestId('up-next-nothing-joined')).toBeNull();
    expect(
      screen.getByRole('link', { name: 'Browse studies' })
    ).toHaveAttribute('href', '/studies');
  });

  it('prompts a participant who has joined nothing and links to studies', () => {
    renderSection({ items: [], joinedCount: 0 });

    expect(screen.getByTestId('up-next-nothing-joined').textContent).toContain(
      'You have not joined a study yet. Pick one below.'
    );
    expect(screen.queryByTestId('up-next-up-to-date')).toBeNull();
    expect(
      screen.getByRole('link', { name: 'Browse studies' })
    ).toHaveAttribute('href', '/studies');
  });

  it('shows a skeleton while loading', () => {
    renderSection({ isLoading: true });

    expect(screen.getByTestId('up-next-loading')).toHaveAttribute(
      'aria-busy',
      'true'
    );
    expect(screen.queryByTestId('up-next-section')).toBeNull();
  });

  it('shows the error state when loading fails', () => {
    renderSection({ isError: true });

    expect(screen.getByRole('alert')).toHaveTextContent('Something went wrong');
    expect(screen.queryByTestId('up-next-section')).toBeNull();
  });
});
