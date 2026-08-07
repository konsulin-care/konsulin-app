import type { QuestionnaireInfo } from '@/services/api/research';
import type { StudyProgress } from '@/utils/fhir/research';
import { fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import ResearchCarousel from '../research-carousel';
import {
  BATCH_1,
  makeStudyB,
  makeStudyProgress,
  TITLE_MAP
} from './research-fixtures';

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

const BATCH_2 = makeUpcomingBatch('batch-2', '2026-09-01', '2026-09-30');
const BATCH_3 = makeUpcomingBatch('batch-3', '2026-10-01', '2026-10-31');

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
    titleMap?: Record<string, QuestionnaireInfo>;
    isTitlesLoading?: boolean;
  } = {}
) {
  return render(
    <ResearchCarousel
      studies={studies}
      activeId={activeId}
      onSlideChange={overrides.onSlideChange ?? onSlideChange}
      onStudyClick={overrides.onStudyClick ?? vi.fn()}
      onQuestionnaireClick={overrides.onQuestionnaireClick ?? vi.fn()}
      isPatient={false}
      titleMap={options.titleMap ?? TITLE_MAP}
      isTitlesLoading={options.isTitlesLoading ?? false}
    />
  );
}

beforeEach(() => {
  window.localStorage.clear();
  Object.defineProperty(window, 'location', {
    configurable: true,
    value: new URL('https://konsulin.care/research')
  });
  Object.assign(navigator, { share: vi.fn().mockResolvedValue(void 0) });
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
    expect(screen.getByText(/Closes in \d+ days/i)).toBeTruthy();
    expect(screen.getAllByText('1/2 questionnaires').length).toBeGreaterThan(0);
    expect(screen.getByTestId('batch-chip-batch-1')).toBeTruthy();
    expect(screen.getByText('PHQ-2')).toBeTruthy();
    expect(screen.getByText('Big Five Inventory')).toBeTruthy();
    expect(screen.getByText(/Tap to share this survey/i)).toBeTruthy();
  });

  it('shares the full invite message when the share bar is clicked', () => {
    const share = vi.fn().mockResolvedValue(void 0);
    Object.assign(navigator, { share });
    const onStudyClick = vi.fn();
    renderCarousel([makeStudyProgress()], 'research', { onStudyClick });

    fireEvent.click(screen.getByTestId('research-share-research'));

    expect(share).toHaveBeenCalledWith({
      title: 'Konsulin Mental Health Survey',
      text: 'Join me as a citizen scientist through Konsulin Mental Health Survey in Konsulin.\nhttps://konsulin.care/research?id=research',
      url: 'https://konsulin.care/research?id=research'
    });
    expect(onStudyClick).not.toHaveBeenCalled();
  });

  it('fires the study click handler when the card body is clicked', () => {
    const share = vi.fn().mockResolvedValue(void 0);
    Object.assign(navigator, { share });
    const onStudyClick = vi.fn();
    renderCarousel([makeStudyProgress()], 'research', { onStudyClick });

    fireEvent.click(screen.getByTestId('research-slide-research'));

    expect(onStudyClick).toHaveBeenCalledWith('research');
    expect(share).not.toHaveBeenCalled();
  });

  it('reports questionnaire clicks without firing the card handler', () => {
    const share = vi.fn().mockResolvedValue(void 0);
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

  it('styles the share text black', () => {
    renderCarousel([makeStudyProgress()], 'research');

    expect(screen.getByTestId('research-share-research')).toHaveClass(
      'text-black'
    );
  });

  it('applies the research-carousel class for equal-height slides', () => {
    renderCarousel([makeStudyProgress()], 'research');

    expect(document.querySelector('.research-carousel')).toBeTruthy();
  });

  it('styles the active batch chip bold black and upcoming chips at half opacity', () => {
    renderCarousel(
      [
        makeStudyProgress({
          batches: [BATCH_1, BATCH_2, BATCH_3],
          currentBatch: BATCH_1,
          history: [
            {
              batchId: 'batch-1',
              start: '2026-08-01',
              end: '2026-08-31',
              participated: true
            },
            {
              batchId: 'batch-2',
              start: '2026-09-01',
              end: '2026-09-30',
              participated: false
            },
            {
              batchId: 'batch-3',
              start: '2026-10-01',
              end: '2026-10-31',
              participated: false
            }
          ]
        })
      ],
      'research'
    );

    const activeChip = screen.getByTestId('batch-chip-batch-1');
    expect(activeChip).toHaveTextContent('B1');
    expect(activeChip).toHaveClass('bg-gray-100', 'text-black', 'font-bold');
    expect(activeChip).not.toHaveClass('opacity-50');

    const upcomingChip = screen.getByTestId('batch-chip-batch-2');
    expect(upcomingChip).toHaveTextContent('B2');
    expect(upcomingChip).toHaveClass(
      'bg-gray-100',
      'text-black',
      'font-bold',
      'opacity-50'
    );
  });

  it('keeps completed batch chips teal with a check', () => {
    renderCarousel(
      [
        makeStudyProgress({
          batches: [BATCH_1, BATCH_2, BATCH_3],
          currentBatch: BATCH_3,
          history: [
            {
              batchId: 'batch-1',
              start: '2026-08-01',
              end: '2026-08-31',
              participated: true
            },
            {
              batchId: 'batch-2',
              start: '2026-09-01',
              end: '2026-09-30',
              participated: true
            },
            {
              batchId: 'batch-3',
              start: '2026-10-01',
              end: '2026-10-31',
              participated: false
            }
          ]
        })
      ],
      'research'
    );

    const doneChip = screen.getByTestId('batch-chip-batch-1');
    expect(doneChip).toHaveClass('bg-secondary', 'text-white');
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

  it('shows the XP value next to questionnaires with a known duration', () => {
    renderCarousel([makeStudyProgress()], 'research');

    expect(screen.getAllByText('+40 XP').length).toBeGreaterThan(0);
    expect(screen.getAllByText('+75 XP').length).toBeGreaterThan(0);
  });

  it('shows a skeleton for unresolved titles while loading', () => {
    renderCarousel([makeStudyProgress()], 'research', {}, vi.fn(), {
      titleMap: {},
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
      titleMap: { phq2: { title: 'PHQ-2', durationMinutes: null } }
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
