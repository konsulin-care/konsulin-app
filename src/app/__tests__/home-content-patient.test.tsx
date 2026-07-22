/* eslint-disable @typescript-eslint/no-unsafe-argument */

import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mockPush = vi.fn();

vi.mock('next/navigation', () => ({
  useRouter: vi.fn(() => ({ push: mockPush })),
  default: { useRouter: vi.fn() }
}));

vi.mock('@/context/auth/authContext', () => ({
  useAuth: vi.fn()
}));

vi.mock('@/hooks/usePatientRecords', () => ({
  usePatientRecords: vi.fn()
}));

vi.mock('@/components/general/home/recommendation-card-stack', () => ({
  default: () => <div data-testid='mock-recommendations'>Recommendations</div>
}));

vi.mock('@/components/general/action-card', () => ({
  default: () => <div data-testid='mock-action-card'>Action Card</div>
}));

vi.mock('@/components/shared/record-card', () => ({
  default: () => <div data-testid='mock-record-card'>Record Card</div>
}));

vi.mock('@/components/ui/skeleton', () => ({
  Skeleton: () => <div data-testid='mock-skeleton'>Skeleton</div>
}));

import { useAuth } from '@/context/auth/authContext';
import { usePatientRecords } from '@/hooks/usePatientRecords';
import HomeContentPatient from '../home-content-patient';

describe('HomeContentPatient - error state', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    vi.mocked(useAuth).mockReturnValue({
      state: {
        userInfo: { fhirId: 'patient-1' }
      },
      isLoading: false
    } as any);
  });

  it('shows error banner with retry when records fetch fails', () => {
    vi.mocked(usePatientRecords).mockReturnValue({
      records: [],
      isLoading: false,
      titlesLoading: false,
      fetchNextPage: vi.fn(),
      hasNextPage: false,
      isFetchingNextPage: false,
      error: new Error('Network error')
    } as any);

    render(<HomeContentPatient />);

    expect(screen.getByText('Failed to load records.')).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'Tap to retry' })
    ).toBeInTheDocument();
  });

  it('shows loading skeleton when auth is loading', () => {
    vi.mocked(useAuth).mockReturnValue({
      state: { userInfo: null },
      isLoading: true
    } as any);

    vi.mocked(usePatientRecords).mockReturnValue({
      records: [],
      isLoading: false,
      titlesLoading: false,
      error: null
    } as any);

    render(<HomeContentPatient />);
    expect(screen.getAllByTestId('mock-skeleton').length).toBeGreaterThan(0);
  });

  it('shows records list when fetch succeeds', () => {
    vi.mocked(usePatientRecords).mockReturnValue({
      records: [
        {
          id: 'rec-1',
          type: 'Condition',
          resourceType: 'Condition',
          title: 'Test',
          result: '',
          lastUpdated: '2025-01-01'
        }
      ],
      isLoading: false,
      titlesLoading: false,
      fetchNextPage: vi.fn(),
      hasNextPage: false,
      isFetchingNextPage: false,
      error: null
    } as any);

    render(<HomeContentPatient />);

    expect(screen.getByTestId('mock-record-card')).toBeInTheDocument();
    expect(screen.queryByText('Failed to load records.')).toBeNull();
  });
});
