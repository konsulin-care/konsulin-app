/* eslint-disable unicorn/dom-node-dataset, @typescript-eslint/no-unsafe-assignment */

import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import PractitionerRoleManagementShell from '../role-management-shell';

// Mock the tabs component used inside
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

vi.mock('@/app/practitioner/availability-tab', () => ({
  default: () => <div data-testid='mock-availability-tab'>Availability Tab</div>
}));

vi.mock('@/app/practitioner/services-tab', () => ({
  default: () => <div data-testid='mock-services-tab'>Services Tab</div>
}));

vi.mock('@/services/clinic', () => ({
  useDetailPractitioner: () => ({
    newData: null as any,
    isLoading: false,
    isError: false,
    isFetching: false
  }),
  usePractitionerRoleHealthcareServices: () => ({
    data: [] as any,
    isLoading: false,
    isError: false,
    isFetching: false
  })
}));

describe('PractitionerRoleManagementShell', () => {
  it('renders both tabs with correct labels', () => {
    render(<PractitionerRoleManagementShell practitionerRoleId='role-1' />);

    const tabs = screen.getByTestId('tabs');
    expect(tabs).toBeDefined();

    const triggers = screen.getAllByTestId('tab-trigger');
    expect(triggers).toHaveLength(2);
    expect(triggers[0]).toHaveTextContent('Availability');
    expect(triggers[1]).toHaveTextContent('Services');
  });

  it('defaults to the first tab (Availability)', () => {
    render(<PractitionerRoleManagementShell practitionerRoleId='role-1' />);

    const tabs = screen.getByTestId('tabs');
    expect(tabs.getAttribute('data-default')).toBe('availability');
  });

  it('renders content for both tabs', () => {
    render(<PractitionerRoleManagementShell practitionerRoleId='role-1' />);

    const contents = screen.getAllByTestId('tab-content');
    expect(contents).toHaveLength(2);
    expect(contents[0].getAttribute('data-value')).toBe('availability');
    expect(contents[1].getAttribute('data-value')).toBe('services');
  });
});
