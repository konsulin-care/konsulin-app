import { render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const {
  mockPush,
  mockPurge,
  mockClearReferral,
  mockClearUserData,
  mockSignOut,
  mockDispatch,
  mockDispatchProfile
} = vi.hoisted(() => ({
  mockPush: vi.fn(),
  mockPurge: vi.fn(),
  mockClearReferral: vi.fn(),
  mockClearUserData: vi.fn(),
  mockSignOut: vi.fn(),
  mockDispatch: vi.fn(),
  mockDispatchProfile: vi.fn()
}));

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockPush })
}));

vi.mock('@/services/api/privacy', () => ({
  purgeResearchData: mockPurge
}));

vi.mock('@/utils/referral', () => ({
  clearReferralLocalState: mockClearReferral
}));

vi.mock('@/lib/indexeddb', () => ({
  clearUserData: mockClearUserData
}));

vi.mock('supertokens-auth-react/recipe/session', () => ({
  default: { signOut: mockSignOut }
}));

vi.mock('@/context/auth/authContext', () => ({
  useAuth: () => ({
    state: { userInfo: { userId: 'u1' } },
    dispatch: mockDispatch
  })
}));

vi.mock('@/context/profile/profileContext', () => ({
  useProfile: () => ({ dispatch: mockDispatchProfile })
}));

vi.mock('@/components/icons', () => ({
  LoadingSpinnerIcon: () => <div data-testid='loading-spinner' />
}));

import RemoveAccount from '../remove-account/page';

const mockFetch = vi.fn();

describe('remove-account page', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSignOut.mockReturnValue(Promise.resolve());
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => ({ token: 'csrf-token' })
    });
    vi.stubGlobal('fetch', mockFetch);
    Object.defineProperty(window, 'location', {
      configurable: true,
      writable: true,
      value: { href: 'http://localhost/profile' }
    });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('shows a spinner while the purge is in flight', () => {
    mockPurge.mockReturnValue(
      new Promise(() => {
        /* never resolves: keeps the spinner in flight */
      })
    );
    render(<RemoveAccount />);
    expect(screen.getByTestId('loading-spinner')).toBeInTheDocument();
  });

  it('purges, clears local state, signs out, and redirects home on success', async () => {
    mockPurge.mockReturnValue(Promise.resolve());
    render(<RemoveAccount />);

    await waitFor(() => expect(mockPurge).toHaveBeenCalledTimes(1));
    expect(mockClearReferral).toHaveBeenCalledWith(window.localStorage);
    expect(mockClearUserData).toHaveBeenCalledWith('u1');
    expect(mockSignOut).toHaveBeenCalled();
    expect(mockFetch).toHaveBeenCalledWith('/auth/cookie/csrf-token');
    expect(mockFetch).toHaveBeenCalledWith(
      '/auth/cookie',
      expect.objectContaining({ method: 'DELETE' })
    );
    expect(mockDispatch).toHaveBeenCalledWith({ type: 'logout' });
    expect(mockDispatchProfile).toHaveBeenCalledWith({ type: 'reset' });
    await waitFor(() => expect(window.location.href).toBe('/'));
  });

  it('clears no local state and redirects to /profile on purge failure', async () => {
    mockPurge.mockRejectedValue(new Error('purge failed'));
    render(<RemoveAccount />);

    await waitFor(() => expect(mockPush).toHaveBeenCalledWith('/profile'));
    expect(mockClearReferral).not.toHaveBeenCalled();
    expect(mockClearUserData).not.toHaveBeenCalled();
    expect(mockSignOut).not.toHaveBeenCalled();
    expect(window.location.href).toBe('http://localhost/profile');
  });
});
