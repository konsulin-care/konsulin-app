/* eslint-disable @typescript-eslint/unbound-method */
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import {
  fireEvent,
  render,
  screen,
  waitFor,
  within
} from '@testing-library/react';
import type { AxiosInstance } from 'axios';
import type { Bundle } from 'fhir/r4';
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

const { mockUseAuth, mockGetAPI } = vi.hoisted(() => ({
  mockUseAuth: vi.fn<() => MockAuthState>(),
  mockGetAPI: vi.fn<() => Promise<AxiosInstance>>()
}));

vi.mock('@/context/auth/authContext', () => ({
  useAuth: () => mockUseAuth()
}));

vi.mock('@/services/api', () => ({
  getAPI: mockGetAPI
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

const mockAxiosInstance = {
  get: vi.fn(),
  post: vi.fn(),
  put: vi.fn(),
  delete: vi.fn(),
  patch: vi.fn(),
  request: vi.fn(),
  defaults: {},
  interceptors: {
    request: { use: vi.fn(), eject: vi.fn(), clear: vi.fn() },
    response: { use: vi.fn(), eject: vi.fn(), clear: vi.fn() }
  },
  getUri: vi.fn()
} as unknown as AxiosInstance;

const practitionerWithPhoto: Bundle = {
  resourceType: 'Bundle',
  type: 'searchset',
  total: 1,
  entry: [
    {
      resource: {
        resourceType: 'Practitioner',
        id: 'prac-1',
        name: [{ use: 'official', given: ['Jane'], family: 'Doe' }],
        photo: [{ url: 'https://cdn.example.com/jane.jpg' }]
      }
    }
  ]
};

const emptySearchset: Bundle = {
  resourceType: 'Bundle',
  type: 'searchset',
  total: 0,
  entry: []
};

function createWrapper(queryClient: QueryClient) {
  return function Wrapper({ children }: { children: React.ReactNode }) {
    return (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );
  };
}

describe('RoleAvatarPopup', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetAPI.mockResolvedValue(mockAxiosInstance);
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  it('renders a link to /profile for single-role users without fetching profiles', () => {
    mockUseAuth.mockReturnValue({
      isLoading: false,
      state: {
        isAuthenticated: true,
        userInfo: {
          userId: 'user-1',
          role_name: 'Patient',
          roles: ['Patient'],
          fhirId: 'pt-1',
          fullname: 'John Doe'
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
    expect(mockAxiosInstance.get).not.toHaveBeenCalled();
  });

  it('shows other roles with FHIR photos once profiles load', async () => {
    mockUseAuth.mockReturnValue({
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
    });
    vi.mocked(mockAxiosInstance.get).mockResolvedValue({
      data: practitionerWithPhoto
    });

    render(<RoleAvatarPopup displayName='John Doe' />, {
      wrapper: createWrapper(
        new QueryClient({ defaultOptions: { queries: { retry: false } } })
      )
    });

    await waitFor(() => expect(mockAxiosInstance.get).toHaveBeenCalledTimes(2));

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

  it('falls back to initials when a role has no FHIR profile', async () => {
    mockUseAuth.mockReturnValue({
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
    });
    vi.mocked(mockAxiosInstance.get).mockResolvedValue({
      data: emptySearchset
    });

    render(<RoleAvatarPopup displayName='John Doe' />, {
      wrapper: createWrapper(
        new QueryClient({ defaultOptions: { queries: { retry: false } } })
      )
    });

    await waitFor(() => expect(mockAxiosInstance.get).toHaveBeenCalledTimes(2));

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

  it('serves cached profiles without refetching on remount', async () => {
    mockUseAuth.mockReturnValue({
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
    });
    vi.mocked(mockAxiosInstance.get).mockResolvedValue({
      data: practitionerWithPhoto
    });
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } }
    });

    const { unmount } = render(<RoleAvatarPopup displayName='John Doe' />, {
      wrapper: createWrapper(queryClient)
    });
    await waitFor(() => expect(mockAxiosInstance.get).toHaveBeenCalledTimes(2));

    unmount();
    render(<RoleAvatarPopup displayName='John Doe' />, {
      wrapper: createWrapper(queryClient)
    });
    await waitFor(() => expect(mockAxiosInstance.get).toHaveBeenCalledTimes(2));
  });
});
