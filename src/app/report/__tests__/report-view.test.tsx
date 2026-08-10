/* eslint-disable max-lines */
import { render, screen } from '@testing-library/react';
import type { Dispatch } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { FabAction } from '@/context/fabContext';
import type { QuestionnaireInfo } from '@/services/api/research';
import type {
  ResearchBatch,
  ResearchProgress,
  StudyProgress
} from '@/utils/fhir/research';

interface AuthState {
  state: { isAuthenticated: boolean; userInfo: { fhirId?: string } };
  isLoading: boolean;
}

type ResearchHookResult = {
  data?: ResearchProgress;
  isLoading: boolean;
};
type TitlesHookResult = {
  data: ReadonlyMap<string, QuestionnaireInfo>;
  isPending: boolean;
};
type ResponsesHookResult = {
  data: QuestionnaireResponse[];
  isLoading: boolean;
};

const {
  mockSearchParams,
  mockUseAuth,
  mockUseResearchProgress,
  mockUseQuestionnaireTitles,
  mockUseReportResponses,
  mockFabDispatch,
  mockPush
} = vi.hoisted(() => ({
  mockSearchParams: new URLSearchParams(),
  mockUseAuth: vi.fn<() => AuthState>(),
  mockUseResearchProgress: vi.fn<() => ResearchHookResult>(),
  mockUseQuestionnaireTitles: vi.fn<() => TitlesHookResult>(),
  mockUseReportResponses: vi.fn<() => ResponsesHookResult>(),
  mockFabDispatch: vi.fn<Dispatch<FabAction>>(),
  mockPush: vi.fn()
}));

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockPush, replace: vi.fn() }),
  useSearchParams: () => mockSearchParams
}));

vi.mock('@/context/auth/authContext', () => ({
  useAuth: () => mockUseAuth()
}));

vi.mock('@/services/api/research', () => ({
  useResearchProgress: () => mockUseResearchProgress()
}));

vi.mock('@/services/api/questionnaire-info', () => ({
  useQuestionnaireTitles: () => mockUseQuestionnaireTitles()
}));

vi.mock('@/services/api/report', () => ({
  useReportResponses: () => mockUseReportResponses()
}));

vi.mock('@/context/fabContext', () => ({
  useFab: () => ({ state: {}, dispatch: mockFabDispatch })
}));

vi.mock('@/components/page-header', () => ({
  default: ({
    pageIndicator,
    backRoute
  }: {
    pageIndicator?: string;
    backRoute?: string;
  }) => (
    <div
      data-testid='page-header'
      data-indicator={pageIndicator ?? ''}
      data-back-route={backRoute ?? ''}
    />
  )
}));

vi.mock('@/components/ui/progress', () => ({
  Progress: ({ value, color }: { value: number; color?: string }) => (
    <div data-testid='report-progress' data-value={value} data-color={color} />
  )
}));

vi.mock('lucide-react', async importOriginal => {
  const actual = await importOriginal<typeof import('lucide-react')>();
  return { ...actual, BookCheck: () => <div data-testid='book-check-icon' /> };
});

import type { QuestionnaireResponse, QuestionnaireResponseItem } from 'fhir/r4';
import ReportView from '../report-view';
const BATCH_1: ResearchBatch = {
  id: 'b1',
  start: '2026-08-01',
  end: '2026-08-31',
  questionnaireIds: ['phq2', 'ocean']
};
const BATCH_2: ResearchBatch = {
  id: 'b2',
  start: '2026-09-01',
  end: '2026-09-30',
  questionnaireIds: ['phq2']
};

const TITLE_MAP: ReadonlyMap<string, QuestionnaireInfo> = new Map([
  ['phq2', { title: 'PHQ-2', durationMinutes: 8 }],
  ['ocean', { title: 'Big Five Inventory', durationMinutes: 15 }]
]);

/** Builds a full QR with score-dimension interpretation items. */
function makeQr(
  id: string,
  questionnaire: string,
  authored: string,
  dims: Array<{ name: string; raw: number }>,
  ref: number
): QuestionnaireResponse {
  const items: QuestionnaireResponseItem[] = [
    { linkId: 'reference', answer: [{ valueInteger: ref }] },
    ...dims.map(({ name, raw }) => ({
      linkId: name.toLowerCase(),
      text: name,
      answer: [{ valueInteger: raw }]
    }))
  ];
  return {
    resourceType: 'QuestionnaireResponse',
    id,
    questionnaire: `Questionnaire/${questionnaire}`,
    status: 'completed',
    authored,
    item: [
      {
        linkId: 'interpretation',
        item: [{ linkId: 'score-dimension', item: items }]
      }
    ]
  };
}

const PHQ2_AUG = makeQr(
  'r1',
  'phq2',
  '2026-08-15T10:00:00Z',
  [{ name: 'Total', raw: 5 }],
  6
);
const OCEAN_AUG = makeQr(
  'r2',
  'ocean',
  '2026-08-16T10:00:00Z',
  [
    { name: 'Openness', raw: 22 },
    { name: 'Conscientiousness', raw: 17 },
    { name: 'Extroversion', raw: 26 },
    { name: 'Agreeableness', raw: 20 },
    { name: 'Neuroticism', raw: 24 }
  ],
  40
);
const PHQ2_SEP = makeQr(
  'r3',
  'phq2',
  '2026-09-10T10:00:00Z',
  [{ name: 'Total', raw: 3 }],
  6
);

/** StudyProgress fixture: two batches with PHQ-2 repeated. */
function makeStudy(overrides: Partial<StudyProgress> = {}): StudyProgress {
  return {
    study: {
      resourceType: 'ResearchStudy',
      id: 'research',
      status: 'active',
      title: 'Mental Health Survey',
      description: 'A longitudinal survey.'
    },
    batches: [BATCH_1, BATCH_2],
    currentBatch: BATCH_2,
    completedCount: 1,
    totalCount: 1,
    isComplete: true,
    firstUncompletedQuestionnaireId: null,
    completedQuestionnaireIds: ['phq2'],
    history: [
      {
        batchId: 'b1',
        start: '2026-08-01',
        end: '2026-08-31',
        participated: true
      },
      {
        batchId: 'b2',
        start: '2026-09-01',
        end: '2026-09-30',
        participated: true
      }
    ],
    consecutiveBatches: 2,
    ...overrides
  };
}

/** Default: authenticated patient with full two-batch participation. */
function seedDefaultMocks() {
  mockSearchParams.set('id', 'research');
  mockUseAuth.mockReturnValue({
    state: { isAuthenticated: true, userInfo: { fhirId: 'pat-1' } },
    isLoading: false
  });
  mockUseResearchProgress.mockReturnValue({
    data: {
      studies: [makeStudy()],
      cumulativeResponses: 3,
      questionnaireResponses: [],
      questionnaireXp: 0,
      completedQuestionnaireIds: [],
      consentedStudyIds: []
    },
    isLoading: false
  });
  mockUseQuestionnaireTitles.mockReturnValue({
    data: TITLE_MAP,
    isPending: false
  });
  mockUseReportResponses.mockReturnValue({
    data: [PHQ2_AUG, OCEAN_AUG, PHQ2_SEP],
    isLoading: false
  });
}

function findClaimAction(
  calls: readonly unknown[][]
): Extract<FabAction, { type: 'SET_ACTION' }> | undefined {
  return calls.find(([action]) => {
    const fabAction = action as FabAction;
    return (
      fabAction.type === 'SET_ACTION' &&
      fabAction.config?.label === 'Claim Report'
    );
  })?.[0] as Extract<FabAction, { type: 'SET_ACTION' }> | undefined;
}

describe('ReportView', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSearchParams.delete('id');
    seedDefaultMocks();
  });

  it('shows a graceful empty state when the study id is unknown', () => {
    mockUseResearchProgress.mockReturnValue({
      data: {
        studies: [],
        cumulativeResponses: 0,
        questionnaireResponses: [],
        questionnaireXp: 0,
        completedQuestionnaireIds: [],
        consentedStudyIds: []
      },
      isLoading: false
    });
    render(<ReportView />);
    expect(screen.getByText('Report not found')).toBeInTheDocument();
  });

  it('renders the study title without a status badge', async () => {
    render(<ReportView />);
    await screen.findAllByTestId('report-progress');
    expect(screen.getByTestId('report-study-title')).toHaveTextContent(
      'Mental Health Survey'
    );
    expect(screen.queryByTestId('report-status-badge')).toBeNull();
  });

  it('renders participation stats on the summary card', async () => {
    render(<ReportView />);
    await screen.findAllByTestId('report-progress');
    expect(screen.getByTestId('report-stat-assessments')).toHaveTextContent(
      '3'
    );
    expect(screen.getByTestId('report-stat-batches')).toHaveTextContent('2/2');
    expect(screen.getByTestId('report-stat-streak')).toHaveTextContent('2');
    expect(screen.getByTestId('report-stat-xp')).toHaveTextContent('155');
    expect(screen.getByTestId('report-stat-time')).toHaveTextContent('31');
    expect(screen.queryByTestId('report-stat-first')).toBeNull();
  });

  it('renders batch sections in reverse chronological order', async () => {
    render(<ReportView />);
    await screen.findAllByTestId('report-progress');
    const sections = screen.getAllByTestId('report-batch-section');
    expect(sections[0]).toHaveAttribute('data-batch-id', 'b2');
    expect(sections[1]).toHaveAttribute('data-batch-id', 'b1');
    expect(sections[0]).toHaveTextContent('Batch 2: 01 - 30 Sep 2026');
    expect(sections[1]).toHaveTextContent('Batch 1: 01 - 31 Aug 2026');
  });

  it('shows the big-five card with dimension bars sorted by percentage desc', async () => {
    render(<ReportView />);
    await screen.findAllByTestId('report-progress');
    const oceanCard = screen.getByTestId('report-questionnaire-card-ocean');
    const rows = [
      ...oceanCard.querySelectorAll('[data-testid="report-dimension-name"]')
    ].map(el => el.textContent);
    expect(rows).toEqual([
      'Extroversion',
      'Neuroticism',
      'Openness',
      'Agreeableness',
      'Conscientiousness'
    ]);
  });

  it('falls back to the all-caps questionnaire id when the title is missing', async () => {
    mockUseQuestionnaireTitles.mockReturnValue({
      data: new Map([['phq2', { title: 'PHQ-2', durationMinutes: 8 }]]),
      isPending: false
    });

    render(<ReportView />);
    await screen.findAllByTestId('report-progress');
    const oceanCard = screen.getByTestId('report-questionnaire-card-ocean');
    expect(oceanCard.querySelector('h3')?.textContent).toBe('OCEAN');
  });

  it('shows trend rows for a repeated instrument, latest highlighted', async () => {
    render(<ReportView />);
    await screen.findAllByTestId('report-progress');
    const rows = screen.getAllByTestId('report-trend-row');
    expect(rows).toHaveLength(2);
    expect(rows[0]).toHaveAttribute('data-batch-id', 'b1');
    expect(rows[0]).toHaveAttribute('data-latest', 'false');
    expect(rows[1]).toHaveAttribute('data-batch-id', 'b2');
    expect(rows[1]).toHaveAttribute('data-latest', 'true');
    expect(rows[0]).toHaveTextContent('Batch 1 (Aug)');
    expect(rows[1]).toHaveTextContent('Batch 2 (Sep)');
  });

  it('does not render a trend block in earlier batch cards of the repeated instrument', async () => {
    render(<ReportView />);
    await screen.findAllByTestId('report-progress');
    const b1Section = screen
      .getAllByTestId('report-batch-section')
      .find(section => section.dataset.batchId === 'b1');
    expect(b1Section?.querySelector('[data-testid="report-trend"]')).toBeNull();
  });

  it('shows a baseline badge and batch note for a repeated instrument with a single response', async () => {
    mockUseReportResponses.mockReturnValue({
      data: [PHQ2_AUG, OCEAN_AUG],
      isLoading: false
    });
    render(<ReportView />);
    await screen.findAllByTestId('report-progress');
    expect(screen.getByTestId('report-baseline-badge')).toBeInTheDocument();
    expect(screen.getByTestId('report-baseline-note')).toHaveTextContent(
      'Baseline scores recorded for 1 assessment for future comparison'
    );
    expect(screen.queryByTestId('report-trend')).toBeNull();
  });

  it('renders no baseline badge or note when instruments show trends or are single-batch', async () => {
    render(<ReportView />);
    await screen.findAllByTestId('report-progress');
    expect(screen.queryByTestId('report-baseline-badge')).toBeNull();
    expect(screen.queryByTestId('report-baseline-note')).toBeNull();
  });

  it('shows the baseline note once per batch with the total baseline count', async () => {
    mockUseResearchProgress.mockReturnValue({
      data: {
        studies: [
          makeStudy({
            batches: [
              {
                id: 'b1',
                start: '2026-08-01',
                end: '2026-08-31',
                questionnaireIds: ['phq2', 'ocean']
              },
              {
                id: 'b2',
                start: '2026-09-01',
                end: '2026-09-30',
                questionnaireIds: ['phq2', 'ocean']
              }
            ]
          })
        ],
        cumulativeResponses: 2,
        questionnaireResponses: [],
        questionnaireXp: 0,
        completedQuestionnaireIds: [],
        consentedStudyIds: []
      },
      isLoading: false
    });
    mockUseReportResponses.mockReturnValue({
      data: [PHQ2_AUG, OCEAN_AUG],
      isLoading: false
    });
    render(<ReportView />);
    await screen.findAllByTestId('report-progress');
    expect(screen.getAllByTestId('report-baseline-note')).toHaveLength(1);
    expect(screen.getByTestId('report-baseline-note')).toHaveTextContent(
      'Baseline scores recorded for 2 assessments for future comparison'
    );
    expect(screen.getAllByTestId('report-baseline-badge')).toHaveLength(2);
  });

  it('shows a shared completion date once in the batch header, not per card', async () => {
    const oceanSameDay = makeQr(
      'r2-same-day',
      'ocean',
      '2026-08-15T10:00:00Z',
      [
        { name: 'Openness', raw: 22 },
        { name: 'Conscientiousness', raw: 17 },
        { name: 'Extroversion', raw: 26 },
        { name: 'Agreeableness', raw: 20 },
        { name: 'Neuroticism', raw: 24 }
      ],
      40
    );
    mockUseReportResponses.mockReturnValue({
      data: [PHQ2_AUG, oceanSameDay],
      isLoading: false
    });
    render(<ReportView />);
    await screen.findAllByTestId('report-progress');
    const b1Section = screen
      .getAllByTestId('report-batch-section')
      .find(section => section.dataset.batchId === 'b1');
    expect(b1Section).toBeDefined();
    const header = b1Section?.querySelector(
      '[data-testid="report-batch-header"]'
    );
    expect(header?.textContent).toContain('Completed at 15 Aug 2026');
    const completedLeaves = [
      ...(b1Section?.querySelectorAll('span, p') ?? [])
    ].filter(el => el.textContent?.includes('Completed'));
    expect(completedLeaves).toHaveLength(1);
    const cards = b1Section?.querySelectorAll(
      '[data-testid^="report-questionnaire-card-"]'
    );
    cards?.forEach(card => {
      expect(card.textContent).not.toContain('Completed');
    });
  });

  it('keeps per-card completion dates when dates differ within a batch', async () => {
    render(<ReportView />);
    await screen.findAllByTestId('report-progress');
    const b1Section = screen
      .getAllByTestId('report-batch-section')
      .find(section => section.dataset.batchId === 'b1');
    expect(b1Section).toBeDefined();
    const header = b1Section?.querySelector(
      '[data-testid="report-batch-header"]'
    );
    expect(header?.textContent).not.toContain('Completed');
    const phq2Card = b1Section?.querySelector(
      '[data-testid="report-questionnaire-card-phq2"]'
    );
    expect(phq2Card?.textContent).toContain('Completed 15 Aug 2026');
    const oceanCard = b1Section?.querySelector(
      '[data-testid="report-questionnaire-card-ocean"]'
    );
    expect(oceanCard?.textContent).toContain('Completed 16 Aug 2026');
  });

  it('renders the disclaimer footer', async () => {
    render(<ReportView />);
    await screen.findAllByTestId('report-progress');
    expect(screen.getByTestId('report-disclaimer')).toBeInTheDocument();
  });

  it('offers guests the claim nudge and Claim Report FAB', async () => {
    mockUseAuth.mockReturnValue({
      state: { isAuthenticated: false, userInfo: {} },
      isLoading: false
    });
    render(<ReportView />);
    await screen.findAllByTestId('report-progress');
    expect(
      screen.getByText('Claim this report to unlock score history record')
    ).toBeInTheDocument();
    const claimAction = findClaimAction(mockFabDispatch.mock.calls);
    expect(claimAction).toBeDefined();
    expect(claimAction?.config.variant).toBe('primary');
  });

  it('does not offer the claim FAB to authenticated users', async () => {
    render(<ReportView />);
    await screen.findAllByTestId('report-progress');
    expect(
      screen.queryByText('Claim this report to unlock score history record')
    ).toBeNull();
    expect(findClaimAction(mockFabDispatch.mock.calls)).toBeUndefined();
  });

  it('routes the claim FAB back to the report after auth', async () => {
    mockUseAuth.mockReturnValue({
      state: { isAuthenticated: false, userInfo: {} },
      isLoading: false
    });
    render(<ReportView />);
    await screen.findAllByTestId('report-progress');
    const claimAction = findClaimAction(mockFabDispatch.mock.calls);
    expect(claimAction).toBeDefined();
    // skipcq: JS-0098 - invoke claim action in test without awaiting
    void claimAction?.config.onAction();
    expect(mockPush).toHaveBeenCalledWith(
      '/auth?redirectToPath=/report?id=research'
    );
  });
});
