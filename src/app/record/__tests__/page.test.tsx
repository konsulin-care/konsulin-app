import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('next/navigation', () => ({
  useSearchParams: vi.fn()
}));

vi.mock('@/context/auth/authContext', () => ({
  useAuth: vi.fn()
}));

vi.mock('@/app/record/record-detail', () => ({
  default: (props: { backRoute?: string }) => (
    <div
      data-testid='mock-record-detail'
      data-back-route={props.backRoute ?? ''}
    >
      Detail
    </div>
  )
}));

vi.mock('@/app/record/record-timeline', () => ({
  default: () => <div data-testid='mock-record-timeline'>Timeline</div>
}));

vi.mock('@/app/not-found', () => ({
  default: () => <div data-testid='mock-notfound'>Not Found</div>
}));

import { useAuth } from '@/context/auth/authContext';
import type { ReadonlyURLSearchParams } from 'next/navigation';
import { useSearchParams } from 'next/navigation';
import RecordPage from '../page';

describe('RecordPage - routing', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it.each([
    {
      name: 'patient timeline when role is Patient',
      params: '',
      auth: { role_name: 'Patient', fhirId: 'pat-1' } as const,
      expected: 'mock-record-timeline'
    },
    {
      name: 'practitioner timeline when id param is present',
      params: 'id=pat-2',
      auth: { role_name: 'Practitioner', fhirId: 'dr-1' } as const,
      expected: 'mock-record-timeline'
    },
    {
      name: 'detail view when id and view params are present',
      params: 'id=pat-1&view=Observation/obs-1',
      auth: { role_name: 'Practitioner', fhirId: 'dr-1' } as const,
      expected: 'mock-record-detail'
    },
    {
      name: 'patient own detail view',
      params: 'view=Observation/obs-1',
      auth: { role_name: 'Patient', fhirId: 'pat-1' } as const,
      expected: 'mock-record-detail'
    }
  ])('shows $name', ({ params, auth, expected }) => {
    vi.mocked(useSearchParams).mockReturnValue(
      new URLSearchParams(params) as unknown as ReadonlyURLSearchParams
    );
    vi.mocked(useAuth).mockReturnValue({
      state: {
        isAuthenticated: true,
        userInfo: auth
      },
      isLoading: false,
      dispatch: vi.fn()
    });

    render(<RecordPage />);
    expect(screen.getByTestId(expected)).toBeInTheDocument();
  });

  it('passes backRoute=/record for patient self-view (no id param)', () => {
    vi.mocked(useSearchParams).mockReturnValue(
      new URLSearchParams(
        'view=Observation/obs-1'
      ) as unknown as ReadonlyURLSearchParams
    );
    const mockDispatch = vi.fn() as unknown as React.Dispatch<unknown>;
    vi.mocked(useAuth).mockReturnValue({
      state: {
        isAuthenticated: true,
        userInfo: { role_name: 'Patient', fhirId: 'pat-1' }
      },
      isLoading: false,
      dispatch: mockDispatch
    });

    render(<RecordPage />);
    const detail = screen.getByTestId('mock-record-detail');
    expect(detail.dataset.backRoute).toBe('/record');
  });

  it('passes backRoute=/record?id=pat-1 for practitioner view (with id param)', () => {
    vi.mocked(useSearchParams).mockReturnValue(
      new URLSearchParams(
        'id=pat-1&view=Observation/obs-1'
      ) as unknown as ReadonlyURLSearchParams
    );
    const mockDispatch = vi.fn() as unknown as React.Dispatch<unknown>;
    vi.mocked(useAuth).mockReturnValue({
      state: {
        isAuthenticated: true,
        userInfo: { role_name: 'Practitioner', fhirId: 'dr-1' }
      },
      isLoading: false,
      dispatch: mockDispatch
    });

    render(<RecordPage />);
    const detail = screen.getByTestId('mock-record-detail');
    expect(detail.dataset.backRoute).toBe('/record?id=pat-1');
  });

  it('shows NotFound when no patient context is available', () => {
    vi.mocked(useSearchParams).mockReturnValue(
      new URLSearchParams('') as unknown as ReadonlyURLSearchParams
    );
    vi.mocked(useAuth).mockReturnValue({
      state: {
        isAuthenticated: true,
        userInfo: { role_name: 'Practitioner', fhirId: 'dr-1' }
      },
      isLoading: false,
      dispatch: vi.fn()
    });

    render(<RecordPage />);
    expect(screen.getByTestId('mock-notfound')).toBeInTheDocument();
  });

  it('shows NotFound when id param is missing and user is not a Patient', () => {
    vi.mocked(useSearchParams).mockReturnValue(
      new URLSearchParams('') as unknown as ReadonlyURLSearchParams
    );
    vi.mocked(useAuth).mockReturnValue({
      state: {
        isAuthenticated: false,
        userInfo: { role_name: 'Guest', fhirId: null }
      },
      isLoading: false,
      dispatch: vi.fn()
    });

    render(<RecordPage />);
    expect(screen.getByTestId('mock-notfound')).toBeInTheDocument();
  });
});
