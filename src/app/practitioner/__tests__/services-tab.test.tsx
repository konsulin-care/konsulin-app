import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import type { UseQueryResult } from '@tanstack/react-query';
import type { HealthcareService } from 'fhir/r4';

const mockServices: HealthcareService[] = [
  {
    resourceType: 'HealthcareService',
    id: 'svc-1',
    active: true,
    name: 'General Consultation',
    providedBy: { reference: 'Organization/org-1' },
    location: [{ reference: 'Location/loc-1' }],
    extraDetails: 'Standard consultation for general health issues'
  },
  {
    resourceType: 'HealthcareService',
    id: 'svc-2',
    active: false,
    name: 'Specialist Referral',
    providedBy: { reference: 'Organization/org-1' },
    extraDetails: 'Requires prior diagnosis'
  }
];

vi.mock('@/services/clinic', () => ({
  usePractitionerRoleHealthcareServices: vi.fn()
}));

import { usePractitionerRoleHealthcareServices } from '@/services/clinic';
import ServicesTab from '../services-tab';

function makeMockResult(
  data?: HealthcareService[]
): UseQueryResult<HealthcareService[]> {
  return {
    data,
    isLoading: false,
    isError: false,
    isFetching: false,
    error: null,
    dataUpdatedAt: 0,
    errorUpdatedAt: 0,
    failureCount: 0,
    failureReason: null,
    errorUpdateCount: 0,
    isFetched: true,
    isFetchedAfterMount: true,
    isPaused: false,
    isPending: false,
    isPlaceholderData: false,
    isRefetchError: false,
    isStale: false,
    isSuccess: true,
    refetch: vi.fn(),
    status: 'success',
    promise: Promise.resolve(data ?? []),
    fetchStatus: 'idle'
  } as unknown as UseQueryResult<HealthcareService[]>;
}

describe('ServicesTab', () => {
  it('renders service cards from data', () => {
    vi.mocked(usePractitionerRoleHealthcareServices).mockReturnValue(
      makeMockResult(mockServices)
    );

    render(<ServicesTab practitionerRoleId='role-1' />);

    expect(screen.getByText('General Consultation')).toBeInTheDocument();
    expect(screen.getByText('Specialist Referral')).toBeInTheDocument();
  });

  it('renders extra details when present', () => {
    vi.mocked(usePractitionerRoleHealthcareServices).mockReturnValue(
      makeMockResult(mockServices)
    );

    render(<ServicesTab practitionerRoleId='role-1' />);

    expect(
      screen.getByText(/standard consultation for general/i)
    ).toBeInTheDocument();
  });

  it('shows empty state when no services exist', () => {
    vi.mocked(usePractitionerRoleHealthcareServices).mockReturnValue(
      makeMockResult([])
    );

    render(<ServicesTab practitionerRoleId='role-1' />);

    expect(screen.getByText(/no healthcare services/i)).toBeInTheDocument();
  });

  it('renders without crashing with empty string roleId', () => {
    vi.mocked(usePractitionerRoleHealthcareServices).mockReturnValue(
      makeMockResult()
    );

    const { container } = render(<ServicesTab practitionerRoleId='' />);
    expect(container.innerHTML).toBeTruthy();
  });
});
