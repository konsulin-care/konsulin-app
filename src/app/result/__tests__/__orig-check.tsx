/* eslint-disable @typescript-eslint/no-unsafe-argument */

import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

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
import { dbGetAll } from '@/lib/indexeddb';
import { saveIntent } from '@/utils/redirect-intent';
import { useSearchParams } from 'next/navigation';
import ResultView from '../result-view';

describe('ResultView', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    // Default: authenticated as guest (not logged in)
    vi.mocked(useAuth).mockReturnValue({
      state: { isAuthenticated: false, userInfo: { userId: 'guest-1' } },
      isLoading: false
    } as any);

    // Default: no drafts found
    vi.mocked(dbGetAll).mockResolvedValue([]);

    // Default: search param has id
    vi.mocked(useSearchParams).mockReturnValue({
      get: vi.fn().mockReturnValue('test-qr-id')
    } as any);
  });

  it('shows loading state when auth is loading', () => {
    vi.mocked(useAuth).mockReturnValue({
      state: { isAuthenticated: false },
      isLoading: true
    } as any);

    const { container } = render(<ResultView />);
    expect(container.textContent?.trim()).toBe('');
  });

  it('reads id from search params', () => {
    const getMock = vi.fn().mockReturnValue('my-qr-id');
    vi.mocked(useSearchParams).mockReturnValue({ get: getMock } as any);

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
    } as any);

    render(<ResultView />);

    expect(screen.getByText('Result not found')).toBeInTheDocument();
  });

  it('renders ScoreDisplay with QR data from IndexedDB', async () => {
    const qrData = {
      resourceType: 'QuestionnaireResponse',
      id: 'test-qr-id',
      item: []
    };
    vi.mocked(dbGetAll).mockResolvedValue([
      {
        ownerId: 'guest-1',
        questionnaireId: 'Questionnaire/test',
        response: qrData,
        updatedAt: Date.now()
      }
    ]);

    render(<ResultView />);

    const scoreDisplay = await screen.findByTestId('score-display');
    expect(scoreDisplay).toBeInTheDocument();
  });

  it('passes resultBrief=null to ScoreDisplay for guest users', async () => {
    const qrData = {
      resourceType: 'QuestionnaireResponse',
      id: 'test-qr-id',
      item: []
    };
    vi.mocked(dbGetAll).mockResolvedValue([
      {
        ownerId: 'guest-1',
        questionnaireId: 'Questionnaire/test',
        response: qrData,
        updatedAt: Date.now()
      }
    ]);

    render(<ResultView />);

    const scoreDisplay = await screen.findByTestId('score-display');
    expect(scoreDisplay.textContent).toContain('claim-prompt');
    expect(scoreDisplay.textContent).toContain('has-data');
  });

  it('shows "Claim Results" FAB when unauthenticated', async () => {
    const qrData = {
      resourceType: 'QuestionnaireResponse',
      id: 'test-qr-id',
      item: []
    };
    vi.mocked(dbGetAll).mockResolvedValue([
      {
        ownerId: 'guest-1',
        questionnaireId: 'Questionnaire/test',
        response: qrData,
        updatedAt: Date.now()
      }
    ]);

    render(<ResultView />);

    expect(await screen.findByText('Claim Results')).toBeInTheDocument();
    expect(screen.getByTestId('clipboard-plus')).toBeInTheDocument();
  });

  it('does not show "Claim Results" FAB when authenticated', async () => {
    vi.mocked(useAuth).mockReturnValue({
      state: { isAuthenticated: true, userInfo: { userId: 'user-1' } },
      isLoading: false
    } as any);

    const qrData = {
      resourceType: 'QuestionnaireResponse',
      id: 'test-qr-id',
      item: []
    };
    vi.mocked(dbGetAll).mockResolvedValue([
      {
        ownerId: 'guest-1',
        questionnaireId: 'Questionnaire/test',
        response: qrData,
        updatedAt: Date.now()
      }
    ]);

    render(<ResultView />);

    await screen.findByTestId('score-display');
    expect(screen.queryByText('Claim Results')).not.toBeInTheDocument();
  });

  it('renders PageHeader with Assessment Result indicator and /assessments back route', async () => {
    const qrData = {
      resourceType: 'QuestionnaireResponse',
      id: 'test-qr-id',
      item: []
    };
    vi.mocked(dbGetAll).mockResolvedValue([
      {
        ownerId: 'guest-1',
        questionnaireId: 'Questionnaire/test',
        response: qrData,
        updatedAt: Date.now()
      }
    ]);

    render(<ResultView />);

    await screen.findByTestId('score-display');
    const header = screen.getByTestId('page-header');
    expect(header).toHaveAttribute('data-indicator', 'Assessment Result');
    expect(header).toHaveAttribute('data-back-route', '/assessments');
  });

  it('wraps ScoreDisplay in the standard padded white shell', async () => {
    const qrData = {
      resourceType: 'QuestionnaireResponse',
      id: 'test-qr-id',
      item: []
    };
    vi.mocked(dbGetAll).mockResolvedValue([
      {
        ownerId: 'guest-1',
        questionnaireId: 'Questionnaire/test',
        response: qrData,
        updatedAt: Date.now()
      }
    ]);

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

  it('saves intent and redirects to auth on FAB click', async () => {
    const qrData = {
      resourceType: 'QuestionnaireResponse',
      id: 'test-qr-id',
      item: []
    };
    vi.mocked(dbGetAll).mockResolvedValue([
      {
        ownerId: 'guest-1',
        questionnaireId: 'Questionnaire/test',
        response: qrData,
        updatedAt: Date.now()
      }
    ]);

    render(<ResultView />);

    const button = await screen.findByText('Claim Results');
    fireEvent.click(button);

    expect(saveIntent).toHaveBeenCalledWith('assessmentResult', {
      path: '/record',
      qrId: 'test-qr-id'
    });
    expect(mockPush).toHaveBeenCalledWith('/auth?redirectToPath=/record');
  });
});
