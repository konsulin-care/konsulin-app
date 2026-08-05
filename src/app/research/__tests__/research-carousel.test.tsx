import type { StudyProgress } from '@/utils/fhir/research';
import { fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import ResearchCarousel from '../research-carousel';
import { BATCH_1, makeStudyB, makeStudyProgress } from './research-fixtures';

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

const BATCH_2 = {
  id: 'batch-2',
  start: '2026-09-01',
  end: '2026-09-30',
  questionnaireIds: ['phq2']
};

const BATCH_3 = {
  id: 'batch-3',
  start: '2026-10-01',
  end: '2026-10-31',
  questionnaireIds: ['phq2']
};

function renderCarousel(
  studies: StudyProgress[],
  activeId: string,
  overrides: {
    onSlideChange?: () => void;
    onStudyClick?: (studyId: string) => void;
    onQuestionnaireClick?: (studyId: string, qid: string) => void;
  } = {},
  onSlideChange = vi.fn()
) {
  return render(
    <ResearchCarousel
      studies={studies}
      activeId={activeId}
      onSlideChange={overrides.onSlideChange ?? onSlideChange}
      onStudyClick={overrides.onStudyClick ?? vi.fn()}
      onQuestionnaireClick={overrides.onQuestionnaireClick ?? vi.fn()}
      isPatient={false}
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
    expect(screen.getByText('PHQ2')).toBeTruthy();
    expect(screen.getByText('BIG FIVE INVENTORY')).toBeTruthy();
    expect(screen.getByText(/Tap to share this survey/i)).toBeTruthy();
  });

  it('shares the study URL when the share bar is clicked', () => {
    const share = vi.fn().mockResolvedValue(void 0);
    Object.assign(navigator, { share });
    const onStudyClick = vi.fn();
    renderCarousel([makeStudyProgress()], 'research', { onStudyClick });

    fireEvent.click(screen.getByTestId('research-share-research'));

    expect(share).toHaveBeenCalledWith({
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

    fireEvent.click(screen.getByRole('button', { name: 'PHQ2' }));

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
