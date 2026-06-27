/* eslint-disable unicorn/dom-node-dataset, @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-argument, @typescript-eslint/no-unsafe-member-access */

import { render, screen } from '@testing-library/react';
import type { PractitionerRole } from 'fhir/r4';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import PractitionerRoleManagementShell from '../role-management-shell';

// Capture props passed to mock components
let capturedEditorProps: Record<string, unknown> | null = null;

vi.mock('@/components/ui/tabs', () => ({
  Tabs: ({
    children,
    defaultValue
  }: {
    children: React.ReactNode;
    defaultValue: string;
  }) => (
    <div data-testid='tabs' data-default={defaultValue}>
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
    capturedEditorProps = props;
    return (
      <div data-testid='practitioner-availability-editor'>
        PractitionerAvailabilityEditor
      </div>
    );
  }
}));

vi.mock('@/app/practitioner/services-tab', () => ({
  default: () => <div data-testid='mock-services-tab'>Services Tab</div>
}));

vi.mock('@/services/clinic', () => ({
  useDetailPractitioner: vi.fn()
}));

import { useDetailPractitioner } from '@/services/clinic';

const mockRole: Partial<PractitionerRole> = {
  resourceType: 'PractitionerRole',
  id: 'role-1',
  active: true,
  availableTime: [
    {
      daysOfWeek: ['mon', 'wed', 'fri'],
      availableStartTime: '09:00:00',
      availableEndTime: '17:00:00'
    }
  ],
  organization: { reference: 'Organization/org-1' }
};

describe('PractitionerRoleManagementShell', () => {
  beforeEach(() => {
    capturedEditorProps = null;
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

  it('renders PractitionerAvailabilityEditor in availability tab when role is loaded', () => {
    vi.mocked(useDetailPractitioner).mockReturnValue({
      newData: {
        resource: mockRole,
        organization: { name: 'Test Clinic' }
      },
      isLoading: false,
      isError: false,
      isFetching: false
    } as any);

    render(<PractitionerRoleManagementShell practitionerRoleId='role-1' />);

    expect(
      screen.getByTestId('practitioner-availability-editor')
    ).toBeInTheDocument();
  });

  it('passes practitionerRole with organization.display injected', () => {
    vi.mocked(useDetailPractitioner).mockReturnValue({
      newData: {
        resource: mockRole,
        organization: { name: 'Sunshine Clinic' }
      },
      isLoading: false,
      isError: false,
      isFetching: false
    } as any);

    render(<PractitionerRoleManagementShell practitionerRoleId='role-1' />);

    const role = capturedEditorProps?.practitionerRole as any;
    expect(role).toBeDefined();
    expect(role.organization.display).toBe('Sunshine Clinic');
  });

  it('falls back to "Clinic" display when organization is not in detail', () => {
    vi.mocked(useDetailPractitioner).mockReturnValue({
      newData: {
        resource: mockRole
        // no organization field
      },
      isLoading: false,
      isError: false,
      isFetching: false
    } as any);

    render(<PractitionerRoleManagementShell practitionerRoleId='role-1' />);

    const role = capturedEditorProps?.practitionerRole as any;
    expect(role).toBeDefined();
    expect(role.organization.display).toBe('Clinic');
  });

  it('renders services tab content', () => {
    vi.mocked(useDetailPractitioner).mockReturnValue({
      newData: {
        resource: mockRole
      },
      isLoading: false,
      isError: false,
      isFetching: false
    } as any);

    render(<PractitionerRoleManagementShell practitionerRoleId='role-1' />);

    expect(screen.getByTestId('mock-services-tab')).toBeInTheDocument();
  });
});
