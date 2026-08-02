import { RuntimeConfigContext } from '@/components/general/runtime-config-provider';
import { render, screen } from '@testing-library/react';
import React, { StrictMode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('supertokens-auth-react', () => ({
  default: { init: vi.fn() },
  SuperTokensWrapper: ({ children }: { children: React.ReactNode }) => (
    <div data-testid='super-tokens-wrapper'>{children}</div>
  )
}));

vi.mock('@/config/frontendConfig', () => ({
  frontendConfig: vi.fn(() => ({ recipeList: [] })),
  setRouter: vi.fn()
}));

vi.mock('next/navigation', () => ({
  useRouter: vi.fn(() => ({ push: vi.fn(), replace: vi.fn() })),
  usePathname: vi.fn(() => '/')
}));

import SuperTokensReact from 'supertokens-auth-react';
import { SuperTokensProviders } from '../supertokensProvider';

const mockRuntimeConfig = {
  appInfo: {
    appName: 'Test',
    websiteDomain: 'http://localhost:3000',
    apiDomain: 'http://localhost:3200',
    apiBasePath: '/api/v1',
    websiteBasePath: '/auth'
  },
  terminologyServer: ''
};

function renderWithRuntime(value: typeof mockRuntimeConfig | null) {
  return render(
    <RuntimeConfigContext.Provider value={value}>
      <SuperTokensProviders>
        <div data-testid='child-content'>Hello</div>
      </SuperTokensProviders>
    </RuntimeConfigContext.Provider>
  );
}

describe('SuperTokensProviders', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders children after SuperTokens init completes', async () => {
    renderWithRuntime(mockRuntimeConfig);

    // After effect runs, children should be rendered inside SuperTokensWrapper
    const wrapper = await screen.findByTestId('super-tokens-wrapper');
    expect(wrapper).toBeDefined();
    expect(screen.getByTestId('child-content')).toBeDefined();
  });

  it('calls SuperTokensReact.init once', async () => {
    renderWithRuntime(mockRuntimeConfig);

    await screen.findByTestId('super-tokens-wrapper');
    expect(SuperTokensReact.init).toHaveBeenCalledTimes(1);
  });

  it('returns null when runtimeConfig is null', () => {
    const { container } = renderWithRuntime(null);
    expect(container.innerHTML).toBe('');
  });

  it('works correctly under StrictMode double-mounting', () => {
    // StrictMode renders components twice in dev to detect side effects.
    // useRef-based initDone would stay false because ref changes don't
    // trigger re-render — this test verifies useState-based initDone works.
    render(
      <StrictMode>
        <RuntimeConfigContext.Provider value={mockRuntimeConfig}>
          <SuperTokensProviders>
            <div data-testid='strict-child'>Hello</div>
          </SuperTokensProviders>
        </RuntimeConfigContext.Provider>
      </StrictMode>
    );

    // Children should render inside SuperTokensWrapper after both mounts
    expect(screen.getByTestId('super-tokens-wrapper')).toBeDefined();
    expect(screen.getByTestId('strict-child')).toBeDefined();

    // init should only be called once (second call is a no-op)
    expect(SuperTokensReact.init).toHaveBeenCalledTimes(1);
  });
});
