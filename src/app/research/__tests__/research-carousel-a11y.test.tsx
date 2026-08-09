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
    titleMap?: Record<string, QuestionnaireInfo>;
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

describe('ResearchCarousel keyboard and click containment', () => {
  it.each(['Enter', ' '])(
    'opens the study when the focused card is activated with %s',
    key => {
      const onStudyClick = vi.fn();
      renderCarousel([makeStudyProgress()], 'research', onStudyClick);

      fireEvent.keyDown(screen.getByTestId('research-slide-research'), {
        key
      });

      expect(onStudyClick).toHaveBeenCalledWith('research');
    }
  );

  it('does not fire the card handler for keys pressed inside inner buttons', () => {
    const onStudyClick = vi.fn();
    renderCarousel([makeStudyProgress()], 'research', onStudyClick);

    fireEvent.keyDown(screen.getByRole('button', { name: 'PHQ-2' }), {
      key: 'Enter'
    });

    expect(onStudyClick).not.toHaveBeenCalled();
  });

  it('opens the study when a questionnaire row dead zone is clicked', () => {
    const onStudyClick = vi.fn();
    const onQuestionnaireClick = vi.fn();
    renderCarousel(
      [makeStudyProgress()],
      'research',
      onStudyClick,
      onQuestionnaireClick
    );

    fireEvent.click(screen.getAllByText('+40 XP')[0]);

    expect(onStudyClick).toHaveBeenCalledWith('research');
    expect(onQuestionnaireClick).not.toHaveBeenCalled();
  });
});
