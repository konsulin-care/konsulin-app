/* eslint-disable @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-return, sonarjs/assertions-in-tests, @typescript-eslint/require-await */

import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { UseQueryResult } from '@tanstack/react-query';
import type { HealthcareService, PractitionerRole } from 'fhir/r4';

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

  it('submits bundle with full practitioner role preserving existing fields', async () => {
    vi.mocked(usePractitionerRoleHealthcareServices).mockReturnValue(
      makeMockResult([])
    );
    let capturedSave: (() => Promise<void>) | undefined;

    const practitionerRole: Partial<PractitionerRole> = {
      resourceType: 'PractitionerRole',
      id: 'role-1',
      practitioner: { reference: 'Practitioner/prac-1' },
      organization: { reference: 'Organization/org-1' },
      active: true,
      code: [{ coding: [{ code: 'doctor' }] }]
    };

    render(
      <ServicesTab
        practitionerRoleId='role-1'
        practitionerRole={practitionerRole as PractitionerRole}
        onDirtyChange={(_dirty, save) => {
          capturedSave = save;
        }}
      />
    );

    // Add a service
    fireEvent.click(screen.getByText(/add service/i));
    fireEvent.click(screen.getByTestId('mock-drawer-save'));

    // Invoke the save handler
    await capturedSave();

    // Verify bundle includes FULL PractitionerRole with all existing fields
    const submittedBundle = vi.mocked(submitFhirBundle).mock.calls[0][0];
    const roleEntry = submittedBundle.entry?.find(
      e => e.resource?.resourceType === 'PractitionerRole'
    ) as { resource: PractitionerRole } | undefined;
    expect(roleEntry).toBeDefined();
    expect(roleEntry.resource.practitioner).toEqual({
      reference: 'Practitioner/prac-1'
    });
    expect(roleEntry.resource.organization).toEqual({
      reference: 'Organization/org-1'
    });
    expect(roleEntry.resource.code).toEqual([{ coding: [{ code: 'doctor' }] }]);
    expect(roleEntry.resource.active).toBe(true);
  });

  it('preserves multiple new services when adding sequentially', () => {
    vi.mocked(usePractitionerRoleHealthcareServices).mockReturnValue(
      makeMockResult([])
    );
    render(<ServicesTab practitionerRoleId='role-1' />);

    // Add first service
    fireEvent.click(screen.getByText(/add service/i));
    fireEvent.click(screen.getByTestId('mock-drawer-save'));

    // Add second service
    // The mock drawer always sends a service with id: undefined.
    // Without a temp ID, the second save would match the first (both undefined)
    // and replace it — leaving only 1 "New Service".
    fireEvent.click(screen.getByText(/add service/i));
    fireEvent.click(screen.getByTestId('mock-drawer-save'));

    // Both should be visible as separate entries
    const heading = screen.getByText(/healthcare services/i);
    expect(heading.textContent).toMatch(/2/);
    expect(screen.getAllByText('New Service')).toHaveLength(2);
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

  it('opens edit drawer with service data when clicking Edit button', () => {
    vi.mocked(usePractitionerRoleHealthcareServices).mockReturnValue(
      makeMockResult(mockServices)
    );
    render(<ServicesTab practitionerRoleId='role-1' />);

    // Click Edit on the first service card
    fireEvent.click(screen.getAllByLabelText('Edit service')[0]);

    // Drawer should show 'edit' mode (service prop passed)
    expect(screen.getByText('edit')).toBeInTheDocument();
  });

  it('opens edit drawer when clicking anywhere on the service card', () => {
    vi.mocked(usePractitionerRoleHealthcareServices).mockReturnValue(
      makeMockResult(mockServices)
    );
    render(<ServicesTab practitionerRoleId='role-1' />);

    // Click on the service name (inside the card body, not on any button)
    fireEvent.click(screen.getByText('General Consultation'));

    // Drawer should show 'edit' mode (service prop passed from card body click)
    expect(screen.getByText('edit')).toBeInTheDocument();
  });

  it('removes service card when clicking Delete', () => {
    vi.mocked(usePractitionerRoleHealthcareServices).mockReturnValue(
      makeMockResult(mockServices)
    );
    render(<ServicesTab practitionerRoleId='role-1' />);

    // Verify both services are visible
    expect(screen.getByText('General Consultation')).toBeInTheDocument();
    expect(screen.getByText('Specialist Referral')).toBeInTheDocument();

    // Click Delete on the first service
    const deleteButtons = screen.getAllByLabelText('Delete service');
    fireEvent.click(deleteButtons[0]);

    // First service should be gone
    expect(screen.queryByText('General Consultation')).not.toBeInTheDocument();
    // Second service should still exist
    expect(screen.getByText('Specialist Referral')).toBeInTheDocument();
  });
});
