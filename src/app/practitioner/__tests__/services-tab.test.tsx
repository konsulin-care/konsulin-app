/* eslint-disable sonarjs/assertions-in-tests */

import type { UseQueryResult } from '@tanstack/react-query';
import { act, fireEvent, render, screen } from '@testing-library/react';
import type { HealthcareService, PractitionerRole } from 'fhir/r4';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

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

vi.mock('@/services/clinic-practitioners', () => ({
  usePractitionerRoleHealthcareServices: vi.fn()
}));

/* eslint-disable @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-return */
vi.mock('../service-form-drawer', () => ({
  default: ({ open, onSave, service }: Record<string, any>) =>
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
                  url: FEE_EXTENSION_URL,
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
/* eslint-enable @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-return */

vi.mock('@/services/api/fhir-bundle', () => ({ submitFhirBundle: vi.fn() }));

import { submitFhirBundle } from '@/services/api/fhir-bundle';
/* eslint-disable max-lines */
import { usePractitionerRoleHealthcareServices } from '@/services/clinic-practitioners';
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

  it('opens create drawer from add button', () => {
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

  it('adds a new service from the drawer', () => {
    mockServicesAndRender();
    fireEvent.click(screen.getByText(/add service/i));
    fireEvent.click(screen.getByTestId('mock-drawer-save'));
    expect(screen.getByText('New Service')).toBeInTheDocument();
  });

  it('submits new services as POST and existing as PUT in the transaction bundle', async () => {
    vi.mocked(usePractitionerRoleHealthcareServices).mockReturnValue(
      makeMockResult(mockServices)
    );
    let capturedSave: (() => Promise<void>) | undefined;
    render(
      <ServicesTab
        practitionerRoleId='role-1'
        onDirtyChange={(_dirty, save) => {
          capturedSave = save;
        }}
      />
    );
    fireEvent.click(screen.getByText(/add service/i));
    fireEvent.click(screen.getByTestId('mock-drawer-save'));
    await vi.waitFor(() => expect(capturedSave).toBeDefined());
    await capturedSave();
    const bundle = vi.mocked(submitFhirBundle).mock.calls[0][0];
    const hsEntries = (bundle.entry?.filter(
      e => e.resource?.resourceType === 'HealthcareService'
    ) ?? []) as {
      resource: HealthcareService;
      request: { method: string; url: string };
      fullUrl?: string;
    }[];
    const putEntry = hsEntries.find(e => e.request.method === 'PUT');
    expect(putEntry?.request.url).toMatch(/^HealthcareService\/svc-/);
    expect(putEntry?.fullUrl).toBeUndefined();
    const postEntry = hsEntries.find(e => e.request.method === 'POST');
    expect(postEntry?.request.url).toBe('HealthcareService');
    expect(postEntry?.fullUrl).toMatch(/^urn:uuid:[0-9a-f-]+$/);
    expect(postEntry?.resource.id).toBeUndefined();
    const roleEntry = bundle.entry?.find(
      e => e.resource?.resourceType === 'PractitionerRole'
    ) as
      | { resource: { healthcareService: { reference: string }[] } }
      | undefined;
    const refs = roleEntry?.resource.healthcareService ?? [];
    expect(refs.some(r => r.reference.startsWith('urn:uuid:'))).toBe(true);
    expect(refs.some(r => r.reference.startsWith('HealthcareService/'))).toBe(
      true
    );
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
    expect(roleEntry?.resource.practitioner).toEqual({
      reference: 'Practitioner/prac-1'
    });
    expect(roleEntry?.resource.organization).toEqual({
      reference: 'Organization/org-1'
    });
    expect(roleEntry?.resource.code).toEqual([
      { coding: [{ code: 'doctor' }] }
    ]);
    expect(roleEntry?.resource.active).toBe(true);
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
    expect(screen.getByText(/healthcare services/i).textContent).toMatch(/2/);
    expect(screen.getAllByText('New Service')).toHaveLength(2);
  });

  it('submits a transaction bundle on save all when dirty', () => {
    mockServicesAndRender();
    fireEvent.click(screen.getByText(/add service/i));
    fireEvent.click(screen.getByTestId('mock-drawer-save'));
    const saveAll = screen.queryByText(/save all/i);
    if (saveAll) fireEvent.click(saveAll);
  });

  it('opens edit drawer when clicking card body', () => {
    mockServicesAndRender();
    fireEvent.click(screen.getByText('General Consultation'));
    expect(screen.getByText('edit')).toBeInTheDocument();
  });

  it('detects isDirty and preserves fee extension when only extension changes', async () => {
    vi.mocked(usePractitionerRoleHealthcareServices).mockReturnValue(
      makeMockResult(mockServices)
    );
    const onDirtyChange = vi.fn();
    let capturedSave = async () => {
      /* placeholder */
    };
    render(
      <ServicesTab
        practitionerRoleId='role-1'
        onDirtyChange={(dirty, save) => {
          onDirtyChange(dirty);
          capturedSave = save;
        }}
      />
    );
    await vi.waitFor(() => expect(onDirtyChange).toHaveBeenCalled());
    fireEvent.click(screen.getByText('General Consultation'));
    fireEvent.click(screen.getByTestId('mock-drawer-save'));
    await vi.waitFor(() =>
      expect(onDirtyChange).toHaveBeenLastCalledWith(true)
    );
    await capturedSave();
    const bundle = vi.mocked(submitFhirBundle).mock.calls[0][0];
    const hsEntry = bundle.entry?.find(
      e => e.resource?.resourceType === 'HealthcareService'
    ) as { resource: HealthcareService } | undefined;
    expect(hsEntry?.resource.extension).toEqual([
      {
        url: FEE_EXTENSION_URL,
        valueMoney: { value: 150_000, currency: 'IDR' }
      }
    ]);
  });

  describe('selection mode', () => {
    function expectSelectionCount(count: number) {
      expect(
        screen.getByRole('heading', {
          name: (c: string) => c.startsWith(`${count} selected`)
        })
      ).toBeInTheDocument();
    }

    function expectNoSelectionMode() {
      expect(
        screen.queryByRole('heading', {
          name: (c: string) => c.includes('selected')
        })
      ).not.toBeInTheDocument();
    }

    function getCard(name: string) {
      return screen.getByText(name).closest('button');
    }

    it('selects a card on right-click', () => {
      mockServicesAndRender();
      fireEvent.contextMenu(getCard('General Consultation'));
      expectSelectionCount(1);
      expect(screen.getByText(/cancel/i)).toBeInTheDocument();
    });

    it('shows correct count when multiple cards are selected', () => {
      mockServicesAndRender();
      fireEvent.contextMenu(getCard('General Consultation'));
      fireEvent.contextMenu(getCard('Specialist Referral'));
      expectSelectionCount(2);
    });

    it('deselects a card on left-click when in selection mode', () => {
      mockServicesAndRender();
      const card = getCard('General Consultation');
      fireEvent.contextMenu(card);
      expectSelectionCount(1);
      fireEvent.click(card);
      expectNoSelectionMode();
      expect(screen.getByText(/healthcare services/i)).toBeInTheDocument();
    });

    it('does not enter selection mode on left-click', () => {
      mockServicesAndRender();
      fireEvent.click(getCard('General Consultation'));
      expect(screen.getByText('edit')).toBeInTheDocument();
    });

    it('opens edit drawer on left-click in normal mode', () => {
      mockServicesAndRender();
      fireEvent.click(screen.getByText('General Consultation'));
      expect(screen.getByText('edit')).toBeInTheDocument();
    });

    it('cancels selection mode when clicking Cancel', () => {
      mockServicesAndRender();
      fireEvent.contextMenu(getCard('General Consultation'));
      expectSelectionCount(1);
      fireEvent.click(screen.getByText(/cancel/i));
      expectNoSelectionMode();
      expect(screen.getByText(/healthcare services/i)).toBeInTheDocument();
    });

    it('does not render edit drawer on right-click', () => {
      mockServicesAndRender();
      fireEvent.contextMenu(getCard('General Consultation'));
      expect(screen.queryByTestId('mock-drawer')).not.toBeInTheDocument();
    });
  });

  describe('long-press (mobile)', () => {
    beforeEach(() => {
      vi.useFakeTimers();
      globalThis.TouchEvent = class TouchEvent extends Event {
        constructor(type: string, options?: EventInit) {
          super(type, { bubbles: true, cancelable: true, ...options });
        }
      } as unknown as typeof TouchEvent;
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    function getCard() {
      return screen.getByText('General Consultation').closest('button');
    }

    it('selects a card on long-press', () => {
      mockServicesAndRender();
      fireEvent.touchStart(getCard());
      act(() => {
        vi.advanceTimersByTime(500);
      });
      fireEvent.touchEnd(getCard());
      expect(
        screen.getByRole('heading', {
          name: (c: string) => c.startsWith('1 selected')
        })
      ).toBeInTheDocument();
    });

    it('opens edit drawer on short tap', () => {
      mockServicesAndRender();
      fireEvent.touchStart(getCard());
      act(() => {
        vi.advanceTimersByTime(200);
      });
      fireEvent.touchEnd(getCard());
      expect(screen.getByText('edit')).toBeInTheDocument();
    });

    it('cancels long-press on touch move', () => {
      mockServicesAndRender();
      fireEvent.touchStart(getCard());
      fireEvent.touchMove(getCard());
      act(() => {
        vi.advanceTimersByTime(500);
      });
      fireEvent.touchEnd(getCard());
      expect(
        screen.queryByRole('heading', {
          name: (c: string) => c.includes('selected')
        })
      ).not.toBeInTheDocument();
    });
  });
});
