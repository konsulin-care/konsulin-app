import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('supertokens-auth-react/recipe/passwordless', () => ({
  default: {
    init: vi.fn()
  }
}));

vi.mock('supertokens-auth-react/recipe/thirdparty', () => ({
  default: {
    init: vi.fn()
  }
}));

vi.mock('supertokens-auth-react/recipe/session', () => ({
  default: {
    init: vi.fn(() => ({ recipeId: 'session' }))
  }
}));

vi.mock('supertokens-web-js/recipe/session', () => ({
  getClaimValue: vi.fn()
}));

vi.mock('supertokens-web-js/recipe/userroles', () => ({
  UserRoleClaim: 'user-role'
}));

vi.mock('@/lib/indexeddb', () => ({
  STORES: { uiPreferences: 'uiPreferences' },
  dbSet: vi.fn()
}));

vi.mock('../appInfo', () => ({
  getAppInfo: vi.fn(() => ({
    appName: 'Konsulin',
    apiDomain: 'http://localhost:3000',
    websiteDomain: 'http://localhost:3000',
    apiBasePath: '/api/v1/auth',
    websiteBasePath: '/auth'
  }))
}));

vi.mock('../auth-helpers', () => ({
  handleNewUserLogin: vi.fn(),
  handleReturningUserLogin: vi.fn(),
  resolvePostLoginRedirect: vi.fn(() => '/')
}));

import Passwordless from 'supertokens-auth-react/recipe/passwordless';
import ThirdParty from 'supertokens-auth-react/recipe/thirdparty';
import type { Mock } from 'vitest';
import { frontendConfig } from '../frontendConfig';

type PasswordlessInitArg = Record<string, unknown>;
type ThirdPartyInitArg = {
  signInAndUpFeature?: { providers?: Array<Record<string, unknown>> };
};

describe('frontendConfig', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns a valid SuperTokens config object', () => {
    const config = frontendConfig();
    expect(config).toBeDefined();
    expect(config.appInfo).toBeDefined();
    expect(config.recipeList).toBeDefined();
    expect(Array.isArray(config.recipeList)).toBe(true);
  });

  it('configures Passwordless with EMAIL contact method', () => {
    frontendConfig();
    const initMock = Passwordless.init as Mock;
    expect(initMock).toHaveBeenCalledTimes(1);
    const callArgs = initMock.mock.calls[0]?.[0] as PasswordlessInitArg;
    expect(callArgs?.contactMethod).toBe('EMAIL');
  });

  it('configures ThirdParty with WhatsApp provider only', () => {
    frontendConfig();
    const initMock = ThirdParty.init as Mock;
    expect(initMock).toHaveBeenCalledTimes(1);
    const callArgs = initMock.mock.calls[0]?.[0] as ThirdPartyInitArg;
    const providers = callArgs?.signInAndUpFeature?.providers ?? [];
    expect(providers).toHaveLength(1);
    expect(providers[0]?.id).toBe('whatsapp');
    expect(providers[0]?.name).toBe('WhatsApp');
  });

  it('includes onHandleEvent in Passwordless config', () => {
    frontendConfig();
    const initMock = Passwordless.init as Mock;
    const callArgs = initMock.mock.calls[0]?.[0] as PasswordlessInitArg;
    expect(typeof callArgs?.onHandleEvent).toBe('function');
  });
});
