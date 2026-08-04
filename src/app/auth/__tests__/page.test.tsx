import { render } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn() }),
  useSearchParams: () => new URLSearchParams(''),
  usePathname: () => '/auth'
}));

vi.mock('supertokens-auth-react/recipe/passwordless', () => ({
  default: { init: vi.fn(() => ({ recipeId: 'passwordless' })) },
  PasswordlessComponentsOverrideProvider: ({ children }: any) => (
    <div data-testid='override'>{children}</div>
  )
}));

vi.mock('supertokens-auth-react/recipe/passwordless/prebuiltui', () => ({
  PasswordlessPreBuiltUI: { recipeId: 'passwordless' }
}));

vi.mock('supertokens-auth-react/recipe/thirdparty/prebuiltui', () => ({
  ThirdPartyPreBuiltUI: { recipeId: 'thirdparty' }
}));

vi.mock('supertokens-auth-react/recipe/multifactorauth', () => ({
  default: { FactorIds: { OTP_EMAIL: 'otp-email', LINK_EMAIL: 'link-email' } }
}));

vi.mock('supertokens-auth-react/ui', () => ({
  AuthPage: () => <div data-testid='auth-page'>Auth Page</div>,
  canHandleRoute: vi.fn(() => true),
  getRoutingComponent: vi.fn(() => <div>Routing Component</div>)
}));

vi.mock('@/utils/redirect-intent', () => ({
  saveIntent: vi.fn(),
  getIntent: vi.fn()
}));

import { getIntent, saveIntent } from '@/utils/redirect-intent';

describe('auth page', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    window.history.replaceState({}, '', '/auth');
  });

  it('renders without crashing', async () => {
    const mod = await import('../page');
    const { container } = render(<mod.default />);
    expect(container.firstChild).toBeDefined();
  });

  it('renders supertokens-root wrapper', async () => {
    const mod = await import('../page');
    const { container } = render(<mod.default />);
    const root = container.querySelector('#supertokens-root');
    expect(root).toBeDefined();
  });

  it('preserves an existing assessmentResult intent when /record redirect is requested', async () => {
    window.history.replaceState({}, '', '/auth?redirectToPath=/record');
    vi.mocked(getIntent).mockReturnValue({
      kind: 'assessmentResult',
      payload: { path: '/record', qrId: 'qr-123' },
      createdAt: Date.now()
    });

    const mod = await import('../page');
    render(<mod.default />);

    expect(saveIntent).not.toHaveBeenCalled();
  });

  it('saves a new assessmentResult intent when none exists', async () => {
    window.history.replaceState({}, '', '/auth?redirectToPath=/record');
    vi.mocked(getIntent).mockReturnValue(null);

    const mod = await import('../page');
    render(<mod.default />);

    expect(saveIntent).toHaveBeenCalledWith('assessmentResult', {
      path: '/record'
    });
  });

  it('does not overwrite an existing journal intent', async () => {
    window.history.replaceState({}, '', '/auth?redirectToPath=/journal/new');
    vi.mocked(getIntent).mockReturnValue({
      kind: 'journal',
      payload: { path: '/journal/new' },
      createdAt: Date.now()
    });

    const mod = await import('../page');
    render(<mod.default />);

    expect(saveIntent).not.toHaveBeenCalled();
  });

  it('saves a new journal intent when none exists', async () => {
    window.history.replaceState({}, '', '/auth?redirectToPath=/journal/new');
    vi.mocked(getIntent).mockReturnValue(null);

    const mod = await import('../page');
    render(<mod.default />);

    expect(saveIntent).toHaveBeenCalledWith('journal', {
      path: '/journal/new'
    });
  });
});
