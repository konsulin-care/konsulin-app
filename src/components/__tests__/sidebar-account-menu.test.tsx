import { fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

type MockAuthState = {
  isLoading: boolean;
  state: {
    isAuthenticated: boolean;
    userInfo: {
      userId?: string;
      role_name?: string;
      roles?: string[];
      fhirId?: string;
      fullname?: string;
      profile_picture?: string;
      email?: string;
    };
  };
};

const { mockUseAuth } = vi.hoisted(() => ({
  mockUseAuth: vi.fn<() => MockAuthState>()
}));

vi.mock('@/context/auth/authContext', () => ({
  useAuth: () => mockUseAuth()
}));

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn() })
}));

vi.mock('next/image', () => ({
  default: ({ src, alt, ...props }: Record<string, unknown>) => {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img src={src as string} alt={alt as string} {...props} />
    );
  }
}));

vi.mock('@/i18n', async () => {
  const { createUseTranslationsMock } =
    await import('@/i18n/__tests__/test-messages');
  return { useTranslations: createUseTranslationsMock() };
});

import SidebarAccountMenu from '@/components/sidebar-account-menu';

const authenticatedBase: MockAuthState = {
  isLoading: false,
  state: {
    isAuthenticated: true,
    userInfo: {
      userId: 'user-1',
      role_name: 'Patient',
      roles: ['Patient'],
      fhirId: 'pt-1',
      fullname: 'John Doe',
      profile_picture: ''
    }
  }
};

/** Opens the account dropdown via its trigger. */
async function openAccountMenu(): Promise<HTMLElement> {
  const trigger = screen.getByRole('button', { name: 'Account menu' });
  fireEvent.pointerDown(trigger);
  fireEvent.click(trigger);
  return screen.findByRole('menu');
}

describe('SidebarAccountMenu', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  it('shows the display name and links to profile and logout', async () => {
    mockUseAuth.mockReturnValue(authenticatedBase);

    render(<SidebarAccountMenu />);

    expect(screen.getByText('John Doe')).toBeInTheDocument();

    const menu = await openAccountMenu();
    expect(within(menu).getByRole('link', { name: 'Profile' })).toHaveAttribute(
      'href',
      '/profile'
    );
    expect(within(menu).getByRole('link', { name: 'Log out' })).toHaveAttribute(
      'href',
      '/logout'
    );
  });

  it('left-aligns the name and role wrapper', () => {
    mockUseAuth.mockReturnValue(authenticatedBase);

    render(<SidebarAccountMenu />);

    const nameWrapper = screen.getByText('John Doe').parentElement;
    expect(nameWrapper).toHaveClass(
      'hidden',
      'min-w-0',
      'flex-1',
      'text-left',
      'lg:block'
    );
  });

  it('lists each other role as a switch item', async () => {
    mockUseAuth.mockReturnValue({
      ...authenticatedBase,
      state: {
        ...authenticatedBase.state,
        userInfo: {
          ...authenticatedBase.state.userInfo,
          roles: ['Patient', 'Practitioner', 'Researcher']
        }
      }
    });

    render(<SidebarAccountMenu />);

    const menu = await openAccountMenu();
    expect(within(menu).getByText('Practitioner')).toBeInTheDocument();
    expect(within(menu).getByText('Researcher')).toBeInTheDocument();
    // The active role is not offered as a switch target
    expect(within(menu).queryByText('Patient')).toBeNull();
  });

  it('renders a sign in link and no trigger when unauthenticated', () => {
    mockUseAuth.mockReturnValue({
      isLoading: false,
      state: { isAuthenticated: false, userInfo: {} }
    });

    render(<SidebarAccountMenu />);

    expect(screen.getByRole('link', { name: 'Sign in' })).toHaveAttribute(
      'href',
      '/auth'
    );
    expect(
      screen.queryByRole('button', { name: 'Account menu' })
    ).not.toBeInTheDocument();
  });
});
