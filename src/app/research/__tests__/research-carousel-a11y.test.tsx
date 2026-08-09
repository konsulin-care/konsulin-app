import type { QuestionnaireInfo } from '@/services/api/research';
import type { StudyProgress } from '@/utils/fhir/research';
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import ResearchCarousel from '../research-carousel';
import { makeStudyProgress, TITLE_MAP } from './research-fixtures';

function renderCarousel(
  studies: StudyProgress[],
  activeId: string,
  onStudyClick: (studyId: string) => void,
  onQuestionnaireClick: (studyId: string, qid: string) => void = vi.fn(),
  options: {
    titleMap?: ReadonlyMap<string, QuestionnaireInfo>;
    isTitlesLoading?: boolean;
  } = {}
) {
  return render(
    <ResearchCarousel
      studies={studies}
      activeId={activeId}
      onSlideChange={vi.fn()}
      onStudyClick={onStudyClick}
      onQuestionnaireClick={onQuestionnaireClick}
      isPatient={false}
      titleMap={options.titleMap ?? TITLE_MAP}
      isTitlesLoading={options.isTitlesLoading ?? false}
    />
  );
}

const OPEN_STUDY_NAME = 'Open study Konsulin Mental Health Survey';

describe('ResearchCarousel keyboard and click containment', () => {
  it('exposes the card action as a real button, not a fake button role', () => {
    const onStudyClick = vi.fn();
    renderCarousel([makeStudyProgress()], 'research', onStudyClick);

    const slide = screen.getByTestId('research-slide-research');
    expect(slide).not.toHaveAttribute('role');
    expect(slide).not.toHaveAttribute('tabindex');

    const openButton = screen.getByRole('button', { name: OPEN_STUDY_NAME });
    expect(openButton).toHaveAttribute('type', 'button');
  });

  it('opens the study when the card button is activated', () => {
    const onStudyClick = vi.fn();
    renderCarousel([makeStudyProgress()], 'research', onStudyClick);

    fireEvent.click(screen.getByRole('button', { name: OPEN_STUDY_NAME }));

    expect(onStudyClick).toHaveBeenCalledWith('research');
  });

  it('does not fire the card handler for keys pressed inside inner buttons', () => {
    const onStudyClick = vi.fn();
    renderCarousel([makeStudyProgress()], 'research', onStudyClick);

    fireEvent.keyDown(screen.getByRole('button', { name: 'PHQ-2' }), {
      key: 'Enter'
    });

    expect(onStudyClick).not.toHaveBeenCalled();
  });

  it('opens the study when a non-interactive card zone is clicked', () => {
    const onStudyClick = vi.fn();
    const onQuestionnaireClick = vi.fn();
    renderCarousel(
      [makeStudyProgress()],
      'research',
      onStudyClick,
      onQuestionnaireClick
    );

    fireEvent.click(screen.getByRole('button', { name: OPEN_STUDY_NAME }));

    expect(onStudyClick).toHaveBeenCalledWith('research');
    expect(onQuestionnaireClick).not.toHaveBeenCalled();
  });
});
