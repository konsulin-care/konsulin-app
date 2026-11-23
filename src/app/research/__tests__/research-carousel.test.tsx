import type { QuestionnaireInfo } from '@/services/api/research';
import type { StudyProgress } from '@/utils/fhir/research';
import { formatBatchDate } from '@/utils/format-batch-date';
import { fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import ResearchCarousel from '../research-carousel';
import {
  BATCH_1,
  makeStudyB,
  makeStudyProgress,
  TITLE_MAP
} from './research-fixtures';

const { mockUseStudyParticipantCount } = vi.hoisted(() => ({
  mockUseStudyParticipantCount: vi.fn()
}));

vi.mock('@/services/api/research-counts', async importOriginal => {
  const actual =
    await importOriginal<typeof import('@/services/api/research-counts')>();
  return { ...actual, useStudyParticipantCount: mockUseStudyParticipantCount };
});

vi.mock('@/i18n', async () => {
  const { createUseTranslationsMock } =
    await import('@/i18n/__tests__/test-messages');
  return { useTranslations: createUseTranslationsMock() };
});

vi.mock('next/link', () => ({
  __esModule: true,
  default: ({
    children,
    href,
    onClick
  }: {
    children: React.ReactNode;
    href: string;
    onClick?: (event: React.MouseEvent<HTMLAnchorElement>) => void;
  }) => (
    <a href={href} onClick={onClick}>
      {children}
    </a>
  )
}));

/** Upcoming batch fixture sharing the same questionnaire set. */
function makeUpcomingBatch(id: string, start: string, end: string) {
  return { id, start, end, questionnaireIds: ['phq2'] };
}

const BATCH_2 = makeUpcomingBatch('batch-2', '2099-09-01', '2099-09-30');
const BATCH_3 = makeUpcomingBatch('batch-3', '2099-10-01', '2099-10-31');
const PAST_BATCH = makeUpcomingBatch('batch-past', '2020-01-01', '2020-01-31');
const OPEN_STUDY_NAME = 'Open study Konsulin Mental Health Survey';

function renderCarousel(
  studies: StudyProgress[],
  activeId: string,
  overrides: {
    onSlideChange?: () => void;
    onStudyClick?: (studyId: string) => void;
    onQuestionnaireClick?: (studyId: string, qid: string) => void;
  } = {},
  onSlideChange = vi.fn(),
  options: {
    titleMap?: ReadonlyMap<string, QuestionnaireInfo>;
    isTitlesLoading?: boolean;
    isPatient?: boolean;
    waiting?: readonly { questionnaire?: string; authored?: string }[];
    consentedStudyIds?: ReadonlySet<string>;
  } = {}
) {
  return render(
    <ResearchCarousel
      studies={studies}
      activeId={activeId}
      onSlideChange={overrides.onSlideChange ?? onSlideChange}
      onStudyClick={overrides.onStudyClick ?? vi.fn()}
      onQuestionnaireClick={overrides.onQuestionnaireClick ?? vi.fn()}
      isPatient={options.isPatient ?? false}
      titleMap={options.titleMap ?? TITLE_MAP}
      isTitlesLoading={options.isTitlesLoading ?? false}
      waiting={options.waiting}
      consentedStudyIds={options.consentedStudyIds}
    />
  );
}

beforeEach(() => {
  window.localStorage.clear();
  mockUseStudyParticipantCount.mockReset();
  mockUseStudyParticipantCount.mockReturnValue({ data: 42 });
  Object.defineProperty(window, 'location', {
    configurable: true,
    value: new URL('https://konsulin.care/research')
  });
  Object.assign(navigator, { share: vi.fn(() => Promise.resolve()) });
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('ResearchCarousel', () => {
  it('renders the study data on its slide', () => {
    renderCarousel([makeStudyProgress()], 'research');

    expect(screen.getByText('Konsulin Mental Health Survey')).toBeTruthy();
    expect(
      screen.getByText(/A longitudinal survey of mental health/)
    ).toBeTruthy();
    expect(screen.getByTestId('batch-line')).toHaveTextContent(
      `Batch 1 of 1 · Closes ${formatBatchDate(BATCH_1.end, 'id')}`
    );
    expect(screen.queryByText(/Total participants:/)).toBeNull();
    expect(mockUseStudyParticipantCount).toHaveBeenCalledWith('research', {
      enabled: false
    });
    expect(screen.getByTestId('batch-chip-batch-1')).toBeTruthy();
    expect(screen.getByText('PHQ-2')).toBeTruthy();
    expect(screen.getByText('Big Five Inventory')).toBeTruthy();
    expect(screen.getByText(/Tap to share this survey/i)).toBeTruthy();
  });

  it('renders the collective goal for a patient and no legacy total line', () => {
    renderCarousel([makeStudyProgress()], 'research', {}, vi.fn(), {
      isPatient: true
    });

    expect(screen.getByText('42 people have joined.')).toBeTruthy();
    expect(screen.queryByText(/Total participants:/)).toBeNull();
  });

  it('hides the count and collective goal for guests', () => {
    renderCarousel([makeStudyProgress()], 'research');

    expect(screen.queryByTestId('collective-goal')).toBeNull();
    expect(screen.queryByText(/people have joined/)).toBeNull();
    expect(screen.queryByText(/Total participants:/)).toBeNull();
  });

  it('marks a batch with a waiting response as syncing', () => {
    renderCarousel(
      [
        makeStudyProgress({
          batches: [BATCH_2],
          currentBatch: BATCH_2,
          history: []
        })
      ],
      'research',
      {},
      vi.fn(),
      {
        waiting: [
          { questionnaire: 'phq2', authored: '2099-09-15T08:00:00.000Z' }
        ]
      }
    );

    const syncingChip = screen.getByTestId('batch-chip-batch-2');
    expect(syncingChip).toHaveAttribute('data-status', 'syncing');
    expect(syncingChip.parentElement).toHaveTextContent('Waiting to sync');
  });

  it('never renders a zero participant total', () => {
    mockUseStudyParticipantCount.mockReturnValue({ data: 0 });
    renderCarousel([makeStudyProgress()], 'research', {}, vi.fn(), {
      isPatient: true
    });

    expect(screen.queryByText('Total participants: 0')).toBeNull();
    expect(screen.queryByText(/Total participants:/)).toBeNull();
  });

  it('shares the full invite message when the share bar is clicked', () => {
    const share = vi.fn(() => Promise.resolve());
    Object.assign(navigator, { share });
    const onStudyClick = vi.fn();
    renderCarousel([makeStudyProgress()], 'research', { onStudyClick });

    fireEvent.click(screen.getByTestId('research-share-research'));

    expect(share).toHaveBeenCalledWith({
      title: 'Konsulin Mental Health Survey',
      text: 'Join me as a citizen scientist through Konsulin Mental Health Survey in Konsulin.\nhttps://konsulin.care/research?view=research',
      url: 'https://konsulin.care/research?view=research'
    });
    expect(onStudyClick).not.toHaveBeenCalled();
  });

  it('fires the study click handler when the card body is clicked', () => {
    const share = vi.fn(() => Promise.resolve());
    Object.assign(navigator, { share });
    const onStudyClick = vi.fn();
    renderCarousel([makeStudyProgress()], 'research', { onStudyClick });

    fireEvent.click(screen.getByRole('button', { name: OPEN_STUDY_NAME }));

    expect(onStudyClick).toHaveBeenCalledWith('research');
    expect(share).not.toHaveBeenCalled();
  });

  it('reports questionnaire clicks without firing the card handler', () => {
    const share = vi.fn(() => Promise.resolve());
    Object.assign(navigator, { share });
    const onStudyClick = vi.fn();
    const onQuestionnaireClick = vi.fn();
    renderCarousel([makeStudyProgress()], 'research', {
      onStudyClick,
      onQuestionnaireClick
    });

    fireEvent.click(screen.getByRole('button', { name: 'PHQ-2' }));

    expect(onQuestionnaireClick).toHaveBeenCalledWith('research', 'phq2');
    expect(onStudyClick).not.toHaveBeenCalled();
    expect(share).not.toHaveBeenCalled();
  });

  it('truncates descriptions longer than 200 characters with an ellipsis', () => {
    const longDescription = 'Lorem ipsum dolor sit amet '.repeat(20);
    renderCarousel(
      [
        makeStudyProgress({
          study: {
            resourceType: 'ResearchStudy',
            id: 'research',
            status: 'active',
            title: 'Long Description Study',
            description: longDescription
          }
        })
      ],
      'research'
    );

    expect(screen.getByText(`${longDescription.slice(0, 200)}…`)).toBeTruthy();
    expect(screen.queryByText(longDescription)).toBeNull();
  });

  it('keeps short descriptions untouched', () => {
    renderCarousel([makeStudyProgress()], 'research');

    expect(
      screen.getByText('A longitudinal survey of mental health.')
    ).toBeTruthy();
  });

  it('styles the share text with the foreground token', () => {
    renderCarousel([makeStudyProgress()], 'research');

    expect(screen.getByTestId('research-share-research')).toHaveClass(
      'text-foreground'
    );
  });

  it('applies the research-carousel class for equal-height slides', () => {
    renderCarousel([makeStudyProgress(), makeStudyB()], 'research');

    expect(document.querySelector('.research-carousel')).toBeTruthy();
  });

  it('renders a single study without a swiper wrapper or slide dots', () => {
    renderCarousel([makeStudyProgress()], 'research');

    expect(screen.getByTestId('research-slide-research')).toHaveAttribute(
      'data-active',
      'true'
    );
    expect(document.querySelector('.swiper-slide')).toBeNull();
    expect(screen.queryByRole('button', { name: 'Go to slide 1' })).toBeNull();
  });

  it('labels dots from messages and highlights the active dot', () => {
    renderCarousel([makeStudyProgress(), makeStudyB()], 'research');

    const firstDot = screen.getByRole('button', { name: 'Go to slide 1' });
    const secondDot = screen.getByRole('button', { name: 'Go to slide 2' });
    expect(firstDot).toHaveClass('bg-turquoise-deep');
    expect(secondDot).toHaveClass('bg-charcoal-200');
  });

  it('marks done and upcoming batches through data-status attributes', () => {
    renderCarousel(
      [
        makeStudyProgress({
          batches: [PAST_BATCH, BATCH_2, BATCH_3],
          currentBatch: BATCH_2,
          history: [
            {
              batchId: PAST_BATCH.id,
              start: PAST_BATCH.start,
              end: PAST_BATCH.end,
              participated: true
            },
            {
              batchId: BATCH_2.id,
              start: BATCH_2.start,
              end: BATCH_2.end,
              participated: false
            },
            {
              batchId: BATCH_3.id,
              start: BATCH_3.start,
              end: BATCH_3.end,
              participated: false
            }
          ]
        })
      ],
      'research'
    );

    const doneChip = screen.getByTestId('batch-chip-batch-past');
    expect(doneChip).toHaveAttribute('data-status', 'done');
    expect(doneChip.parentElement).toHaveTextContent('Done');

    const upcomingChip = screen.getByTestId('batch-chip-batch-2');
    expect(upcomingChip).toHaveAttribute('data-status', 'upcoming');
    expect(upcomingChip.parentElement).toHaveTextContent('Upcoming');
  });

  it('spaces slides 16px apart for a breathing room between cards', () => {
    renderCarousel([makeStudyProgress(), makeStudyB()], 'research');
    const slides = document.querySelectorAll<HTMLElement>('.swiper-slide');
    expect(slides.length).toBeGreaterThan(1);
    slides.forEach(slide => expect(slide.style.marginRight).toBe('16px'));
  });

  it('marks the active slide', () => {
    renderCarousel([makeStudyProgress(), makeStudyB()], 'study-b');

    expect(screen.getByTestId('research-slide-study-b')).toHaveAttribute(
      'data-active',
      'true'
    );
    expect(screen.getByTestId('research-slide-research')).toHaveAttribute(
      'data-active',
      'false'
    );
  });

  it('left-justifies the questionnaire name button', () => {
    renderCarousel([makeStudyProgress()], 'research');

    expect(screen.getByRole('button', { name: 'PHQ-2' })).toHaveClass(
      'text-left'
    );
  });

  it('hides overlap hints in the standard view even for shared questionnaires', () => {
    renderCarousel([makeStudyProgress(), makeStudyB()], 'research');

    expect(screen.getAllByText('PHQ-2').length).toBeGreaterThan(0);
    expect(screen.queryByText(/Also counts toward/)).toBeNull();
  });

  it('does not show XP value next to questionnaires', () => {
    renderCarousel([makeStudyProgress()], 'research');

    expect(screen.queryByText(/XP/)).toBeNull();
  });

  it('shows a skeleton for unresolved titles while loading', () => {
    renderCarousel([makeStudyProgress()], 'research', {}, vi.fn(), {
      titleMap: new Map(),
      isTitlesLoading: true
    });

    expect(screen.getByTestId('questionnaire-title-skeleton-phq2')).toHaveClass(
      'animate-pulse'
    );
    expect(
      screen.getByTestId('questionnaire-title-skeleton-big-five-inventory')
    ).toBeTruthy();
    expect(screen.queryByText('PHQ2')).toBeNull();
  });

  it('falls back to the id-derived name when a title is missing', () => {
    renderCarousel([makeStudyProgress()], 'research', {}, vi.fn(), {
      titleMap: new Map([['phq2', { title: 'PHQ-2', durationMinutes: null }]])
    });

    expect(screen.getByText('PHQ-2')).toBeTruthy();
    expect(screen.getByText('BIG FIVE INVENTORY')).toBeTruthy();
  });

  it('reports the study id when the active slide changes', () => {
    const onSlideChange = vi.fn();
    renderCarousel(
      [makeStudyProgress(), makeStudyB()],
      'research',
      { onSlideChange },
      onSlideChange
    );

    fireEvent.click(screen.getByRole('button', { name: 'Go to slide 2' }));

    expect(onSlideChange).toHaveBeenCalledWith('study-b');
  });
});
