import { render } from '@testing-library/react';
import { CalendarPlus, ClipboardList, Share2 } from 'lucide-react';
import type { Dispatch } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/i18n', async () => {
  const { createUseTranslationsMock } =
    await import('@/i18n/__tests__/test-messages');
  return { useTranslations: createUseTranslationsMock() };
});

import type { ActionConfig } from '@/components/fab/types';
import type { FabAction } from '@/context/fabContext';
import type { ResearchBatch, StudyProgress } from '@/utils/fhir/research';

const { mockFabDispatch, mockPush, mockAddToCalendar, mockHandleShare } =
  vi.hoisted(() => ({
    mockFabDispatch: vi.fn<Dispatch<FabAction>>(),
    mockPush: vi.fn(),
    mockAddToCalendar: vi.fn(),
    mockHandleShare: vi.fn<() => Promise<void>>()
  }));

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockPush })
}));

vi.mock('@/context/fabContext', () => ({
  useFab: () => ({ state: {}, dispatch: mockFabDispatch })
}));

vi.mock('@/utils/calendar/open', () => ({
  addToCalendar: mockAddToCalendar
}));

vi.mock('@/hooks/useShareStudy', () => ({
  useShareStudy: () => ({
    shareUrl: '',
    copied: false,
    handleShare: mockHandleShare
  })
}));

import type { ReportFabProps } from '../report-fab';
import { ReportFab } from '../report-fab';

const STUDY_TITLE = 'Mental Health Survey';
const TODAY = '2026-08-15';

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
  questionnaireIds: ['phq2']
};

/** StudyProgress fixture with a two-questionnaire open batch by default. */
function makeStudy(overrides: Partial<StudyProgress> = {}): StudyProgress {
  return {
    study: {
      resourceType: 'ResearchStudy',
      id: 'research',
      status: 'active',
      title: STUDY_TITLE,
      description: 'A longitudinal survey.'
    },
    batches: [AUGUST_BATCH],
    currentBatch: null,
    completedCount: 0,
    totalCount: 0,
    isComplete: false,
    firstUncompletedQuestionnaireId: null,
    completedQuestionnaireIds: [],
    history: [],
    consecutiveBatches: 0,
    ...overrides
  };
}

/** Renders the FAB for a patient visitor with default study context. */
function renderFab(
  study: StudyProgress | null,
  overrides: Partial<ReportFabProps> = {}
) {
  return render(
    <ReportFab
      study={study}
      studyId='research'
      today={TODAY}
      isGuest={false}
      hasResponses={false}
      isPatient
      fhirId='pat-1'
      {...overrides}
    />
  );
}

/** Returns the last non-null SET_ACTION config dispatched to the FAB. */
function dispatchedAction(): ActionConfig {
  const configs = mockFabDispatch.mock.calls
    .map(([action]) => action)
    .filter(
      (action): action is Extract<FabAction, { type: 'SET_ACTION' }> =>
        action.type === 'SET_ACTION'
    )
    .map(action => action.config)
    .filter((config): config is ActionConfig => config !== null);
  const config = configs.at(-1);
  if (config === undefined) {
    throw new Error('ReportFab dispatched no non-null SET_ACTION config');
  }
  return config;
}

describe('ReportFab patient actions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("offers 'Lanjutkan' with ClipboardList while the current batch is open and incomplete", async () => {
    // A future batch also exists: the open incomplete batch has priority.
    const { container } = renderFab(
      makeStudy({
        batches: [AUGUST_BATCH, SEPTEMBER_BATCH],
        currentBatch: AUGUST_BATCH,
        totalCount: 2,
        completedCount: 1,
        firstUncompletedQuestionnaireId: 'phq2'
      })
    );
    // The FAB renders nothing visible itself; it only dispatches.
    expect(container).toBeEmptyDOMElement();
    const action = dispatchedAction();
    expect(action.label).toBe('Lanjutkan');
    expect(action.icon).toBe(ClipboardList);
    await action.onAction();
    expect(mockPush).toHaveBeenCalledWith(
      '/assessments?id=phq2&study=research'
    );
  });

  it("offers 'Ingatkan Saya' with CalendarPlus when a next batch exists", async () => {
    renderFab(
      makeStudy({
        batches: [AUGUST_BATCH, SEPTEMBER_BATCH],
        currentBatch: AUGUST_BATCH
      })
    );
    const action = dispatchedAction();
    expect(action.label).toBe('Ingatkan Saya');
    expect(action.icon).toBe(CalendarPlus);
    await action.onAction();
    expect(mockAddToCalendar).toHaveBeenCalledWith(
      expect.objectContaining({
        startDate: '2026-09-01',
        title: expect.stringContaining(STUDY_TITLE)
      })
    );
  });

  it("offers 'Ajak Teman' with Share2 when no next batch exists", async () => {
    renderFab(
      makeStudy({ batches: [AUGUST_BATCH], currentBatch: AUGUST_BATCH })
    );
    const action = dispatchedAction();
    expect(action.label).toBe('Ajak Teman');
    expect(action.icon).toBe(Share2);
    await action.onAction();
    expect(mockHandleShare).toHaveBeenCalledTimes(1);
  });
});
