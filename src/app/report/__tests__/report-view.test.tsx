/* eslint-disable max-lines */
import { render, screen } from '@testing-library/react';
import type { Dispatch } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/i18n', async () => {
  const { createUseTranslationsMock } =
    await import('@/i18n/__tests__/test-messages');
  return { useTranslations: createUseTranslationsMock() };
});

import type { FabAction } from '@/context/fabContext';
import type { QuestionnaireInfo } from '@/services/api/research';
import { trendDirection } from '@/utils/fhir/report';
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
  mockPush,
  mockReplace,
  mockResearchProgressOptions,
  mockReportResponsesArgs
} = vi.hoisted(() => ({
  mockSearchParams: new URLSearchParams(),
  mockUseAuth: vi.fn<() => AuthState>(),
  mockUseResearchProgress: vi.fn<() => ResearchHookResult>(),
  mockUseQuestionnaireTitles: vi.fn<() => TitlesHookResult>(),
  mockUseReportResponses: vi.fn<() => ResponsesHookResult>(),
  mockFabDispatch: vi.fn<Dispatch<FabAction>>(),
  mockPush: vi.fn(),
  mockReplace: vi.fn(),
  mockResearchProgressOptions:
    vi.fn<(options?: { skipResponseSearch?: boolean }) => void>(),
  mockReportResponsesArgs:
    vi.fn<
      (ids: string[], since?: string | null, until?: string | null) => void
    >()
}));

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockPush, replace: mockReplace }),
  useSearchParams: () => mockSearchParams
}));

vi.mock('@/context/auth/authContext', () => ({
  useAuth: () => mockUseAuth()
}));

// useResearchXp reads circle referrals for patients; keep the query mocked.
vi.mock('@/services/api/circle', () => ({
  useCircleStats: () => ({ data: { converted: 0, joined: 0 } })
}));

vi.mock('@/services/api/research', () => ({
  useResearchProgress: (options?: { skipResponseSearch?: boolean }) => {
    mockResearchProgressOptions(options);
    return mockUseResearchProgress();
  }
}));

vi.mock('@/services/api/questionnaire-info', () => ({
  EMPTY_QUESTIONNAIRE_INFO_MAP: new Map(),
  useQuestionnaireTitles: () => mockUseQuestionnaireTitles()
}));

vi.mock('@/services/api/report', () => ({
  useReportResponses: (
    ids: string[],
    since?: string | null,
    until?: string | null
  ) => {
    mockReportResponsesArgs(ids, since, until);
    return mockUseReportResponses();
  }
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
    mockSearchParams.delete('completed');
    seedDefaultMocks();
  });

  it('requests full progress and scopes responses to the study period', () => {
    render(<ReportView />);
    // Progress: the hero needs global XP data, so the full progress payload
    // is fetched — no structure-only shortcut.
    expect(mockResearchProgressOptions).toHaveBeenCalledWith(undefined);
    expect(mockResearchProgressOptions).not.toHaveBeenCalledWith({
      skipResponseSearch: true
    });
    // Responses: one query over all batch questionnaires, bounded by the
    // earliest batch start and latest batch end so only relevant responses
    // are fetched.
    expect(mockReportResponsesArgs).toHaveBeenCalledWith(
      ['phq2', 'ocean'],
      '2026-08-01',
      '2026-09-30'
    );
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

  it('renders every score bar with the neutral color regardless of dimension', async () => {
    render(<ReportView />);
    await screen.findAllByTestId('report-progress');
    const bars = screen.getAllByTestId('report-progress');
    expect(bars.length).toBeGreaterThan(0);
    bars.forEach(bar => {
      expect(bar).toHaveAttribute('data-color', '#94A3B8');
    });
  });

  it('shows the dimension value as raw/reference without a percentage', async () => {
    render(<ReportView />);
    await screen.findAllByTestId('report-progress');
    const b2Section = screen
      .getAllByTestId('report-batch-section')
      .find(section => section.dataset.batchId === 'b2');
    const value = b2Section
      ?.querySelector('[data-testid="report-questionnaire-card-phq2"]')
      ?.querySelector('[data-testid="report-dimension-value"]');
    expect(value).toHaveTextContent('3/6');
    expect(value?.textContent).not.toContain('%');
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

  it('marks each non-first trend row with a neutral delta direction', async () => {
    render(<ReportView />);
    await screen.findAllByTestId('report-progress');
    const rows = screen.getAllByTestId('report-trend-row');
    expect(rows).toHaveLength(2);
    expect(
      rows[0]?.querySelector('[data-testid="report-trend-delta"]')
    ).toBeNull();
    const delta = rows[1]?.querySelector('[data-testid="report-trend-delta"]');
    const expected = trendDirection(5, 3);
    expect(expected).toBe('down');
    expect(delta).toHaveAttribute('data-direction', expected);
    expect(delta).toHaveAttribute('aria-label', 'Score down');
    expect(rows[1]?.textContent).not.toContain('%');
  });

  it('does not render a trend block in earlier batch cards of the repeated instrument', async () => {
    render(<ReportView />);
    await screen.findAllByTestId('report-progress');
    const b1Section = screen
      .getAllByTestId('report-batch-section')
      .find(section => section.dataset.batchId === 'b1');
    expect(b1Section?.querySelector('[data-testid="report-trend"]')).toBeNull();
  });

  it('shows a baseline badge with the comparison batch and no batch note', async () => {
    mockUseReportResponses.mockReturnValue({
      data: [PHQ2_AUG, OCEAN_AUG],
      isLoading: false
    });
    render(<ReportView />);
    await screen.findAllByTestId('report-progress');
    expect(screen.getByTestId('report-baseline-badge')).toHaveTextContent(
      'Baseline · compared in Batch 2 (Sep)'
    );
    expect(screen.queryByTestId('report-baseline-note')).toBeNull();
    expect(screen.queryByTestId('report-trend')).toBeNull();
  });

  it('shows only the baseline label when no later batch repeats the questionnaire', async () => {
    mockUseReportResponses.mockReturnValue({
      data: [PHQ2_SEP, OCEAN_AUG],
      isLoading: false
    });
    render(<ReportView />);
    await screen.findAllByTestId('report-progress');
    expect(screen.getByTestId('report-baseline-badge')).toHaveTextContent(
      /^Baseline$/
    );
    expect(screen.queryByTestId('report-baseline-note')).toBeNull();
  });

  it('renders no baseline badge or note when instruments show trends or are single-batch', async () => {
    render(<ReportView />);
    await screen.findAllByTestId('report-progress');
    expect(screen.queryByTestId('report-baseline-badge')).toBeNull();
    expect(screen.queryByTestId('report-baseline-note')).toBeNull();
  });

  it('shows a comparison badge per baseline card and no batch note', async () => {
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
    expect(screen.queryAllByTestId('report-baseline-note')).toHaveLength(0);
    const badges = screen.getAllByTestId('report-baseline-badge');
    expect(badges).toHaveLength(2);
    badges.forEach(badge => {
      expect(badge).toHaveTextContent('Baseline · compared in Batch 2 (Sep)');
    });
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
      screen.getByText(
        'Claim this report within 24 hours to unlock score history record'
      )
    ).toBeInTheDocument();
    const claimAction = findClaimAction(mockFabDispatch.mock.calls);
    expect(claimAction).toBeDefined();
    expect(claimAction?.config.variant).toBe('primary');
  });

  it('does not offer the claim FAB to authenticated users', async () => {
    render(<ReportView />);
    await screen.findAllByTestId('report-progress');
    expect(
      screen.queryByText(
        'Claim this report within 24 hours to unlock score history record'
      )
    ).toBeNull();
    expect(findClaimAction(mockFabDispatch.mock.calls)).toBeUndefined();
  });

  it('deduplicates multiple responses for the same questionnaire within a batch', async () => {
    // Two phq2 responses in batch 1, one in batch 2
    const phq2Aug1 = makeQr(
      'dup-1',
      'phq2',
      '2026-08-10T10:00:00Z',
      [{ name: 'Total', raw: 4 }],
      6
    );
    const phq2Aug2 = makeQr(
      'dup-2',
      'phq2',
      '2026-08-20T10:00:00Z',
      [{ name: 'Total', raw: 5 }],
      6
    );
    mockUseReportResponses.mockReturnValue({
      data: [phq2Aug1, phq2Aug2, PHQ2_SEP],
      isLoading: false
    });
    render(<ReportView />);
    await screen.findAllByTestId('report-progress');
    // Stats count the de-duplicated responses: phq2 in b1 counted once
    expect(screen.getByTestId('report-stat-assessments')).toHaveTextContent(
      '2'
    );
    // Trend should show exactly 2 rows (not 3)
    const trendRows = screen.getAllByTestId('report-trend-row');
    expect(trendRows).toHaveLength(2);
    const batchIds = trendRows.map(row => row.getAttribute('data-batch-id'));
    expect(new Set(batchIds).size).toBe(2);
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

  it('strips the completed flag with router.replace after the batch', async () => {
    mockSearchParams.set('completed', '1');
    render(<ReportView />);
    await screen.findAllByTestId('report-progress');
    expect(mockReplace).toHaveBeenCalledWith('/report?id=research');
  });

  it('keeps the study title and never redirects without the flag', async () => {
    render(<ReportView />);
    await screen.findAllByTestId('report-progress');
    expect(screen.getByTestId('report-study-title')).toHaveTextContent(
      'Mental Health Survey'
    );
    expect(mockReplace).not.toHaveBeenCalled();
  });

  it('counts batches with responses out of the study total', async () => {
    const fourBatches: ResearchBatch[] = [
      BATCH_1,
      BATCH_2,
      {
        id: 'b3',
        start: '2026-10-01',
        end: '2026-10-31',
        questionnaireIds: ['phq2']
      },
      {
        id: 'b4',
        start: '2026-11-01',
        end: '2026-11-30',
        questionnaireIds: ['phq2']
      }
    ];
    mockUseResearchProgress.mockReturnValue({
      data: {
        studies: [makeStudy({ batches: fourBatches })],
        cumulativeResponses: 2,
        questionnaireResponses: [],
        questionnaireXp: 0,
        completedQuestionnaireIds: [],
        consentedStudyIds: []
      },
      isLoading: false
    });
    // Responses land in batches 1 and 2 only.
    mockUseReportResponses.mockReturnValue({
      data: [PHQ2_AUG, PHQ2_SEP],
      isLoading: false
    });
    render(<ReportView />);
    await screen.findAllByTestId('report-progress');
    expect(screen.getByTestId('report-stat-batches')).toHaveTextContent('2/4');
  });
});
