import { render } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

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
  saveIntent: vi.fn()
}));

describe('auth page', () => {
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
});
