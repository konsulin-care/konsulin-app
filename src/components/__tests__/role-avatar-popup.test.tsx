import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
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
      roleProfiles?: Record<string, { name: string; photoUrl: string } | null>;
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

import RoleAvatarPopup from '@/components/role-avatar-popup';

function createWrapper(queryClient: QueryClient) {
  return function Wrapper({ children }: { children: React.ReactNode }) {
    return (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );
  };
}

const multiRoleBase = {
  isLoading: false,
  state: {
    isAuthenticated: true,
    userInfo: {
      userId: 'user-1',
      role_name: 'Patient',
      roles: ['Patient', 'Practitioner'],
      fhirId: 'pt-1',
      fullname: 'John Doe',
      profile_picture: ''
    }
  }
} as MockAuthState;

describe('RoleAvatarPopup', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  it('renders a link to /profile for single-role users', () => {
    mockUseAuth.mockReturnValue({
      ...multiRoleBase,
      state: {
        ...multiRoleBase.state,
        userInfo: {
          ...multiRoleBase.state.userInfo,
          roles: ['Patient']
        }
      }
    });

    render(<RoleAvatarPopup displayName='John Doe' />, {
      wrapper: createWrapper(
        new QueryClient({ defaultOptions: { queries: { retry: false } } })
      )
    });

    const link = screen.getByRole('link', { name: /John Doe/i });
    expect(link).toHaveAttribute('href', '/profile');
  });

  it('shows other roles with photos from the auth state role profiles', async () => {
    mockUseAuth.mockReturnValue({
      ...multiRoleBase,
      state: {
        ...multiRoleBase.state,
        userInfo: {
          ...multiRoleBase.state.userInfo,
          roleProfiles: {
            Practitioner: {
              name: 'Jane Doe',
              photoUrl: 'https://cdn.example.com/jane.jpg'
            }
          }
        }
      }
    });

    render(<RoleAvatarPopup displayName='John Doe' />, {
      wrapper: createWrapper(
        new QueryClient({ defaultOptions: { queries: { retry: false } } })
      )
    });

    const trigger = screen.getByText('John Doe');
    fireEvent.pointerDown(trigger);
    fireEvent.click(trigger);

    const menu = await screen.findByRole('menu');
    expect(within(menu).getByText('Practitioner')).toBeInTheDocument();
    const imgs = within(menu).getAllByAltText('practitioner');
    expect(
      imgs.some(img => (img as HTMLImageElement).src.includes('jane.jpg'))
    ).toBe(true);
  });

  it('falls back to initials when a role has no profile entry', async () => {
    mockUseAuth.mockReturnValue({
      ...multiRoleBase,
      state: {
        ...multiRoleBase.state,
        userInfo: {
          ...multiRoleBase.state.userInfo,
          roleProfiles: { Practitioner: null }
        }
      }
    });

    render(<RoleAvatarPopup displayName='John Doe' />, {
      wrapper: createWrapper(
        new QueryClient({ defaultOptions: { queries: { retry: false } } })
      )
    });

    const trigger = screen.getByText('John Doe');
    fireEvent.pointerDown(trigger);
    fireEvent.click(trigger);

    const menu = await screen.findByRole('menu');
    expect(within(menu).getByText('Practitioner')).toBeInTheDocument();
    const imgs = within(menu).getAllByAltText('practitioner');
    expect(
      imgs.every(img => !(img as HTMLImageElement).src.includes('cdn'))
    ).toBe(true);
  });

  it('shows placeholder initials when role profiles are missing entirely', async () => {
    mockUseAuth.mockReturnValue(multiRoleBase);

    render(<RoleAvatarPopup displayName='John Doe' />, {
      wrapper: createWrapper(
        new QueryClient({ defaultOptions: { queries: { retry: false } } })
      )
    });

    const trigger = screen.getByText('John Doe');
    fireEvent.pointerDown(trigger);
    fireEvent.click(trigger);

    const menu = await screen.findByRole('menu');
    expect(within(menu).getByText('Practitioner')).toBeInTheDocument();
  });
});
