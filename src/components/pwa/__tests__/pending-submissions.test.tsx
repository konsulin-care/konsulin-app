import { useAuth } from '@/context/auth/authContext';
import type { PendingSubmission } from '@/lib/indexeddb';
import { ownerOf } from '@/lib/submission-owner';
import {
  listOwnedSubmissions,
  listenForSyncReplay,
  replayPendingSubmissions
} from '@/lib/submission-queue';
import { registerSubmissionReplayHandlers } from '@/lib/submission-replay';
import {
  fireEvent,
  render,
  renderHook,
  screen,
  waitFor
} from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import PendingSubmissionsBanner, {
  usePendingSubmissions
} from '../pending-submissions';

vi.mock('@/lib/submission-queue', () => ({
  listOwnedSubmissions: vi.fn(),
  replayPendingSubmissions: vi.fn(),
  listenForSyncReplay: vi.fn(() => vi.fn())
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
            'pwa.sync_now': 'Sync now'
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
