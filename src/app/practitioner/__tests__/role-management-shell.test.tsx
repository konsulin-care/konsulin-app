/* eslint-disable @typescript-eslint/no-unsafe-argument */

import { render, screen } from '@testing-library/react';
import type { PractitionerRole } from 'fhir/r4';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import PractitionerRoleManagementShell from '../role-management-shell';

let availEditorProps: Record<string, unknown> | null = null;

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
  default: () => <div data-testid='mock-services-tab'>Services Tab</div>
}));

vi.mock('@/services/clinic-practitioners', () => ({
  useDetailPractitioner: vi.fn()
}));

vi.mock('@/context/auth/authContext', () => ({
  useAuth: vi.fn()
}));

import { useAuth } from '@/context/auth/authContext';
import { useDetailPractitioner } from '@/services/clinic-practitioners';

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
    vi.mocked(useAuth).mockReturnValue({
      state: { userInfo: { role_name: 'Clinic Admin' } }
    } as any);
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

  it('renders nothing for non-ClinicAdmin roles', () => {
    vi.mocked(useAuth).mockReturnValue({
      state: { userInfo: { role_name: 'Patient' } }
    } as any);

    const { container } = render(
      <PractitionerRoleManagementShell practitionerRoleId='role-1' />
    );

    expect(container.innerHTML).toBe('');
  });
});
