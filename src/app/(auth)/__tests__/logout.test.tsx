import type { PendingSubmission } from '@/lib/indexeddb';
import {
  listOwnedSubmissions,
  replayPendingSubmissions
} from '@/lib/submission-queue';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import Logout from '../logout/page';

const { routerPush, auth } = vi.hoisted(() => ({
  routerPush: vi.fn(),
  auth: {
    current: {
      isLoading: false,
      state: {
        isAuthenticated: true,
        userInfo: {
          userId: 'user-1',
          role_name: 'Patient',
          fhirId: 'p1'
        }
      },
      dispatch: vi.fn()
    }
  }
}));

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: routerPush })
}));

vi.mock('supertokens-auth-react/recipe/session', () => ({
  default: {
    signOut: vi.fn().mockResolvedValue(undefined)
  }
}));

vi.mock('@/lib/indexeddb', () => ({
  clearUserData: vi.fn().mockResolvedValue(undefined)
}));

vi.mock('@/lib/query-persistence/clear', () => ({
  clearQueryCache: vi.fn().mockResolvedValue(undefined)
}));

vi.mock('@/lib/submission-queue', () => ({
  listOwnedSubmissions: vi.fn().mockResolvedValue([]),
  replayPendingSubmissions: vi.fn().mockResolvedValue(undefined)
}));

vi.mock('@/utils/recommendation-interview', () => ({
  clearLastInterviewResult: vi.fn().mockResolvedValue(undefined)
}));

vi.mock('@/context/auth/authContext', () => ({
  useAuth: () => auth.current
}));

vi.mock('@/context/profile/profileContext', () => ({
  useProfile: () => ({ dispatch: vi.fn() })
}));

vi.mock('@/components/icons', () => ({
  LoadingSpinnerIcon: () => <div data-testid='loading-spinner'>Loading</div>
}));

vi.mock('@/i18n', () => ({
  useTranslations: () => (key: string) => {
    const translations: Record<string, string> = {
      'pwa.logout_pending_title': 'Unsent submissions',
      'pwa.logout_pending_description':
        'Some submissions from this session have not been sent yet.',
      'pwa.logout_keep': 'Keep',
      'pwa.logout_discard': 'Discard'
    };
    return translations[key] ?? key;
  }
}));

import { clearUserData } from '@/lib/indexeddb';
import { clearQueryCache } from '@/lib/query-persistence/clear';
import Session from 'supertokens-auth-react/recipe/session';

/** Builds a queued submission owned by the authenticated patient. */
function makeItem(): PendingSubmission {
  return {
    id: 'queued-1',
    ownerId: '',
    kind: 'questionnaire-response',
    payload: { author: { reference: 'Patient/p1' } },
    createdAt: 1,
    attempts: 0
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  auth.current = {
    isLoading: false,
    state: {
      isAuthenticated: true,
      userInfo: {
        userId: 'user-1',
        role_name: 'Patient',
        fhirId: 'p1'
      }
    },
    dispatch: vi.fn()
  };
  vi.mocked(replayPendingSubmissions).mockResolvedValue();
  vi.mocked(listOwnedSubmissions).mockResolvedValue([]);
  vi.mocked(Session.signOut).mockResolvedValue(undefined);
  vi.mocked(clearUserData).mockResolvedValue(undefined);
  vi.mocked(clearQueryCache).mockResolvedValue(undefined);
  globalThis.fetch = vi.fn(
    async () =>
      ({
        ok: true,
        json: async () => ({ token: 'csrf-1' })
      }) as Response
  ) as unknown as typeof fetch;
});

describe('Logout page', () => {
  it('replays pending submissions before Session.signOut', async () => {
    render(<Logout />);

    await waitFor(() => {
      expect(replayPendingSubmissions).toHaveBeenCalledWith({
        ownerKey: 'Patient/p1',
        isGuest: false
      });
    });
    await waitFor(() => {
      expect(Session.signOut).toHaveBeenCalled();
    });

    const replayOrder = vi.mocked(replayPendingSubmissions).mock
      .invocationCallOrder[0];
    const signOutOrder = vi.mocked(Session.signOut).mock.invocationCallOrder[0];
    expect(replayOrder).toBeLessThan(signOutOrder);
  });

  it('clears the auth cookie and navigates home when no items remain', async () => {
    render(<Logout />);

    await waitFor(() => {
      expect(clearUserData).toHaveBeenCalledWith('user-1');
    });
    await waitFor(() => {
      expect(routerPush).toHaveBeenCalledWith('/');
    });

    expect(clearUserData).toHaveBeenCalledTimes(1);
    expect(clearQueryCache).toHaveBeenCalledTimes(1);
    const clearUserDataOrder =
      vi.mocked(clearUserData).mock.invocationCallOrder[0];
    const clearQueryCacheOrder =
      vi.mocked(clearQueryCache).mock.invocationCallOrder[0];
    expect(clearUserDataOrder).toBeLessThan(clearQueryCacheOrder);
    expect(screen.getByTestId('loading-spinner')).toBeDefined();
  });

  it('keeps owned items when Keep is chosen', async () => {
    vi.mocked(listOwnedSubmissions).mockResolvedValue([makeItem()]);

    render(<Logout />);

    fireEvent.click(await screen.findByRole('button', { name: 'Keep' }));

    await waitFor(() => {
      expect(clearUserData).toHaveBeenCalledWith('user-1');
    });
    expect(vi.mocked(clearUserData).mock.calls[0]).toEqual(['user-1']);
    await waitFor(() => {
      expect(clearQueryCache).toHaveBeenCalledTimes(1);
    });
    const clearUserDataOrder =
      vi.mocked(clearUserData).mock.invocationCallOrder[0];
    const clearQueryCacheOrder =
      vi.mocked(clearQueryCache).mock.invocationCallOrder[0];
    expect(clearUserDataOrder).toBeLessThan(clearQueryCacheOrder);
    await waitFor(() => {
      expect(Session.signOut).toHaveBeenCalled();
    });
  });

  it('discards owned items with the queue owner key when Discard is chosen', async () => {
    vi.mocked(listOwnedSubmissions).mockResolvedValue([makeItem()]);

    render(<Logout />);

    fireEvent.click(await screen.findByRole('button', { name: 'Discard' }));

    await waitFor(() => {
      expect(clearUserData).toHaveBeenCalledWith('user-1', {
        queueOwnerKey: 'Patient/p1'
      });
    });
    await waitFor(() => {
      expect(Session.signOut).toHaveBeenCalled();
    });
  });
});
