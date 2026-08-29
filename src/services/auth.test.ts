/* eslint-disable @typescript-eslint/no-unsafe-return */
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

import {
  getAuthCookieSession,
  restoreAuthCookie,
  syncActiveRoleWithCookie
} from './auth';

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
      expect.objectContaining({ type: 'Practitioner' })
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
    // skipcq: JS-W1042 - mockResolvedValue from vitest requires an argument
    mockGetClaimValue.mockResolvedValue(undefined); // eslint-disable-line unicorn/no-useless-undefined

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

describe('getAuthCookieSession', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('parses active_role alongside the cookie role', async () => {
    createFetchMock([
      {
        match: url => url === '/auth/cookie',
        response: {
          authenticated: true,
          role_name: 'Patient',
          roles: ['Patient', 'Clinic Admin'],
          active_role: 'Clinic Admin'
        }
      }
    ]);
    const session = await getAuthCookieSession();
    expect(session?.active_role).toBe('Clinic Admin');
    expect(session?.role_name).toBe('Patient');
  });

  it('returns null when the cookie endpoint is not ok', async () => {
    createFetchMock([
      {
        match: url => url === '/auth/cookie',
        response: { error: 'boom' },
        ok: false
      }
    ]);
    const session = await getAuthCookieSession();
    expect(session).toBeNull();
  });
});

describe('syncActiveRoleWithCookie', () => {
  /** Mock /auth/cookie, /auth/cookie/csrf-token and /auth/role/switch. */
  function mockEndpoints(session: object, switchOk = true) {
    const fetchMock = vi.fn().mockImplementation((url: string) => {
      if (url === '/auth/cookie') {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve(session)
        });
      }
      if (url === '/auth/cookie/csrf-token') {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ token: 'csrf-1' })
        });
      }
      if (url === '/auth/role/switch') {
        return Promise.resolve({ ok: switchOk, status: switchOk ? 200 : 502 });
      }
      return Promise.resolve({ ok: false, json: () => Promise.resolve({}) });
    });
    globalThis.fetch = fetchMock;
    return fetchMock;
  }

  const switchCalls = (fetchMock: ReturnType<typeof vi.fn>) =>
    fetchMock.mock.calls.filter(([url]) => url === '/auth/role/switch');

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('POSTs the cookie role to /auth/role/switch when claim and cookie diverge', async () => {
    const fetchMock = mockEndpoints({
      authenticated: true,
      role_name: 'Patient',
      roles: ['Patient', 'Clinic Admin'],
      active_role: 'Clinic Admin'
    });

    const result = await syncActiveRoleWithCookie();
    expect(result).toBe(true);

    const calls = switchCalls(fetchMock);
    expect(calls).toHaveLength(1);
    const [, init] = calls[0] as [string, RequestInit];
    expect(init.method).toBe('POST');
    expect(init.headers).toMatchObject({ 'X-CSRF-Token': 'csrf-1' });
    const body = init.body as URLSearchParams;
    expect(body.get('role')).toBe('Patient');
  });

  it('does not POST when the claim matches the cookie role', async () => {
    const fetchMock = mockEndpoints({
      authenticated: true,
      role_name: 'Patient',
      roles: ['Patient'],
      active_role: 'Patient'
    });

    const result = await syncActiveRoleWithCookie();
    expect(result).toBe(false);
    expect(switchCalls(fetchMock)).toHaveLength(0);
  });

  it('does not POST when the claim is missing (legacy token)', async () => {
    const fetchMock = mockEndpoints({
      authenticated: true,
      role_name: 'Patient',
      roles: ['Patient']
    });

    const result = await syncActiveRoleWithCookie();
    expect(result).toBe(false);
    expect(switchCalls(fetchMock)).toHaveLength(0);
  });

  it('does not POST when the cookie role is not among the session roles', async () => {
    const fetchMock = mockEndpoints({
      authenticated: true,
      role_name: 'Practitioner',
      roles: ['Patient', 'Clinic Admin'],
      active_role: 'Clinic Admin'
    });

    const result = await syncActiveRoleWithCookie();
    expect(result).toBe(false);
    expect(switchCalls(fetchMock)).toHaveLength(0);
  });

  it('does not POST when the session is not authenticated', async () => {
    const fetchMock = mockEndpoints({ authenticated: false });

    const result = await syncActiveRoleWithCookie();
    expect(result).toBe(false);
    expect(switchCalls(fetchMock)).toHaveLength(0);
  });

  it('returns false when the switch request fails', async () => {
    const fetchMock = mockEndpoints(
      {
        authenticated: true,
        role_name: 'Patient',
        roles: ['Patient', 'Clinic Admin'],
        active_role: 'Clinic Admin'
      },
      false
    );

    const result = await syncActiveRoleWithCookie();
    expect(result).toBe(false);
    expect(switchCalls(fetchMock)).toHaveLength(1);
  });
});
