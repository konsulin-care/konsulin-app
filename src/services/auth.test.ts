import { Roles } from '@/constants/roles';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mockGetClaimValue = vi.fn();
const mockGetProfileByIdentifier = vi.fn();

vi.mock('supertokens-auth-react/recipe/session', () => ({
  getClaimValue: () => mockGetClaimValue()
}));

vi.mock('@/services/profile', () => ({
  getProfileByIdentifier: (args: { userId: string; type: string }) =>
    mockGetProfileByIdentifier(args)
}));

import { restoreAuthCookie } from './auth';

function createFetchMock(
  handlers: Array<{
    match: (url: string, init?: RequestInit) => boolean;
    response: object;
    ok?: boolean;
  }>
) {
  globalThis.fetch = vi
    .fn()
    .mockImplementation((url: string, init?: RequestInit) => {
      const handler = handlers.find(h => h.match(url, init));
      if (handler) {
        return Promise.resolve({
          ok: handler.ok ?? true,
          json: () => Promise.resolve(handler.response)
        });
      }
      return Promise.resolve({ ok: false, json: () => Promise.resolve({}) });
    });
}

function defaultFetchMocks() {
  createFetchMock([
    {
      match: url => url === '/auth/cookie',
      response: { authenticated: false }
    },
    {
      match: url => url === '/auth/cookie/csrf-token',
      response: { token: 'csrf-123' }
    },
    {
      match: (url, init) => url === '/auth/cookie' && init?.method === 'POST',
      response: { ok: true }
    }
  ]);
}

const makeSession = (userId = 'user-1') =>
  ({
    doesSessionExist: true,
    userId
  }) as unknown as Parameters<typeof restoreAuthCookie>[0];

describe('restoreAuthCookie role resolution', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    defaultFetchMocks();
    mockGetProfileByIdentifier.mockResolvedValue(null);
  });

  it('returns false when session does not exist', async () => {
    const result = await restoreAuthCookie({
      doesSessionExist: false
    } as unknown as Parameters<typeof restoreAuthCookie>[0]);
    expect(result).toBe(false);
  });

  it('skips restore when auth cookie already exists with role', async () => {
    createFetchMock([
      {
        match: url => url === '/auth/cookie',
        response: { authenticated: true, role_name: 'Practitioner' }
      }
    ]);
    const result = await restoreAuthCookie(makeSession());
    expect(result).toBe(true);
    expect(mockGetProfileByIdentifier).not.toHaveBeenCalled();
  });

  it('restores role as ClinicAdmin when roles contain ClinicAdmin', async () => {
    mockGetClaimValue.mockResolvedValue([Roles.ClinicAdmin]);

    await restoreAuthCookie(makeSession('ca-1'));

    expect(mockGetProfileByIdentifier).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'Person' })
    );
  });

  it('restores role as Practitioner when roles contain both Practitioner and ClinicAdmin', async () => {
    mockGetClaimValue.mockResolvedValue([
      Roles.Practitioner,
      Roles.ClinicAdmin
    ]);

    await restoreAuthCookie(makeSession('pa-1'));

    expect(mockGetProfileByIdentifier).toHaveBeenCalledWith(
      expect.objectContaining({ type: Roles.Practitioner })
    );
  });

  it('falls back to Patient when roles array is empty', async () => {
    mockGetClaimValue.mockResolvedValue([]);

    await restoreAuthCookie(makeSession('pt-1'));

    expect(mockGetProfileByIdentifier).toHaveBeenCalledWith(
      expect.objectContaining({ type: Roles.Patient })
    );
  });

  it('falls back to Patient when roles array is undefined', async () => {
    mockGetClaimValue.mockResolvedValue(undefined);

    await restoreAuthCookie(makeSession('pt-2'));

    expect(mockGetProfileByIdentifier).toHaveBeenCalledWith(
      expect.objectContaining({ type: Roles.Patient })
    );
  });

  it('returns false when getClaimValue throws', async () => {
    mockGetClaimValue.mockRejectedValue(new Error('SuperTokens error'));

    const result = await restoreAuthCookie(makeSession());
    expect(result).toBe(false);
  });
});
