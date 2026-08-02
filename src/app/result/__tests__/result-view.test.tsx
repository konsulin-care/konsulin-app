import { render, screen } from '@testing-library/react';
import type { Dispatch } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { FabAction } from '@/context/fabContext';

// Mock ScoreDisplay
vi.mock('@/components/assessment/score-display', () => ({
  default: ({
    questionnaireResponse,
    resultBrief
  }: {
    questionnaireResponse: unknown;
    resultBrief: string | null;
  }) => (
    <div data-testid='score-display'>
      {resultBrief === null ? 'claim-prompt' : resultBrief}
      {questionnaireResponse ? 'has-data' : 'no-data'}
    </div>
  )
}));

// Mock next/navigation
const mockReplace = vi.fn();
const mockPush = vi.fn();
vi.mock('next/navigation', () => ({
  useRouter: () => ({ replace: mockReplace, push: mockPush }),
  useSearchParams: vi.fn()
}));

// Mock auth context
vi.mock('@/context/auth/authContext', () => ({
  useAuth: vi.fn()
}));

// Mock FAB context
const mockDispatch = vi.fn<Dispatch<FabAction>>();
vi.mock('@/context/fabContext', () => ({
  useFab: vi.fn()
}));

// Mock IndexedDB
vi.mock('@/lib/indexeddb', () => ({
  STORES: { assessmentDrafts: 'assessment_drafts' },
  dbGetAll: vi.fn()
}));

// Mock redirect-intent
vi.mock('@/utils/redirect-intent', () => ({
  saveIntent: vi.fn()
}));

// Mock lucide-react ClipboardPlus
vi.mock('lucide-react', () => ({
  ClipboardPlus: () => <div data-testid='clipboard-plus' />
}));

// Mock PageHeader — avoid its heavy dependency tree
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

import { useAuth } from '@/context/auth/authContext';
import { useFab } from '@/context/fabContext';
import { dbGetAll } from '@/lib/indexeddb';
import { saveIntent } from '@/utils/redirect-intent';
import type { ReadonlyURLSearchParams } from 'next/navigation';
import { useSearchParams } from 'next/navigation';
import ResultView from '../result-view';

/** Sample draft used across tests. */
function sampleDraft(qrId = 'test-qr-id') {
  return [
    {
      ownerId: 'guest-1',
      questionnaireId: 'Questionnaire/test',
      response: {
        resourceType: 'QuestionnaireResponse',
        id: qrId,
        item: []
      },
      updatedAt: Date.now()
    }
  ];
}

type SetAction = Extract<FabAction, { type: 'SET_ACTION' }>;

/** Find the 'Claim Results' SET_ACTION call from the dispatched FAB actions. */
function findClaimAction(calls: readonly unknown[][]): SetAction | undefined {
  return calls.find(([action]) => {
    const fabAction = action as FabAction;
    return (
      fabAction.type === 'SET_ACTION' &&
      fabAction.config?.label === 'Claim Results'
    );
  })?.[0] as SetAction | undefined;
}

describe('ResultView', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    // Default: authenticated as guest (not logged in)
    vi.mocked(useAuth).mockReturnValue({
      state: { isAuthenticated: false, userInfo: { userId: 'guest-1' } },
      isLoading: false,
      dispatch: vi.fn()
    });

    // Default: FAB context
    vi.mocked(useFab).mockReturnValue({
      state: { action: null, selection: null, menu: null, panelOpen: false },
      dispatch: mockDispatch
    });

    // Default: no drafts found
    vi.mocked(dbGetAll).mockResolvedValue([]);

    // Default: search param has id
    vi.mocked(useSearchParams).mockReturnValue({
      get: vi.fn().mockReturnValue('test-qr-id')
    } as unknown as ReadonlyURLSearchParams);
  });

  it('shows loading state when auth is loading', () => {
    vi.mocked(useAuth).mockReturnValue({
      state: { isAuthenticated: false, userInfo: {} },
      isLoading: true,
      dispatch: vi.fn()
    });

    const { container } = render(<ResultView />);
    expect(container.textContent?.trim()).toBe('');
  });

  it('reads id from search params', () => {
    const getMock = vi.fn().mockReturnValue('my-qr-id');
    vi.mocked(useSearchParams).mockReturnValue({
      get: getMock
    } as unknown as ReadonlyURLSearchParams);

    render(<ResultView />);

    expect(getMock).toHaveBeenCalledWith('id');
  });

  it('shows empty state when no matching draft found', async () => {
    vi.mocked(dbGetAll).mockResolvedValue([]);

    render(<ResultView />);

    expect(await screen.findByText('Result not found')).toBeInTheDocument();
  });

  it('shows empty state when id param is missing', () => {
    vi.mocked(useSearchParams).mockReturnValue({
      get: vi.fn().mockReturnValue(null)
    } as unknown as ReadonlyURLSearchParams);

    render(<ResultView />);

    expect(screen.getByText('Result not found')).toBeInTheDocument();
  });

  it('renders ScoreDisplay with QR data from IndexedDB', async () => {
    vi.mocked(dbGetAll).mockResolvedValue(sampleDraft());

    render(<ResultView />);

    const scoreDisplay = await screen.findByTestId('score-display');
    expect(scoreDisplay).toBeInTheDocument();
  });

  it('passes resultBrief=null to ScoreDisplay for guest users', async () => {
    vi.mocked(dbGetAll).mockResolvedValue(sampleDraft());

    render(<ResultView />);

    const scoreDisplay = await screen.findByTestId('score-display');
    expect(scoreDisplay.textContent).toContain('claim-prompt');
    expect(scoreDisplay.textContent).toContain('has-data');
  });

  it('renders PageHeader with Assessment Result indicator and /assessments back route', async () => {
    vi.mocked(dbGetAll).mockResolvedValue(sampleDraft());

    render(<ResultView />);

    await screen.findByTestId('score-display');
    const header = screen.getByTestId('page-header');
    expect(header).toHaveAttribute('data-indicator', 'Assessment Result');
    expect(header).toHaveAttribute('data-back-route', '/assessments');
  });

  it('wraps ScoreDisplay in the standard padded white shell', async () => {
    vi.mocked(dbGetAll).mockResolvedValue(sampleDraft());

    const { container } = render(<ResultView />);

    const scoreDisplay = await screen.findByTestId('score-display');
    const shell = container.querySelector('[class*="rounded-t-[16px]"]');
    expect(shell).not.toBeNull();
    expect(shell).toContainElement(scoreDisplay);
  });

  it('renders the empty state inside the padded white shell', async () => {
    vi.mocked(dbGetAll).mockResolvedValue([]);

    const { container } = render(<ResultView />);

    const emptyText = await screen.findByText('Result not found');
    const shell = container.querySelector('[class*="rounded-t-[16px]"]');
    expect(shell).not.toBeNull();
    expect(shell).toContainElement(emptyText);
  });

  it('dispatches claim FAB action for unauthenticated guests with loaded data', async () => {
    vi.mocked(dbGetAll).mockResolvedValue(sampleDraft());

    render(<ResultView />);

    await screen.findByTestId('score-display');
    const claimAction = findClaimAction(mockDispatch.mock.calls);
    expect(claimAction).toBeDefined();
    expect(claimAction?.config.variant).toBe('primary');
    expect(typeof claimAction?.config.onAction).toBe('function');
  });

  it('does not dispatch claim FAB action when authenticated', async () => {
    vi.mocked(useAuth).mockReturnValue({
      state: { isAuthenticated: true, userInfo: { userId: 'user-1' } },
      isLoading: false,
      dispatch: vi.fn()
    });

    vi.mocked(dbGetAll).mockResolvedValue(sampleDraft());

    render(<ResultView />);

    await screen.findByTestId('score-display');
    expect(findClaimAction(mockDispatch.mock.calls)).toBeUndefined();
  });

  it('does not dispatch claim FAB action when no result data exists', async () => {
    vi.mocked(dbGetAll).mockResolvedValue([]);

    render(<ResultView />);

    await screen.findByText('Result not found');
    expect(findClaimAction(mockDispatch.mock.calls)).toBeUndefined();
  });

  it('clears the FAB action on unmount', async () => {
    vi.mocked(dbGetAll).mockResolvedValue(sampleDraft());

    const { unmount } = render(<ResultView />);

    await screen.findByTestId('score-display');
    mockDispatch.mockClear();
    unmount();

    expect(mockDispatch).toHaveBeenCalledWith({
      type: 'SET_ACTION',
      config: null
    });
  });

  it('saves intent and redirects to auth when the claim action fires', async () => {
    vi.mocked(dbGetAll).mockResolvedValue(sampleDraft());

    render(<ResultView />);

    await screen.findByTestId('score-display');
    const claimAction = findClaimAction(mockDispatch.mock.calls);
    expect(claimAction).toBeDefined();
    void claimAction?.config.onAction();

    expect(saveIntent).toHaveBeenCalledWith('assessmentResult', {
      path: '/record',
      qrId: 'test-qr-id'
    });
    expect(mockPush).toHaveBeenCalledWith('/auth?redirectToPath=/record');
  });
});
