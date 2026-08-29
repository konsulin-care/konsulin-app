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

import RoleAvatarPopup from '@/components/role-avatar-popup';

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

    render(<RoleAvatarPopup displayName='John Doe' />);

    const link = screen.getByRole('link', { name: /John Doe/i });
    expect(link).toHaveAttribute('href', '/profile');
  });

  it('lists every other role as icon + label with no profile pictures', async () => {
    mockUseAuth.mockReturnValue(multiRoleBase);

    render(<RoleAvatarPopup displayName='John Doe' />);

    const trigger = screen.getByText('John Doe');
    fireEvent.pointerDown(trigger);
    fireEvent.click(trigger);

    const menu = await screen.findByRole('menu');
    expect(within(menu).getByText('Practitioner')).toBeInTheDocument();
    // No avatar photo is rendered for the switchable roles
    expect(within(menu).queryByRole('img')).toBeNull();
    expect(within(menu).queryByAltText('practitioner')).toBeNull();
  });

  it('lists other roles even when role profiles are missing entirely', async () => {
    mockUseAuth.mockReturnValue(multiRoleBase);

    render(<RoleAvatarPopup displayName='John Doe' />);

    const trigger = screen.getByText('John Doe');
    fireEvent.pointerDown(trigger);
    fireEvent.click(trigger);

    const menu = await screen.findByRole('menu');
    expect(within(menu).getByText('Practitioner')).toBeInTheDocument();
  });
});
