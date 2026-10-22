import { render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import Logout from '../logout/page';

const { routerPush } = vi.hoisted(() => ({ routerPush: vi.fn() }));

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

vi.mock('@/utils/recommendation-interview', () => ({
  clearLastInterviewResult: vi.fn().mockResolvedValue(undefined)
}));

vi.mock('@/context/auth/authContext', () => ({
  useAuth: () => ({
    state: { userInfo: { userId: 'user-1' } },
    dispatch: vi.fn()
  })
}));

vi.mock('@/context/profile/profileContext', () => ({
  useProfile: () => ({ dispatch: vi.fn() })
}));

vi.mock('@/components/icons', () => ({
  LoadingSpinnerIcon: () => <div data-testid='loading-spinner'>Loading</div>
}));

import Session from 'supertokens-auth-react/recipe/session';

beforeEach(() => {
  vi.clearAllMocks();
  globalThis.fetch = vi.fn(
    async () =>
      ({
        ok: true,
        json: async () => ({ token: 'csrf-1' })
      }) as Response
  ) as unknown as typeof fetch;
});

describe('Logout page', () => {
  it('clears the auth cookie and navigates home via the router', async () => {
    render(<Logout />);

    // THEN: session sign-out and cookie purge run
    await waitFor(() => {
      expect(Session.signOut).toHaveBeenCalled();
    });

    // AND: the router navigates to the home page (no location.href assignment)
    await waitFor(() => {
      expect(routerPush).toHaveBeenCalledWith('/');
    });

    expect(screen.getByTestId('loading-spinner')).toBeDefined();
  });
});
