/* eslint-disable unicorn/dom-node-dataset, @typescript-eslint/no-unsafe-argument */

import { render, screen, waitFor } from '@testing-library/react';
import type { PractitionerRole } from 'fhir/r4';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import PractitionerRoleManagementShell from '../role-management-shell';

let availEditorProps: Record<string, unknown> | null = null;
let servicesTabProps: Record<string, unknown> | null = null;
let fabProps: Record<string, unknown> | null = null;

vi.mock('@/components/ui/tabs', () => ({
  Tabs: ({
    children,
    defaultValue,
    onValueChange
  }: {
    children: React.ReactNode;
    defaultValue: string;
    onValueChange?: (value: string) => void;
  }) => (
    <div
      data-testid='tabs'
      data-default={defaultValue}
      data-onchange={onValueChange ? 'yes' : 'no'}
    >
      {children}
    </div>
  ),
  TabsList: ({ children }: { children: React.ReactNode }) => (
    <div data-testid='tabs-list'>{children}</div>
  ),
  TabsTrigger: ({
    children,
    value
  }: {
    children: React.ReactNode;
    value: string;
  }) => (
    <button data-testid='tab-trigger' data-value={value}>
      {children}
    </button>
  ),
  TabsContent: ({
    children,
    value
  }: {
    children: React.ReactNode;
    value: string;
  }) => (
    <div data-testid='tab-content' data-value={value}>
      {children}
    </div>
  )
}));

vi.mock('@/app/practitioner/practitioner-availability-editor', () => ({
  default: (props: Record<string, unknown>) => {
    availEditorProps = props;
    return (
      <div data-testid='practitioner-availability-editor'>
        PractitionerAvailabilityEditor
      </div>
    );
  }
}));

vi.mock('@/app/practitioner/services-tab', () => ({
  default: (props: Record<string, unknown>) => {
    servicesTabProps = props;
    return <div data-testid='mock-services-tab'>Services Tab</div>;
  }
}));

vi.mock('@/app/practitioner/dynamic-floating-action-button', () => ({
  default: (props: Record<string, unknown>) => {
    fabProps = props;
    return <div data-testid='dynamic-fab'>DynamicFAB</div>;
  }
}));

vi.mock('@/services/clinic', () => ({
  useDetailPractitioner: vi.fn()
}));

import { useDetailPractitioner } from '@/services/clinic';

const mockRole: Partial<PractitionerRole> = {
  resourceType: 'PractitionerRole',
  id: 'role-1',
  active: true,
  availableTime: [],
  organization: { reference: 'Organization/org-1' }
};

describe('PractitionerRoleManagementShell', () => {
  beforeEach(() => {
    availEditorProps = null;
    servicesTabProps = null;
    fabProps = null;
  });

  it('renders both tabs with correct labels', () => {
    vi.mocked(useDetailPractitioner).mockReturnValue({
      newData: undefined,
      isLoading: false,
      isError: false,
      isFetching: false
    } as any);

    render(<PractitionerRoleManagementShell practitionerRoleId='role-1' />);

    const triggers = screen.getAllByTestId('tab-trigger');
    expect(triggers).toHaveLength(2);
    expect(triggers[0]).toHaveTextContent('Availability');
    expect(triggers[1]).toHaveTextContent('Services');
  });

  it('defaults to the first tab (Availability)', () => {
    vi.mocked(useDetailPractitioner).mockReturnValue({
      newData: undefined,
      isLoading: false,
      isError: false,
      isFetching: false
    } as any);

    render(<PractitionerRoleManagementShell practitionerRoleId='role-1' />);

    const tabs = screen.getByTestId('tabs');
    expect(tabs.getAttribute('data-default')).toBe('availability');
  });

  it('passes hideSaveButton to PractitionerAvailabilityEditor', () => {
    vi.mocked(useDetailPractitioner).mockReturnValue({
      newData: { resource: mockRole, organization: { name: 'Test' } },
      isLoading: false,
      isError: false,
      isFetching: false
    } as any);

    render(<PractitionerRoleManagementShell practitionerRoleId='role-1' />);

    expect(availEditorProps?.hideSaveButton).toBe(true);
  });

  it('passes onDirtyChange callback to PractitionerAvailabilityEditor', () => {
    vi.mocked(useDetailPractitioner).mockReturnValue({
      newData: { resource: mockRole, organization: { name: 'Test' } },
      isLoading: false,
      isError: false,
      isFetching: false
    } as any);

    render(<PractitionerRoleManagementShell practitionerRoleId='role-1' />);

    expect(typeof availEditorProps?.onDirtyChange).toBe('function');
  });

  it('passes onDirtyChange callback to ServicesTab', () => {
    vi.mocked(useDetailPractitioner).mockReturnValue({
      newData: undefined,
      isLoading: false,
      isError: false,
      isFetching: false
    } as any);

    render(<PractitionerRoleManagementShell practitionerRoleId='role-1' />);

    expect(typeof servicesTabProps?.onDirtyChange).toBe('function');
  });

  it('renders the DynamicFloatingActionButton', () => {
    vi.mocked(useDetailPractitioner).mockReturnValue({
      newData: {
        resource: mockRole,
        organization: { name: 'Test' }
      },
      isLoading: false,
      isError: false,
      isFetching: false
    } as any);

    render(<PractitionerRoleManagementShell practitionerRoleId='role-1' />);

    expect(screen.getByTestId('dynamic-fab')).toBeInTheDocument();
  });

  it('passes isDirty=true to FAB when Availability editor becomes dirty', async () => {
    vi.mocked(useDetailPractitioner).mockReturnValue({
      newData: { resource: mockRole, organization: { name: 'Test' } },
      isLoading: false,
      isError: false,
      isFetching: false
    } as any);

    render(<PractitionerRoleManagementShell practitionerRoleId='role-1' />);

    // Initial: FAB receives isDirty=false
    expect(fabProps?.isDirty).toBe(false);

    // Simulate editor becoming dirty via onDirtyChange
    if (availEditorProps?.onDirtyChange) {
      (availEditorProps.onDirtyChange as (...args: unknown[]) => void)(
        true,
        vi.fn(),
        false
      );
    }

    await waitFor(() => {
      expect(fabProps?.isDirty).toBe(true);
    });
    expect(fabProps?.label).toBe('Save Changes');
  });
});
