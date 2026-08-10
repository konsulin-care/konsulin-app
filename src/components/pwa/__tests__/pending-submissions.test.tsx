import {
  listenForSyncReplay,
  pendingCount,
  replayPendingSubmissions
} from '@/lib/submission-queue';
import { registerSubmissionReplayHandlers } from '@/lib/submission-replay';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import PendingSubmissionsBanner from '../pending-submissions';

vi.mock('@/lib/submission-queue', () => ({
  pendingCount: vi.fn(),
  replayPendingSubmissions: vi.fn(),
  listenForSyncReplay: vi.fn(() => vi.fn())
}));

vi.mock('@/lib/submission-replay', () => ({
  registerSubmissionReplayHandlers: vi.fn()
}));

describe('PendingSubmissionsBanner', () => {
  beforeEach(() => {
    vi.mocked(pendingCount).mockResolvedValue(2);
    vi.mocked(replayPendingSubmissions).mockResolvedValue();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('shows the pending count and a sync button when submissions are queued', async () => {
    render(<PendingSubmissionsBanner />);

    expect(await screen.findByText(/2/)).toBeTruthy();
    expect(screen.getByRole('button', { name: /sync now/i })).toBeTruthy();
  });

  it('renders nothing when the queue is empty', async () => {
    vi.mocked(pendingCount).mockResolvedValue(0);

    const { container } = render(<PendingSubmissionsBanner />);

    await waitFor(() => expect(pendingCount).toHaveBeenCalled());
    expect(container.firstChild).toBeNull();
  });

  it('replays the queue when Sync now is clicked and refreshes the count', async () => {
    render(<PendingSubmissionsBanner />);
    await screen.findByText(/2/);

    vi.mocked(pendingCount).mockResolvedValue(0);
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
