import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { useAuth } from '@/context/auth/authContext';
import DashboardPage from '../app/dashboard/page';

vi.mock('@/context/auth/authContext', () => ({
  useAuth: vi.fn()
}));

vi.mock('@/app/home-header', () => ({
  default: () => <div data-testid='mock-home-header'>HomeHeader</div>
}));

vi.mock('@/app/home-content', () => ({
  default: () => <div data-testid='mock-home-content'>HomeContent</div>
}));

/** Builds a useAuth return value with the given loading flag. */
function mockAuth(isLoading: boolean) {
  vi.mocked(useAuth).mockReturnValue({
    isLoading,
    state: {
      isAuthenticated: true,
      userInfo: { role_name: 'Patient', fhirId: 'patient-1' }
    },
    dispatch: vi.fn()
  } as unknown as ReturnType<typeof useAuth>);
}

describe('DashboardPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders a loading spinner while auth is loading', () => {
    mockAuth(true);

    const { container } = render(<DashboardPage />);

    expect(container.querySelector('svg')).not.toBeNull();
    expect(screen.queryByTestId('mock-home-header')).toBeNull();
    expect(screen.queryByTestId('mock-home-content')).toBeNull();
  });

  it('renders the home header and role home content once auth has loaded', () => {
    mockAuth(false);

    const { container } = render(<DashboardPage />);

    expect(screen.getByTestId('mock-home-header')).toBeDefined();
    expect(screen.getByTestId('mock-home-content')).toBeDefined();
    expect(container.querySelector('svg')).toBeNull();
  });
});
