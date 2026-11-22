import { useAuth } from '@/context/auth/authContext';
import type { PendingSubmission } from '@/lib/indexeddb';
import { ownerOf } from '@/lib/submission-owner';
import {
  listOwnedSubmissions,
  listenForSyncReplay,
  removeSubmission,
  replayPendingSubmissions,
  retrySubmission
} from '@/lib/submission-queue';
import { registerSubmissionReplayHandlers } from '@/lib/submission-replay';
import {
  fireEvent,
  render,
  renderHook,
  screen,
  waitFor,
  within
} from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import PendingSubmissionsBanner, {
  usePendingSubmissions
} from '../pending-submissions';

vi.mock('@/lib/submission-queue', () => ({
  listOwnedSubmissions: vi.fn(),
  replayPendingSubmissions: vi.fn(),
  listenForSyncReplay: vi.fn(() => vi.fn()),
  retrySubmission: vi.fn(),
  removeSubmission: vi.fn()
}));

vi.mock('@/lib/submission-replay', () => ({
  registerSubmissionReplayHandlers: vi.fn()
}));

vi.mock('@/context/auth/authContext', () => ({
  useAuth: vi.fn()
}));

vi.mock('@/i18n', () => ({
  useTranslations: vi.fn(
    (namespace: string) =>
      (key: string, values?: Record<string, string | number>) => {
        const translations: Record<string, Record<string, string>> = {
          common: {
            'pwa.waiting_to_sync': '{count} submissions waiting to sync',
            'pwa.sync_now': 'Sync now',
            'pwa.parked_to_sync': '{count} could not be sent',
            'pwa.review': 'Review',
            'pwa.parked_title': 'Could not be sent',
            'pwa.parked_description': 'These submissions could not be sent.',
            'pwa.parked_empty': 'No submissions need review.',
            'pwa.parked_details': 'Details',
            'pwa.reason_invalid': 'Rejected as invalid',
            'pwa.reason_missing': 'Questionnaire no longer exists',
            'pwa.reason_max_attempts': 'Could not send after several tries',
            'pwa.reason_generic': 'Could not be sent',
            'pwa.retry': 'Retry',
            'pwa.discard': 'Discard',
            'pwa.discard_title': 'Discard this submission?',
            'pwa.discard_description':
              'This queued submission will be removed.',
            'pwa.discard_confirm': 'Discard',
            'pwa.cancel_discard': 'Cancel'
          }
        };
        const template = translations[namespace]?.[key] ?? key;
        return template.replace(/\{(\w+)\}/g, (match, name: string) =>
          String(values?.[name] ?? match)
        );
      }
  )
}));

/** Builds a queued submission with an owner derived from its author. */
function makeItem(
  id: string,
  author: string,
  status?: 'waiting' | 'parked'
): PendingSubmission {
  const item: PendingSubmission = {
    id,
    ownerId: '',
    kind: 'questionnaire-response',
    payload: { author: { reference: author } },
    createdAt: 1,
    attempts: 0
  };
  if (status) item.status = status;
  return item;
}

/** Sets the mocked auth state for the current render. */
function setAuth(options: {
  isLoading: boolean;
  isAuthenticated: boolean;
  role?: string;
  fhirId?: string;
}): void {
  vi.mocked(useAuth).mockReturnValue({
    isLoading: options.isLoading,
    dispatch: vi.fn(),
    state: {
      isAuthenticated: options.isAuthenticated,
      userInfo: {
        role_name: options.role,
        fhirId: options.fhirId
      }
    }
  });
}

describe('usePendingSubmissions', () => {
  beforeEach(() => {
    vi.mocked(listOwnedSubmissions).mockResolvedValue([]);
    vi.mocked(replayPendingSubmissions).mockResolvedValue();
    vi.mocked(listenForSyncReplay).mockReturnValue(vi.fn());
    vi.mocked(registerSubmissionReplayHandlers).mockReturnValue();
    setAuth({ isLoading: false, isAuthenticated: false });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('does not replay while auth is still loading', async () => {
    setAuth({ isLoading: true, isAuthenticated: false });

    renderHook(() => usePendingSubmissions());

    await waitFor(() => expect(useAuth).toHaveBeenCalled());
    expect(replayPendingSubmissions).not.toHaveBeenCalled();
    expect(listOwnedSubmissions).not.toHaveBeenCalled();
  });

  it('replays with the authenticated owner key once auth resolves', async () => {
    setAuth({
      isLoading: true,
      isAuthenticated: true,
      role: 'Patient',
      fhirId: 'p1'
    });

    const { rerender } = renderHook(() => usePendingSubmissions());
    expect(replayPendingSubmissions).not.toHaveBeenCalled();

    setAuth({
      isLoading: false,
      isAuthenticated: true,
      role: 'Patient',
      fhirId: 'p1'
    });
    rerender();

    await waitFor(() =>
      expect(replayPendingSubmissions).toHaveBeenCalledWith({
        ownerKey: 'Patient/p1',
        isGuest: false
      })
    );
    expect(listOwnedSubmissions).toHaveBeenCalledWith('Patient/p1', false);
  });

  it('derives the owner key from the payload and excludes other owners', async () => {
    const items = [
      makeItem('mine-waiting', 'Patient/p1'),
      makeItem('mine-parked', 'Patient/p1', 'parked'),
      makeItem('theirs-waiting', 'Patient/p2'),
      makeItem('theirs-parked', 'Patient/p2', 'parked')
    ];
    vi.mocked(listOwnedSubmissions).mockImplementation(
      async (ownerKey, isGuest) =>
        items.filter(item => {
          const key = ownerOf(item);
          if (key === 'guest:unbound') return isGuest;
          return key === ownerKey;
        })
    );
    setAuth({
      isLoading: false,
      isAuthenticated: true,
      role: 'Patient',
      fhirId: 'p1'
    });

    const { result } = renderHook(() => usePendingSubmissions());

    await waitFor(() => expect(result.current.waitingCount).toBe(1));
    expect(result.current.parkedCount).toBe(1);
  });
});

describe('PendingSubmissionsBanner', () => {
  beforeEach(() => {
    vi.mocked(listOwnedSubmissions).mockResolvedValue([
      makeItem('a', 'Patient/p1'),
      makeItem('b', 'Patient/p1')
    ]);
    vi.mocked(replayPendingSubmissions).mockResolvedValue();
    vi.mocked(listenForSyncReplay).mockReturnValue(vi.fn());
    setAuth({
      isLoading: false,
      isAuthenticated: true,
      role: 'Patient',
      fhirId: 'p1'
    });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('shows the waiting count and a sync button when submissions are queued', async () => {
    render(<PendingSubmissionsBanner />);

    expect(await screen.findByText(/2/)).toBeTruthy();
    expect(screen.getByRole('button', { name: /sync now/i })).toBeTruthy();
  });

  it('renders the banner as an <output> element', async () => {
    const { container } = render(<PendingSubmissionsBanner />);
    await screen.findByText(/2/);
    expect(container.querySelector('output')).not.toBeNull();
  });

  it('uses the warning tint banner and turquoise sync button tokens', async () => {
    const { container } = render(<PendingSubmissionsBanner />);
    await screen.findByText(/2/);

    const banner = container.querySelector('output');
    expect(banner?.className).toContain('bg-warning-tint');
    expect(banner?.className).toContain('text-warning-deep');
    expect(banner?.className).not.toMatch(/amber/);
    expect(banner?.className).not.toMatch(/neutral/);

    const button = screen.getByRole('button', { name: /sync now/i });
    expect(button.className).toContain('text-turquoise-deep');
    expect(button.className).not.toMatch(/teal/);
  });

  it('renders nothing when the queue is empty', async () => {
    vi.mocked(listOwnedSubmissions).mockResolvedValue([]);

    const { container } = render(<PendingSubmissionsBanner />);

    await waitFor(() => expect(listOwnedSubmissions).toHaveBeenCalled());
    expect(container.firstChild).toBeNull();
  });

  it('replays the queue when Sync now is clicked and refreshes the count', async () => {
    render(<PendingSubmissionsBanner />);
    await screen.findByText(/2/);

    vi.mocked(listOwnedSubmissions).mockResolvedValue([]);
    fireEvent.click(screen.getByRole('button', { name: /sync now/i }));

    // Called once on mount (page-load replay) and once on click.
    await waitFor(() =>
      expect(replayPendingSubmissions).toHaveBeenCalledTimes(2)
    );
    await waitFor(() =>
      expect(screen.queryByRole('button', { name: /sync now/i })).toBeNull()
    );
  });

  it('replays the queue when the browser comes online', async () => {
    render(<PendingSubmissionsBanner />);
    await screen.findByText(/2/);

    window.dispatchEvent(new Event('online'));

    // Called once on mount and once for the online event.
    await waitFor(() =>
      expect(replayPendingSubmissions).toHaveBeenCalledTimes(2)
    );
  });

  it('registers replay handlers and the SW message listener on mount', async () => {
    render(<PendingSubmissionsBanner />);

    await screen.findByText(/2/);
    expect(registerSubmissionReplayHandlers).toHaveBeenCalled();
    expect(listenForSyncReplay).toHaveBeenCalled();
  });
});

describe('PendingSubmissionsBanner parked submissions', () => {
  /** Builds a parked item with a label, timestamp and last error. */
  function makeParked(
    id: string,
    label: string,
    createdAt: number,
    lastError: { status?: number; message: string }
  ): PendingSubmission {
    return {
      ...makeItem(id, 'Patient/p1', 'parked'),
      label,
      createdAt,
      lastError
    };
  }

  beforeEach(() => {
    vi.mocked(replayPendingSubmissions).mockResolvedValue();
    vi.mocked(listenForSyncReplay).mockReturnValue(vi.fn());
    vi.mocked(registerSubmissionReplayHandlers).mockReturnValue();
    vi.mocked(retrySubmission).mockResolvedValue();
    vi.mocked(removeSubmission).mockResolvedValue();
    setAuth({
      isLoading: false,
      isAuthenticated: true,
      role: 'Patient',
      fhirId: 'p1'
    });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('shows only the parked part when nothing is waiting', async () => {
    vi.mocked(listOwnedSubmissions).mockResolvedValue([
      makeParked('a', 'PHQ-9', 1, { status: 400, message: 'invalid' })
    ]);

    render(<PendingSubmissionsBanner />);

    expect(await screen.findByText(/1 could not be sent/)).toBeTruthy();
    expect(screen.getByRole('button', { name: /review/i })).toBeTruthy();
    expect(screen.queryByRole('button', { name: /sync now/i })).toBeNull();
  });

  it('lists each parked item with its label, date and mapped reason', async () => {
    const createdAt = Date.UTC(2024, 0, 2, 3, 4);
    vi.mocked(listOwnedSubmissions).mockResolvedValue([
      makeParked('a', 'PHQ-9', createdAt, {
        status: 400,
        message: 'invalid answer'
      }),
      makeParked('b', 'GAD-7', createdAt, {
        status: 404,
        message: 'not found'
      })
    ]);

    render(<PendingSubmissionsBanner />);
    fireEvent.click(await screen.findByRole('button', { name: /review/i }));

    expect(await screen.findByText('PHQ-9')).toBeTruthy();
    expect(screen.getByText('GAD-7')).toBeTruthy();
    expect(screen.getByText('Rejected as invalid')).toBeTruthy();
    expect(screen.getByText('Questionnaire no longer exists')).toBeTruthy();
    const expectedDate = new Intl.DateTimeFormat(undefined, {
      dateStyle: 'medium',
      timeStyle: 'short'
    }).format(new Date(createdAt));
    expect(screen.getAllByText(expectedDate)).toHaveLength(2);
    expect(screen.getByText('invalid answer')).toBeTruthy();
  });

  it('retries one item and discards only the confirmed item', async () => {
    vi.mocked(listOwnedSubmissions).mockResolvedValue([
      makeParked('a', 'PHQ-9', 1, { status: 400, message: 'invalid' }),
      makeParked('b', 'GAD-7', 2, { status: 500, message: 'server' })
    ]);

    render(<PendingSubmissionsBanner />);
    fireEvent.click(await screen.findByRole('button', { name: /review/i }));
    await screen.findByText('PHQ-9');

    fireEvent.click(screen.getAllByRole('button', { name: /retry/i })[0]);
    await waitFor(() =>
      expect(retrySubmission).toHaveBeenCalledWith('a', {
        ownerKey: 'Patient/p1',
        isGuest: false
      })
    );

    fireEvent.click(screen.getAllByRole('button', { name: /discard/i })[0]);
    const confirm = await screen.findByRole('alertdialog');
    fireEvent.click(within(confirm).getByRole('button', { name: /discard/i }));

    await waitFor(() => expect(removeSubmission).toHaveBeenCalledWith('a'));
    expect(removeSubmission).not.toHaveBeenCalledWith('b');
  });
});
