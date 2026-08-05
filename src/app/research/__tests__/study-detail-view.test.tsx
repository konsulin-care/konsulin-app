import type { StudyProgress } from '@/utils/fhir/research';
import { fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import StudyDetailView from '../study-detail-view';
import { buildOverlapMap } from '../study-sections';
import { makeStudyB, makeStudyProgress } from './research-fixtures';

const LONG_DESCRIPTION = Array.from(
  { length: 20 },
  () => 'A longitudinal survey of mental health.'
).join(' ');

function renderDetail(
  progress: StudyProgress | null = makeStudyProgress({
    study: {
      resourceType: 'ResearchStudy',
      id: 'research',
      status: 'active',
      title: 'Konsulin Mental Health Survey',
      description: LONG_DESCRIPTION
    }
  }),
  open = true
) {
  const handlers = {
    onClose: vi.fn<() => void>(),
    onParticipate: vi.fn<(progress: StudyProgress) => void>(),
    onQuestionnaireClick: vi.fn<(studyId: string, qid: string) => void>()
  };
  const overlapMap = buildOverlapMap(
    [progress, makeStudyB()].filter((p): p is StudyProgress => p !== null)
  );
  render(
    <StudyDetailView
      progress={progress}
      overlapMap={overlapMap}
      open={open}
      onClose={handlers.onClose}
      onParticipate={handlers.onParticipate}
      onQuestionnaireClick={handlers.onQuestionnaireClick}
      isPatient={false}
    />
  );
  return handlers;
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

describe('StudyDetailView', () => {
  it('renders the full study content including untruncated description', () => {
    renderDetail();

    expect(screen.getByText('Konsulin Mental Health Survey')).toBeTruthy();
    expect(screen.getByText(LONG_DESCRIPTION)).toBeTruthy();
    expect(screen.getByText(/1\/2 questionnaires/)).toBeTruthy();
    expect(screen.getByTestId('batch-chip-batch-1')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'PHQ2' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Participate' })).toBeTruthy();
    expect(screen.getByText(/Tap to share this study/i)).toBeTruthy();
  });

  it('calls onParticipate with the study when the CTA is clicked', () => {
    const handlers = renderDetail();

    fireEvent.click(screen.getByRole('button', { name: 'Participate' }));

    expect(handlers.onParticipate).toHaveBeenCalledTimes(1);
    const progress = handlers.onParticipate.mock.calls[0][0];
    expect(progress.study.id).toBe('research');
  });

  it('reports questionnaire clicks', () => {
    const handlers = renderDetail();

    fireEvent.click(screen.getByRole('button', { name: 'PHQ2' }));

    expect(handlers.onQuestionnaireClick).toHaveBeenCalledWith(
      'research',
      'phq2'
    );
  });

  it('shares the study URL from the share row', () => {
    const share = vi.fn().mockResolvedValue(void 0);
    Object.assign(navigator, { share });
    renderDetail();

    fireEvent.click(screen.getByText(/Tap to share this study/i));

    expect(share).toHaveBeenCalledWith({
      url: 'https://konsulin.care/research?id=research'
    });
  });

  it('renders nothing when closed', () => {
    renderDetail(makeStudyProgress(), false);

    expect(screen.queryByText('Participate')).toBeNull();
    expect(screen.queryByText('Konsulin Mental Health Survey')).toBeNull();
  });
});
