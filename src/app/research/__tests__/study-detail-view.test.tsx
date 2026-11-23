import { Roles } from '@/constants/roles';
import type { QuestionnaireInfo } from '@/services/api/research';
import type { StudyProgress } from '@/utils/fhir/research';
import { fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import StudyDetailView from '../study-detail-view';
import { buildOverlapMap } from '../study-sections';
import { makeStudyB, makeStudyProgress, TITLE_MAP } from './research-fixtures';

const { mockUseStudyParticipantCount } = vi.hoisted(() => ({
  mockUseStudyParticipantCount:
    vi.fn<
      (
        studyId: string | undefined,
        options?: { enabled?: boolean }
      ) => { data?: number; isError: boolean }
    >()
}));

vi.mock('@/services/api/research-counts', async importOriginal => {
  const actual =
    await importOriginal<typeof import('@/services/api/research-counts')>();
  return {
    ...actual,
    useStudyParticipantCount: mockUseStudyParticipantCount
  };
});

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
  open = true,
  titleMap: ReadonlyMap<string, QuestionnaireInfo> = TITLE_MAP,
  flags: {
    isPatient?: boolean;
    isConsented?: boolean;
    roleName?: string;
  } = {}
) {
  const handlers = {
    onClose: vi.fn<() => void>(),
    onParticipate: vi.fn<(progress: StudyProgress) => void>(),
    onQuestionnaireClick: vi.fn<(studyId: string, qid: string) => void>(),
    onSeeReport: vi.fn<(studyId: string) => void>()
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
      onSeeReport={handlers.onSeeReport}
      isPatient={flags.isPatient ?? false}
      isConsented={flags.isConsented}
      roleName={flags.roleName}
      titleMap={titleMap}
    />
  );
  return handlers;
}

beforeEach(() => {
  mockUseStudyParticipantCount.mockReset();
  mockUseStudyParticipantCount.mockReturnValue({
    data: undefined,
    isError: false
  });
  window.localStorage.clear();
  Object.defineProperty(window, 'location', {
    configurable: true,
    value: new URL('https://konsulin.care/research')
  });
  Object.assign(navigator, { share: vi.fn(() => Promise.resolve()) });
});

afterEach(() => {
  vi.restoreAllMocks();
});

vi.mock('@/i18n', async () => {
  const { createUseTranslationsMock } =
    await import('@/i18n/__tests__/test-messages');
  return { useTranslations: createUseTranslationsMock() };
});

describe('StudyDetailView', () => {
  it('renders the full study content including untruncated description', () => {
    renderDetail();

    expect(screen.getByText('Konsulin Mental Health Survey')).toBeTruthy();
    expect(screen.getByText(LONG_DESCRIPTION)).toBeTruthy();
    expect(screen.getByTestId('batch-chip-batch-1')).toBeTruthy();
    expect(screen.queryByTestId('collective-goal')).toBeNull();
    expect(screen.getByRole('button', { name: 'PHQ-2' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Participate' })).toBeTruthy();
    expect(screen.getByText(/Tap to share this survey/i)).toBeTruthy();
  });

  it('renders the collective goal for a patient and never the old participant count', () => {
    mockUseStudyParticipantCount.mockReturnValue({
      data: 10,
      isError: false
    });
    renderDetail(undefined, true, TITLE_MAP, { isPatient: true });

    expect(screen.getByTestId('batch-chip-batch-1')).toBeTruthy();
    expect(screen.getByTestId('collective-goal')).toHaveTextContent(
      '10 people have joined.'
    );
    expect(screen.queryByText(/Total participants/)).toBeNull();
  });

  it('renders the collective goal for a researcher', () => {
    mockUseStudyParticipantCount.mockReturnValue({
      data: 10,
      isError: false
    });
    renderDetail(undefined, true, TITLE_MAP, {
      roleName: Roles.Researcher
    });

    expect(screen.getByTestId('collective-goal')).toHaveTextContent(
      '10 people have joined.'
    );
    expect(screen.queryByText(/Total participants/)).toBeNull();
  });

  it('hides the collective goal for guests', () => {
    renderDetail();

    expect(screen.queryByTestId('collective-goal')).toBeNull();
    expect(mockUseStudyParticipantCount).toHaveBeenCalledWith('research', {
      enabled: false
    });
  });

  it('shows a See Report CTA and routes to the report when the batch is complete', () => {
    const handlers = renderDetail(
      makeStudyProgress({
        completedCount: 2,
        isComplete: true,
        firstUncompletedQuestionnaireId: null,
        completedQuestionnaireIds: ['phq2', 'big-five-inventory']
      })
    );

    expect(screen.queryByRole('button', { name: 'Participate' })).toBeNull();
    expect(screen.queryByText(/Next batch opens soon/)).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'See Report' }));

    expect(handlers.onSeeReport).toHaveBeenCalledWith('research');
    expect(handlers.onParticipate).not.toHaveBeenCalled();
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

    fireEvent.click(screen.getByRole('button', { name: 'PHQ-2' }));

    expect(handlers.onQuestionnaireClick).toHaveBeenCalledWith(
      'research',
      'phq2'
    );
  });

  it('shows the overlap hint in the expanded view for shared questionnaires', () => {
    renderDetail();

    expect(screen.getByRole('button', { name: 'PHQ-2' })).toBeTruthy();
    expect(
      screen.getAllByText(/Also counts toward Sleep Quality Study/).length
    ).toBeGreaterThan(0);
  });

  it('shares the full invite message from the share row', () => {
    const share = vi.fn(() => Promise.resolve());
    Object.assign(navigator, { share });
    renderDetail();

    fireEvent.click(screen.getByText(/Tap to share this survey/i));

    expect(share).toHaveBeenCalledWith({
      title: 'Konsulin Mental Health Survey',
      text: 'Join me as a citizen scientist through Konsulin Mental Health Survey in Konsulin.\nhttps://konsulin.care/research?view=research',
      url: 'https://konsulin.care/research?view=research'
    });
  });

  it('renders nothing when closed', () => {
    renderDetail(makeStudyProgress(), false);

    expect(screen.queryByText('Participate')).toBeNull();
    expect(screen.queryByText('Konsulin Mental Health Survey')).toBeNull();
  });
});
