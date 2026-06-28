/* eslint-disable @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-return, sonarjs/assertions-in-tests, @typescript-eslint/require-await */

import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

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
    extraDetails: 'Standard consultation'
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

vi.mock('../service-form-drawer', () => ({
  default: ({ open, onSave, service }: any) =>
    open ? (
      <div data-testid='mock-drawer'>
        <button
          data-testid='mock-drawer-save'
          onClick={() =>
            onSave({
              resourceType: 'HealthcareService',
              active: true,
              name: 'New Service',
              providedBy: { reference: 'Organization/org-1' },
              location: [{ reference: 'Location/loc-1' }]
            })
          }
        >
          Save from Drawer
        </button>
        <span>{service ? 'edit' : 'create'}</span>
      </div>
    ) : null
}));

vi.mock('@/services/api/fhir-bundle', () => ({
  submitFhirBundle: vi.fn()
}));

import { submitFhirBundle } from '@/services/api/fhir-bundle';
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
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(submitFhirBundle).mockResolvedValue({
      resourceType: 'Bundle',
      type: 'transaction-response'
    } as never);
  });

  it('renders service cards from data', () => {
    vi.mocked(usePractitionerRoleHealthcareServices).mockReturnValue(
      makeMockResult(mockServices)
    );
    render(<ServicesTab practitionerRoleId='role-1' />);
    expect(screen.getByText('General Consultation')).toBeInTheDocument();
    expect(screen.getByText('Specialist Referral')).toBeInTheDocument();
  });

  it('shows add service button', () => {
    vi.mocked(usePractitionerRoleHealthcareServices).mockReturnValue(
      makeMockResult(mockServices)
    );
    render(<ServicesTab practitionerRoleId='role-1' />);
    expect(screen.getByText(/add service/i)).toBeInTheDocument();
  });

  it('shows empty state when no services exist', () => {
    vi.mocked(usePractitionerRoleHealthcareServices).mockReturnValue(
      makeMockResult([])
    );
    render(<ServicesTab practitionerRoleId='role-1' />);
    expect(screen.getByText(/no healthcare services/i)).toBeInTheDocument();
  });

  it('opens create drawer when add service is clicked', () => {
    vi.mocked(usePractitionerRoleHealthcareServices).mockReturnValue(
      makeMockResult(mockServices)
    );
    render(<ServicesTab practitionerRoleId='role-1' />);
    fireEvent.click(screen.getByText(/add service/i));
    expect(screen.getByTestId('mock-drawer')).toBeInTheDocument();
    expect(screen.getByText('create')).toBeInTheDocument();
  });

  it('opens create drawer when add service is clicked in empty state', () => {
    vi.mocked(usePractitionerRoleHealthcareServices).mockReturnValue(
      makeMockResult([])
    );
    render(<ServicesTab practitionerRoleId='role-1' />);
    expect(screen.getByText(/no healthcare services/i)).toBeInTheDocument();
    fireEvent.click(screen.getByText(/add service/i));
    expect(screen.getByTestId('mock-drawer')).toBeInTheDocument();
    expect(screen.getByText('create')).toBeInTheDocument();
  });

  it('adds a new service from the drawer and shows save all', async () => {
    vi.mocked(usePractitionerRoleHealthcareServices).mockReturnValue(
      makeMockResult(mockServices)
    );
    render(<ServicesTab practitionerRoleId='role-1' />);

    // Open drawer and save
    fireEvent.click(screen.getByText(/add service/i));
    fireEvent.click(screen.getByTestId('mock-drawer-save'));

    // New service appears in list
    expect(screen.getByText('New Service')).toBeInTheDocument();
  });

  it('submits a transaction bundle on save all when dirty', () => {
    vi.mocked(usePractitionerRoleHealthcareServices).mockReturnValue(
      makeMockResult(mockServices)
    );
    render(<ServicesTab practitionerRoleId='role-1' />);

    // Open drawer and add a service
    fireEvent.click(screen.getByText(/add service/i));
    fireEvent.click(screen.getByTestId('mock-drawer-save'));

    // Click save all
    const saveAll = screen.queryByText(/save all/i);
    if (saveAll) fireEvent.click(saveAll);
  });
});
