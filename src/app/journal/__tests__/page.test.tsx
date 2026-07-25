import { render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const mockReplace = vi.fn();

vi.mock('next/navigation', () => ({
  useRouter: () => ({ replace: mockReplace })
}));

const mockUseClaimValue = vi.fn();

vi.mock('supertokens-auth-react/recipe/session', () => ({
  default: {
    useClaimValue: () =>
      mockUseClaimValue() as {
        loading: boolean;
        value: string[] | undefined;
        doesSessionExist: boolean;
      }
  },
  useClaimValue: () =>
    mockUseClaimValue() as {
      loading: boolean;
      value: string[] | undefined;
      doesSessionExist: boolean;
    }
}));

vi.mock('supertokens-web-js/recipe/userroles', () => ({
  UserRoleClaim: {}
}));

vi.mock('@/components/icons', () => ({
  LoadingSpinnerIcon: ({
    width,
    height,
    className
  }: {
    readonly width: number;
    readonly height: number;
    readonly className?: string;
  }) => (
    <div
      data-testid='loading-spinner'
      data-width={width}
      data-height={height}
      className={className}
    />
  )
}));

vi.mock('@/components/journal/create', () => ({
  default: () => <div data-testid='create-journal' />
}));

vi.mock('@/components/page-header', () => ({
  default: () => <div data-testid='page-header' />
}));

import Journal from '../page';

describe('Journal page role guard', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    mockReplace.mockClear();
  });

  it('shows loading spinner while claim is loading', () => {
    mockUseClaimValue.mockReturnValue({ loading: true, value: undefined });

    render(<Journal />);

    expect(screen.getByTestId('loading-spinner')).toBeDefined();
    expect(screen.queryByTestId('create-journal')).toBeNull();
  });

  it('renders journal content for Patient role', () => {
    mockUseClaimValue.mockReturnValue({
      loading: false,
      value: ['Patient'],
      doesSessionExist: true
    });

    render(<Journal />);

    expect(screen.getByTestId('create-journal')).toBeDefined();
    expect(screen.getByTestId('page-header')).toBeDefined();
    expect(mockReplace).not.toHaveBeenCalled();
  });

  it('redirects to / for non-Patient roles', () => {
    mockUseClaimValue.mockReturnValue({
      loading: false,
      value: ['Practitioner'],
      doesSessionExist: true
    });

    render(<Journal />);

    expect(mockReplace).toHaveBeenCalledWith('/');
    expect(screen.queryByTestId('create-journal')).toBeNull();
  });

  it('redirects to / for ClinicAdmin role', () => {
    mockUseClaimValue.mockReturnValue({
      loading: false,
      value: ['Clinic Admin'],
      doesSessionExist: true
    });

    render(<Journal />);

    expect(mockReplace).toHaveBeenCalledWith('/');
  });

  it('redirects to / when no roles exist', () => {
    mockUseClaimValue.mockReturnValue({
      loading: false,
      value: undefined,
      doesSessionExist: true
    });

    render(<Journal />);

    expect(mockReplace).toHaveBeenCalledWith('/');
  });

  it('redirects to / for Guest (empty roles)', () => {
    mockUseClaimValue.mockReturnValue({
      loading: false,
      value: [],
      doesSessionExist: true
    });

    render(<Journal />);

    expect(mockReplace).toHaveBeenCalledWith('/');
  });
});
