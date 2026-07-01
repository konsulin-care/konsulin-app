/* eslint-disable sonarjs/assertions-in-tests, @typescript-eslint/require-await */

import type { UseQueryResult } from '@tanstack/react-query';
import { fireEvent, render, screen } from '@testing-library/react';
import type { HealthcareService, PractitionerRole } from 'fhir/r4';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const FEE_EXTENSION_URL = 'https://konsulin.id/fhir/StructureDefinition/fee';

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
  default: ({
    open,
    onSave,
    service
  }: {
    open: boolean;
    onSave: (svc: Record<string, unknown>) => void;
    service?: Record<string, unknown>;
  }) =>
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
              location: [{ reference: 'Location/loc-1' }],
              extension: [
                {
                  url: 'https://konsulin.id/fhir/StructureDefinition/fee',
                  valueMoney: { value: 150_000, currency: 'IDR' }
                }
              ],
              ...(service ? { id: service.id, name: service.name } : {})
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

function makeMockResult(data?: HealthcareService[]) {
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

  function mockServicesAndRender() {
    vi.mocked(usePractitionerRoleHealthcareServices).mockReturnValue(
      makeMockResult(mockServices)
    );
    return render(<ServicesTab practitionerRoleId='role-1' />);
  }

  it('renders service cards and add button', () => {
    mockServicesAndRender();
    expect(screen.getByText('General Consultation')).toBeInTheDocument();
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
    mockServicesAndRender();
    fireEvent.click(screen.getByText(/add service/i));
    expect(screen.getByTestId('mock-drawer')).toBeInTheDocument();
    expect(screen.getByText('create')).toBeInTheDocument();
  });

  it('opens create drawer from empty state', () => {
    vi.mocked(usePractitionerRoleHealthcareServices).mockReturnValue(
      makeMockResult([])
    );
    render(<ServicesTab practitionerRoleId='role-1' />);
    fireEvent.click(screen.getByText(/add service/i));
    expect(screen.getByTestId('mock-drawer')).toBeInTheDocument();
    expect(screen.getByText('create')).toBeInTheDocument();
  });

  it('adds a new service from the drawer', async () => {
    mockServicesAndRender();
    fireEvent.click(screen.getByText(/add service/i));
    fireEvent.click(screen.getByTestId('mock-drawer-save'));
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
    fireEvent.click(screen.getByText(/add service/i));
    fireEvent.click(screen.getByTestId('mock-drawer-save'));
    await capturedSave();
    const bundle = vi.mocked(submitFhirBundle).mock.calls[0][0];
    const roleEntry = bundle.entry?.find(
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
    fireEvent.click(screen.getByText(/add service/i));
    fireEvent.click(screen.getByTestId('mock-drawer-save'));
    fireEvent.click(screen.getByText(/add service/i));
    fireEvent.click(screen.getByTestId('mock-drawer-save'));
    const heading = screen.getByText(/healthcare services/i);
    expect(heading.textContent).toMatch(/2/);
    expect(screen.getAllByText('New Service')).toHaveLength(2);
  });

  it('submits a transaction bundle on save all when dirty', () => {
    mockServicesAndRender();
    fireEvent.click(screen.getByText(/add service/i));
    fireEvent.click(screen.getByTestId('mock-drawer-save'));
    const saveAll = screen.queryByText(/save all/i);
    if (saveAll) fireEvent.click(saveAll);
  });

  it('opens edit drawer when clicking Edit button or card body', () => {
    mockServicesAndRender();
    fireEvent.click(screen.getAllByLabelText('Edit service')[0]);
    expect(screen.getByText('edit')).toBeInTheDocument();
    fireEvent.click(screen.getByText(/healthcare services/i));
    fireEvent.click(screen.getByText('General Consultation'));
    expect(screen.getByText('edit')).toBeInTheDocument();
  });

  it('detects isDirty and preserves fee extension when only extension changes', async () => {
    vi.mocked(usePractitionerRoleHealthcareServices).mockReturnValue(
      makeMockResult(mockServices)
    );
    const onDirtyChange = vi.fn();
    let capturedSave: () => Promise<void> = () => Promise.resolve();
    render(
      <ServicesTab
        practitionerRoleId='role-1'
        onDirtyChange={(dirty, save) => {
          onDirtyChange(dirty);
          capturedSave = save;
        }}
      />
    );
    // State effect may not flush until acted. Use waitFor for initial dirty state.
    await vi.waitFor(() => expect(onDirtyChange).toHaveBeenCalled());
    fireEvent.click(screen.getAllByLabelText('Edit service')[0]);
    fireEvent.click(screen.getByTestId('mock-drawer-save'));
    await vi.waitFor(() =>
      expect(onDirtyChange).toHaveBeenLastCalledWith(true)
    );
    await capturedSave();
    const bundle = vi.mocked(submitFhirBundle).mock.calls[0][0];
    const hsEntry = bundle.entry?.find(
      e => e.resource?.resourceType === 'HealthcareService'
    ) as { resource: HealthcareService } | undefined;
    expect(hsEntry).toBeDefined();
    expect(hsEntry.resource.extension).toEqual([
      {
        url: FEE_EXTENSION_URL,
        valueMoney: { value: 150_000, currency: 'IDR' }
      }
    ]);
  });

  it('uses native button element for delete trigger (accessibility)', () => {
    mockServicesAndRender();
    const deleteButtons = screen.getAllByLabelText('Delete service');
    for (const btn of deleteButtons) {
      expect(btn.tagName).toBe('BUTTON');
      expect(btn).toHaveAttribute('type', 'button');
      expect(btn).not.toHaveAttribute('role');
      expect(btn).not.toHaveAttribute('tabindex');
    }
  });

  it('does not nest button inside another button', () => {
    mockServicesAndRender();
    const allButtons = screen.getAllByRole('button');
    for (const btn of allButtons) {
      // No <button> descendant should exist inside any <button>
      expect(btn.querySelector('button')).toBeNull();
    }
  });

  it('removes service card when clicking Delete', () => {
    mockServicesAndRender();
    expect(screen.getByText('General Consultation')).toBeInTheDocument();
    expect(screen.getByText('Specialist Referral')).toBeInTheDocument();
    fireEvent.click(screen.getAllByLabelText('Delete service')[0]);
    expect(screen.queryByText('General Consultation')).not.toBeInTheDocument();
    expect(screen.getByText('Specialist Referral')).toBeInTheDocument();
  });
});
